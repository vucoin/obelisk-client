var assert = require('assert');
var buffertools = require('buffertools');
var Put = require('put');
var ObTest = require('./util').ObTest;
var error = require('../lib/error');

var outhash = '3a1b9e330d32fef1ee42f8e86420d2be978bbe0dc5862f17da9027cf9e11f8c4';
var outix = 1;
var spendhash = '7a2a6f66e87ed4e72d85ba7a82eda1572605c3330c461e171f58d7ff2763ac63';
var spendix = 0;

var makeResponse = function(errcode, spendhash, spendix) {
    return function(command, id, data) {
        assert.equal(command, 'blockchain.fetch_spend');
        var p = Put().word32le(errcode);
        if (!errcode) {
            p.put(buffertools.reverse(new Buffer(spendhash, 'hex')))
                .word32le(spendix);
        }
        return p.buffer();
    };
};

var respondSuccess = makeResponse(0, spendhash, spendix);

describe('api fetchSpend()', function() {

    it('should break if hash is not supplied', ObTest()
        .api('fetchSpend')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .api('fetchSpend', '$#!+')
        .assertError('Invalid transaction hash.'));

    it('should break if index is not supplied', ObTest()
        .api('fetchSpend', outhash)
        .assertError('Invalid transaction index.'));

    it('should break if bad index is supplied', ObTest()
        .api('fetchSpend', outhash, '$#!+')
        .assertError('Invalid transaction index.'));

    it('should fetch spend input given an output', ObTest()
        .api('fetchSpend', outhash, outix)
        .respond(respondSuccess)
        .assert(function(err, _spendhash, _spendix) {
            assert.ifError(err);
            assert.equal(_spendhash.toString('hex'), spendhash);
            assert.equal(_spendix, spendix);
        }));

    it('should report server error', ObTest()
        .api('fetchSpend', outhash, outix)
        .respond(makeResponse(error.service_stopped))
        .assert(function(err) {
            assert.equal(err.code, error.service_stopped);
        }));
});

describe('cli fetch-spend', function() {

    it('should break if hash is not supplied', ObTest()
        .cli('fetch-spend')
        .assertError('Invalid transaction hash.'));

    it('should break if bad hash is supplied', ObTest()
        .cli('fetch-spend $#!+')
        .assertError('Invalid transaction hash.'));

    it('should break if index is not supplied', ObTest()
        .cli('fetch-spend ' + outhash)
        .assertError('Invalid transaction index.'));

    it('should break if bad index is supplied', ObTest()
        .cli('fetch-spend ' + outhash + ' $#!+')
        .assertError('Invalid transaction index.'));

    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(stdout, spendhash + ':' + spendix + '\n');
        assert.equal(stderr, '');
    };

    it('should get spend input given outpoint', ObTest()
        .cli('fetch-spend ' + outhash + ' ' + outix)
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should report server error', ObTest()
        .cli('fetch-spend ' + outhash + ' ' + outix)
        .respond(makeResponse(error.service_stopped))
        .assertError(error.service_stopped));
});
