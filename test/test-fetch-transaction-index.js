var assert = require('assert');
var Put = require('put');
var ObTest = require('./util').ObTest;

var txhash = '405c8db675683e41e9b147fc60646a4e13f9a257cd52908689b8e0a34da67fef';
var height = 289527;
var txindex = 373;

var respondSuccess = function(command, id, data) {
    assert.equal(command, 'blockchain.fetch_transaction_index');
    var errcode = 0;
    return Put()
        .word32le(errcode)
        .word32le(height)
        .word32le(txindex)
        .buffer();
};

describe('api fetchTransactionIndex()', function() {

    it('should break if hash is not supplied', ObTest()
        .api('fetchTransactionIndex')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .api('fetchTransactionIndex', '$#!+')
        .assertError('Invalid transaction hash.'));

    it('should fetch transaction index', ObTest()
        .api('fetchTransactionIndex', txhash)
        .respond(respondSuccess)
        .assert(function(err, check_height, check_index) {
            assert.ifError(err);
            assert.equal(check_height, height);
            assert.equal(check_index, txindex);
        }));
});

describe('cli fetch-transaction-index', function() {

    it('should break if hash is not supplied', ObTest()
        .cli('fetch-transaction-index')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .cli('fetch-transaction-index $#!+')
        .assertError('Invalid transaction hash.'));

    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(stdout, height + ' ' + txindex + '\n');
        assert.equal(stderr, '');
    };

    it('should get transaction data by hash', ObTest()
        .cli('fetch-transaction-index ' + txhash)
        .respond(respondSuccess)
        .assert(checkSuccess));
});
