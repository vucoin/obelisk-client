var Obelisk = require('../');

new Obelisk()
    .fetchTransaction('e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d', function(err, tx) {
        console.log('Tx:', tx.toString('hex'));
    })
    .fetchSpend('f4515fed3dc4a19b90a317b9840c243bac26114cf637522373a7d486b372600b', 0, function(err, spend_hash, spend_index) {
        if (err) throw err;
        console.log('Spend: %s:%d', spend_hash.toString('hex'), spend_index);
    })
    .fetchTransactionIndex('f4515fed3dc4a19b90a317b9840c243bac26114cf637522373a7d486b372600b', function(err, height, index) {
        if (err) throw err;
        console.log('Tx index: %d, %d', height, index);
    })
    .fetchBlockTransactionHashes(100000, function(err, txhashes) {
        if (err) throw err;
        console.log('Tx hashes: %j',
            txhashes.map(function(txhash) {
                return txhash.toString('hex');
            }));
    })
    .fetchBlockHeight('000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506', function(err, height) {
        if (err) throw err;
        console.log('Block Height:', height);
    })
    .fetchLastHeight(function(err, height) {
        if (err) throw err;
        console.log('Height:', height);
    })
    .fetchStealth(2, 1763505291, function(err, results) {
        if (err) throw err;
        results.forEach(function(r) {
            console.log('Stealth:  ephemkey: %s address: %s, tx_hash: %s',
                r.ephemkey.toString('hex'),
                r.address.toString('hex'),
                r.tx_hash.toString('hex'));
        });
    });
