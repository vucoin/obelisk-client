var assert = require('assert');
var Put = require('put');
var ObTest = require('./util').ObTest;

var hash = '000000000000000265383fcb0576982a1bcc9b6c35eccc191af6ad7fbd83174e';
var height = 276363;

var respondSuccess = function(command, id, data) {
    assert.equal(command, 'blockchain.fetch_block_height');
    var errcode = 0;
    return Put()
        .word32le(errcode)
        .word32le(height)
        .buffer();
};

describe('api fetchBlockHeight()', function() {

    it('should fail if hash is not supplied', ObTest()
        .api('fetchBlockHeight')
        .assertError('Invalid block hash.'));

    it('should fail if bad hash is supplied', ObTest()
        .api('fetchBlockHeight', '$#!+')
        .assertError('Invalid block hash.'));

    it('should get block height by block hash', ObTest()
        .api('fetchBlockHeight', hash)
        .respond(respondSuccess)
        .assert(function(err, check_height) {
            assert.ifError(err);
            assert.equal(check_height, height);
        }));
});

describe('cli fetch-block-height', function() {

    it('should break if hash is not supplied', ObTest()
        .cli('fetch-block-height')
        .assertError('Invalid block hash.'));

    it('should break if bad hash is supplied', ObTest()
        .cli('fetch-block-height $#!+')
        .assertError('Invalid block hash.'));

    it('should get block height by hash', ObTest()
        .cli('fetch-block-height ' + hash)
        .respond(respondSuccess)
        .assert(function(err, stdout, stderr) {
            assert.ifError(err);
            assert.equal(stdout, '' + height + '\n');
            assert.equal(stderr, '');
        }));
});
