var Obelisk = require('../');

try {
    var bitcore = require('bitcore');

    var showBlock = function(block) {
        var b = new bitcore.Block();
        b.parse(block.header, true);
        console.log('Block: ', b.height, b.getStandardizedObject());
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
