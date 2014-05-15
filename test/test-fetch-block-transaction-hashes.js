var assert = require('assert');
var buffertools = require('buffertools');
var Put = require('put');
var ObTest = require('./util').ObTest;
var column = require('./util').column;

var height = 100000;
var blkhash = '000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506';
var txhashes = [
    '8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87',
    'fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4',
    '6359f0868171b1d194cbee1af2f16ea598ae8fad666d9b012c8ed2b79a236ec4',
    'e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d'
];

var respondSuccess = function(command, id, data) {
    assert.equal(command, 'blockchain.fetch_block_transaction_hashes');
    var errcode = 0;
    var p = Put().word32le(errcode);
    txhashes.forEach(function(txhash) {
        p.put(buffertools.reverse(new Buffer(txhash, 'hex')));
    });
    return p.buffer();
};

describe('api fetchBlockTransactionHashes()', function() {

    it('should break if hash is not supplied', ObTest()
        .api('fetchBlockTransactionHashes')
        .assertError('Invalid block index.'));

    it('should break if bad hash is supplied', ObTest()
        .api('fetchBlockTransactionHashes', '$#!+')
        .assertError('Invalid block index.'));

    var checkSuccess = function(err, _txhashes) {
        assert.ifError(err);
        assert.deepEqual(
            _txhashes.map(function(txhash) {
                return txhash.toString('hex');
            }), txhashes);
    };

    it('should fetch transaction hashes by block height', ObTest()
        .api('fetchBlockTransactionHashes', height)
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should fetch transaction hashes by block hash', ObTest()
        .api('fetchBlockTransactionHashes', blkhash)
        .respond(respondSuccess)
        .assert(checkSuccess));
});

describe('cli fetch-block-transaction-hashes', function() {

    it('should break if hash is not supplied', ObTest()
        .cli('fetch-block-transaction-hashes')
        .assertError('Invalid block index.'));

    it('should break if bad hash is supplied', ObTest()
        .cli('fetch-block-transaction-hashes $#!+')
        .assertError('Invalid block index.'));

    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(column(stdout, 0), '8f6e');
        assert.equal(stderr, '');
    };

    it('should fetch transaction hashes by block height', ObTest()
        .cli('fetch-block-transaction-hashes ' + height)
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should fetch transaction hashes by block hash', ObTest()
        .cli('fetch-block-transaction-hashes ' + blkhash)
        .respond(respondSuccess)
        .assert(checkSuccess));
});
