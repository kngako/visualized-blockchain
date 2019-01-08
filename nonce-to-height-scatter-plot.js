// The visualization uses plotly and you will need an account work with their API...
const fse = require('fs-extra');
const jsdom = require('jsdom')

const pathToPlotly = require.resolve('plotly.js-dist');

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
            name: 'Nonce',
            text: blocks.map(block => block.height),
            marker: {
                size: 4
            },
        }];

    var figure = { 
        'data': data, 
        layout: { 
            xaxis: {
                title: 'Block Height',
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
        format: 'svg', 
        imageDataOnly: true,
    };

    // Trying to do it locally...
    const virtualConsole = new jsdom.VirtualConsole()
    virtualConsole.sendTo(console)

    const w = new jsdom.JSDOM('', { runScripts: 'dangerously', virtualConsole }).window

    // mock a few things that JSDOM doesn't support out-of-the-box
    w.HTMLCanvasElement.prototype.getContext = function() { return null; };
    w.URL.createObjectURL = function() { return null; };

    fse.readFile(pathToPlotly, 'utf-8')
        .then(w.eval)
        .then(() => {
            return w.Plotly.toImage(figure, imgOpts)
        })
        .then(img => {
            return fse.writeFile('output/nonce.svg', img)
        })
        .catch(e => {
            console.error("Error: ", e);
        })

});