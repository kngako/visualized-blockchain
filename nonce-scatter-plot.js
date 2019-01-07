// The visualization uses plotly and you will need an account work with their API...
var config = require('config');
var plotly = require('plotly')(config.get("plotly.username"), config.get("plotly.api-key"));
var fs = require('fs');

var Datastore = require('nedb');
db = {};
db.blocks = new Datastore({ filename: 'blocks.db', autoload: true });

db.blocks.find({}).sort({height: -1}).exec(function (error, blocks) {
    console.log("Blocks to visualize: ", blocks.length);

    var maxBlockHeight = blocks.reduce((accumulator, block) => {
        return accumulator < block.height ? block.height : accumulator; 
    }, 0); // TODO: Might wanna use Number.MIN_SAFE_VALUE...
    var minBlockHeight = blocks.reduce((accumulator, block) => {
        return accumulator > block.height ? block.height : accumulator; 
    }, maxBlockHeight);
    blockHeightRange = maxBlockHeight - minBlockHeight;

    var maxBlockNonce = blocks.reduce((accumulator, block) => {
        return accumulator < block.nonce ? block.nonce : accumulator; 
    }, 0); // TODO: Might wanna use Number.MIN_SAFE_VALUE...
    var minBlockNonce = blocks.reduce((accumulator, block) => {
        return accumulator > block.nonce ? block.nonce : accumulator; 
    }, maxBlockNonce); // TODO: Might wanna use Number.MAX_SAFE_VALUE...
    
    blockNonceRange = maxBlockNonce - minBlockNonce;

    var data = [{
        x: blocks.map(block => block.height),
        y: blocks.map(block => block.nonce),
        mode: 'markers',
        type: 'scatter',
        name: 'Nonce to Block height distribution',
        text: blocks.map(block => block.height),
        marker: {
            size: 10
        },
    }];

    var figure = { 
        'data': data, 
        layout: { 
            xaxis: {
                title: 'Height',
                range: [ minBlockHeight, maxBlockHeight ] 
            },
            yaxis: {
                title: "Nonce",
                range: [minBlockNonce, maxBlockNonce]
            },
            title:'Nonce Visualization'
        }
    };

    var imgOpts = {
        format: 'png',
        width: 1000,
        height: 500,
        // Do some work to keep aspect ratio...
    };

    plotly.getImage(figure, imgOpts, function (error, imageStream) {
        if (error) return console.error(error);
    
        var fileStream = fs.createWriteStream('nonce.png');
        imageStream.pipe(fileStream);
    });
    // plotly.plot(data, layout, function (err, msg) {
    //     console.log(msg);
    // });

});