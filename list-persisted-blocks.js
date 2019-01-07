var Datastore = require('nedb');
db = {};
db.blocks = new Datastore({ filename: 'blocks.db', autoload: true });

db.blocks.find({}).sort({height: -1}).exec(function (error, blocks) {
    console.log("Blocks: ", blocks.length);

    blocks.forEach(block => {
        console.log(block.height + "-" + block.hash);
    })

});