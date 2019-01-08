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
// db.coinbaseTransactions = new Datastore({ filename: 'coinbaseTransactions.db', autoload: true });

db.blocks.ensureIndex({ fieldName: 'hash', unique: true, sparse: true }, function (error) {
    console.error("Indexing Error: ", error)
});

var blocksToPersist = config.get("blocks-to-persist"); // How many blocks do you want to find in this run...
var lowestBlock = {
    // I can have the genesis blockhash here...
    height: Number.MAX_SAFE_INTEGER
}; 
var highestBlock = {
    height: 0
}; 

// Get the lowest and highest blocks...
db.blocks.findOne({}).sort({height: -1}).exec(function (error, highestResult) {
    console.log("Found Highest: ", highestResult);
    if(highestResult) {
        highestBlock = highestResult;
    }
    db.blocks.findOne({}).sort({height: 1}).exec(function (error, lowestResult) {
        console.log("Found lowest: ", lowestResult);
        if(lowestResult) {
            lowestBlock = lowestResult;
        }

        bitcoinRPC(`getblockcount`)
        .then(tip => {            
            console.log("Tip: ", tip);
            if(tip > highestBlock.height) {
                highestBlock.height = 0;
            }
            return bitcoinRPC(`getblockhash`, tip);         
        })
        .then(blockhash => {
            return getBlockFor(highestBlock.height == 0 ? blockhash : highestBlock.hash); 
        })
        .then(() => {
            db.blocks.count({}, function (error, count) {
                if(error) {
                    console.error("Counting error: ", error);
                }
                console.log("Data points of interest: ", count);
            })
            
        })
        .catch(e => console.error(e));
    })
});

var getBlockFor = (blockhash) => {
    return new Promise((resolve, reject) => {
        console.log("About to process: ", blockhash);
        // if blockhash is already persisted... 
        // get previousBlockhash for block at lowest height... 
        // else getblock for curr
        // TODO: Allow highestPersistedBlock.nextblockhash if it's avaible...
        bitcoinRPC('getblock', blockhash) // Isn't there a way to limit block to n transactions...
            .then(block => {
                if(highestBlock.hash == block.hash) {
                    highestBlock = block; // Incase something changed from the last time we persisted this block...
                    resolve(Promise.resolve(getBlockFor(highestBlock.nextblockhash ? highestBlock.nextblockhash : lowestBlock.previousblockhash)));
                } else {
                    db.blocks.insert({
                        hash: block.hash,
                        // confirmations: block.confirmations,
                        size: block.size,
                        strippedsize: block.strippedsize,
                        weight: block.weight,
                        height: block.height,
                        version: block.version,
                        versionHex: block.versionHex,
                        merkleroot: block.merkleroot,
                        time: block.time,
                        mediantime: block.mediantime,
                        nonce: block.nonce,
                        bits: block.bits,
                        difficulty: block.difficulty,
                        chainwork: block.chainwork,
                        previousblockhash: block.previousblockhash,
                        nextblockhash: block.nextblockhash,
                        transactionCount: block.tx.length,
                        coinbaseTx: {
                            txid: block.tx[0]
                        }
                    }, function (error, persistedBlock) {
                        console.log("Block in DB: ", persistedBlock);
                        blocksToPersist--;

                        // TODO: Might want to load and persist coinbase transaction...
                        // loadAndPersistCoinbaseTransaction(persistedBlock.coinbaseTx.txid, persistedBlock.hash)
                        //     .then(result => {
                        //         // console.log("Coinbase updated: ", result);
                        //     })
                        //     .catch(error => {
                        //         console.error("Coinbase Erro: ", error);
                        //     })
                        
                        if(persistedBlock.height > highestBlock.height) {
                            highestBlock = persistedBlock;
                        } 
                        if(persistedBlock.height < lowestBlock.height) {
                            lowestBlock = persistedBlock;
                        }
                        if(blocksToPersist >= 0 && (block.previousblockhash || block.nextblockhash)) {
                            // A little recursion to make the world go round...
                            resolve(Promise.resolve(getBlockFor(highestBlock.nextblockhash ? highestBlock.nextblockhash : lowestBlock.previousblockhash)));
                        } else {
                            // At this point we are done syncing...
                            resolve(true);
                        }
                    } );
                }
            }).catch(e => {
                reject(e);
            });

        db.blocks.findOne({
            hash: blockhash
        }, function (blockError, previouslyPersistedBlock) {
            if(blockError) {
                reject(blockError);
                return;
            }
            
        })
        
    })
};

var loadAndPersistCoinbaseTransaction = (txid, blockhash) => {
    return new Promise((resolve, reject) => {
        bitcoinRPC('getrawtransaction', txid, true, blockhash) // Isn't there a way to limit block to n transactions...
                .then(coinbaseTransaction => {
                    db.blocks.update({
                        coinbaseTx: {
                            txid: txid
                        }
                    }, {
                        $set: {
                            coinbaseTx: {
                                in_active_chain: coinbaseTransaction.in_active_chain,
                                hex: coinbaseTransaction.hex,
                                txid: coinbaseTransaction.txid,
                                hash: coinbaseTransaction.hash,
                                size: coinbaseTransaction.size,
                                vsize: coinbaseTransaction.vsize,
                                version: coinbaseTransaction.version,
                                locktime: coinbaseTransaction.locktime,
                                vin: coinbaseTransaction.vin,
                                vout: coinbaseTransaction.vout,
                                blockhash: coinbaseTransaction.blockhash,
                                confirmations: coinbaseTransaction.confirmations,
                                time: coinbaseTransaction.time,
                                blocktime: coinbaseTransaction.blocktime
                            }
                        }
                    }, {}, function (error, numReplaced) {
                        if(error) {
                            reject(error);
                            return;
                        }
                        resolve(numReplaced);
                    })
                }).catch(e => {
                    reject(e);
                });
    });
}