var Obelisk = require('../');

try {
    var bitcore = require('bitcore');

    var showBlock = function(block) {
        var b = new bitcore.Block();
        var parser = new bitcore.BinaryParser(block.header);
        b.parse(parser, true);

        b = b.getStandardizedObject();
        b.height = block.height; // bitcore parser doesn't set height from header
        delete b.size; // block size is unknown in this context

        console.log('Block:', b);
    };

    var showTx = function(txdata) {
        var tx = new bitcore.Transaction();
        tx.parse(txdata);
        console.log(tx.getStandardizedObject());
    };

} catch (err) {
    console.log();
    console.log('For enhanced view, install bitcore: npm install bitcore');
    console.log();

    var showBlock = function(block) {
        console.log('BLOCK:', block);
    };

    var showTx = function(txdata) {
        console.log('TX:', txdata.toString('hex'));
    };
}

new Obelisk()
    .subscribeBlocks().on('block', showBlock)
    .subscribeTransactions().on('tx', showTx);
