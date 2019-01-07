const config = require('config');

// Following two lines of code are required by bitcoind-client
require('es6-promise').polyfill();
require('isomorphic-fetch');

const { createCall } = require('bitcoind-client');
const bitcoinRPC = createCall(config.get("bitcoin-rpc"));

// Setup persistence... 
var Datastore = require('nedb');
db = {};
db.blocks = new Datastore({ filename: 'blocks.db', autoload: true });
db.coinbaseTransactions = new Datastore({ filename: 'coinbaseTransactions.db', autoload: true });

var blocksToDiscover = config.get("blocks-to-discover");
var lowestBlock = {
    height: 0
}; 

// Get the lowest height...
db.blocks.findOne({}).sort({height: 1}).exec(function (error, result) {
    console.log("Found lowest: ", result);
    if(result) {
        lowestBlock = result;
    }

    bitcoinRPC(`getblockcount`)
    .then(tip => {            
        console.log("Tip: ", tip);
        return bitcoinRPC(`getblockhash`, tip);         
    })
    .then(blockhash => {
        console.log("Blockhash: ", blockhash);
        return getBlockFor(blockhash); 
    }).then(() => {
        db.blocks.count({}, function (error, count) {
            if(error) {
                console.error("Counting error: ", error);
            }
            console.log("Data points of interest: ", count);
        })
        
    })
    .catch(e => console.error(e));
})

var getBlockFor = (blockhash) => {
    console.log("About to consume: ", blockhash)
    return new Promise((resolve, reject) => {
        
        db.blocks.findOne({
            hash: blockhash
        }, function (blockError, previouslyPersistedBlock) {
            if(blockError) {
                reject(blockError);
                return;
            }
            // if blockhash is already persisted... 
            // get previousBlockhash for block at lowest height... 
            // else getblock for curr 
            bitcoinRPC('getblock', previouslyPersistedBlock ? lowestBlock.previousblockhash : blockhash) // Isn't there a way to limit block to n transactions...
                .then(block => {
                    // console.log("Block: ", block);
                    db.blocks.insert({
                        hash: block.hash,
                        height: block.height,
                        nonce: block.nonce,
                        previousblockhash: block.previousblockhash,
                        coinbaseTransaction: block.tx[0]
                        // TODO: Structure this to match the actual coinbaseTransaction a little more...
                    }, function (error, persistedBlock) {
                        console.log("Block in DB: ", persistedBlock);

                        // TODO: load persistCoinbaseTransaction(persistedBlock.coinbaseTransaction)
                        blocksToDiscover--;
                        if(block.previousblockhash && blocksToDiscover >= 0) {
                            // A little recursion to make the worl go round...
                            resolve(Promise.resolve(getBlockFor(block.previousblockhash)));
                            // Not quite sure about this resolve...
                        } else {
                            // At this point we can render our datapoints...
                            // console.log("Total Datapoints: ", dataPoints);
                            // TODO: resolve?
                            resolve(true);
                        }
                    } );
                    
                    
                }).catch(e => {
                    reject(e);
                });
        })
        
    })
};