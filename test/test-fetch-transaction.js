var assert = require('assert');
var Put = require('put');
var ObTest = require('./util').ObTest;
var error = require('../lib/error');

var txhash = '405c8db675683e41e9b147fc60646a4e13f9a257cd52908689b8e0a34da67fef';
var txdata = '0100000001cfc1d87ef5c3c8264237df8607f0bf7a3f06283324e9e939c0787b40504d526b010000008a47304402201f577b0e3177422dc88f2ec8645b2802664efbabcc966d9fa61d1bbc209ba6860220609ea9f276920d38a7dbbc5a9ed9f908daf58b39fc5f9d788dcfc443dc2b984f01410413cb429b2c267c4c56932c5d75f0aab1208f5a89347368d0fa8fa6529ee485561c15e201585595bf8f7a5a903fd052c613b3bee51ed51fdc43ab6ca00957337affffffff02e7b22100000000001976a9148c7e252f8d64b0b6e313985915110fcfefcf4a2d88ac15971700000000001976a91447948310bd23450105394ff994863990135d73f688ac00000000';

var makeResponse = function(cmd, errcode, txdata) {
    return function(command, id, data) {
        assert.equal(command, cmd);
        var p = Put().word32le(errcode);
        if (!errcode) p.put(new Buffer(txdata, 'hex'));
        return p.buffer();
    };
};

describe('api fetchTransaction()', function() {

    it('should break if hash is not supplied', ObTest()
        .api('fetchTransaction')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .api('fetchTransaction', '$#!+')
        .assertError('Invalid transaction hash.'));

    it('should fetch transaction from blockchain', ObTest()
        .api('fetchTransaction', txhash)
        .respond(makeResponse('blockchain.fetch_transaction', 0, txdata))
        .assert(function(err, _txdata) {
            assert.ifError(err);
            assert.equal(_txdata.toString('hex'), txdata);
        }));

    it('should fetch transaction from pool', ObTest()
        .api('fetchTransaction', txhash, true)
        .respond(makeResponse('transaction_pool.fetch_transaction', 0, txdata))
        .assert(function(err, _txdata) {
            assert.ifError(err);
            assert.equal(_txdata.toString('hex'), txdata);
        }));

    it('should return not_found error', ObTest()
        .api('fetchTransaction', txhash)
        .respond(makeResponse('blockchain.fetch_transaction', error.not_found))
        .assert(function(err) {
            assert.equal(err.code, error.not_found);
        }));
});

describe('cli fetch-transaction', function() {

    it('should break if hash is not supplied', ObTest()
        .cli('fetch-transaction')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .cli('fetch-transaction $#!+')
        .assertError('Invalid transaction hash.'));

    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(stdout, txdata + '\n');
        assert.equal(stderr, '');
    };

    it('should get transaction data by hash from blockchain', ObTest()
        .cli('fetch-transaction ' + txhash)
        .respond(makeResponse('blockchain.fetch_transaction', 0, txdata))
        .assert(checkSuccess));

    it('should get transaction data by hash from pool', ObTest()
        .cli('fetch-transaction ' + txhash)
        .respond(
            makeResponse('blockchain.fetch_transaction', error.not_found),
            makeResponse('transaction_pool.fetch_transaction', 0, txdata))
        .assert(checkSuccess));

    it('should return not_found error', ObTest()
        .cli('fetch-transaction ' + txhash)
        .respond(
            makeResponse('blockchain.fetch_transaction', error.not_found),
            makeResponse('transaction_pool.fetch_transaction', error.not_found))
        .assertError(error.not_found));

    it('should not search tx pool in case of another error', ObTest()
        .cli('fetch-transaction ' + txhash)
        .respond(makeResponse('blockchain.fetch_transaction', error.service_stopped))
        .assertError(error.service_stopped));
});
