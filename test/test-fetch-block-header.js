var assert = require('assert');
var Put = require('put');
var ObTest = require('./util').ObTest;

var height = 276363;
var hash = '000000000000000265383fcb0576982a1bcc9b6c35eccc191af6ad7fbd83174e';
var header = '0200000055db09021009575fb09206b953c13cc8eeb52bf7a404b70d0200000000000000609a318f5d287102f81c1cf93be964f5b00a6e3a3387891e2f0480e094cbb9c3c0cab6520ca303190c788999';

var respondSuccess = function(command, id, data) {
    assert.equal(command, 'blockchain.fetch_block_header');
    var errcode = 0;
    return Put()
        .word32le(errcode)
        .put(new Buffer(header, 'hex'))
        .buffer();
};

describe('api fetchBlockHeader()', function() {

    it('should break if hash or height is not supplied', ObTest()
        .api('fetchBlockHeader')
        .assertError('Invalid block index.'));

    it('should break if bad hash or height is supplied', ObTest()
        .api('fetchBlockHeader', '$#!+')
        .assertError('Invalid block index.'));

    var checkSuccess = function(err, _header) {
        assert.ifError(err);
        assert.equal(_header.toString('hex'), header);
    };

    it('should get block header by height', ObTest()
        .api('fetchBlockHeader', height)
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should get block header by hash', ObTest()
        .api('fetchBlockHeader', hash)
        .respond(respondSuccess)
        .assert(checkSuccess));
});

describe('cli fetch-block-header', function() {

    it('should break if hash or height is not supplied', ObTest()
        .cli('fetch-block-header')
        .assertError('Invalid block index.'));

    it('should break if bad hash or height is supplied', ObTest()
        .cli('fetch-block-header $#!+')
        .assertError('Invalid block index.'));

    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(stdout, header + '\n');
        assert.equal(stderr, '');
    };

    it('should get block header by height', ObTest()
        .cli('fetch-block-header ' + height)
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should get block header by hash', ObTest()
        .cli('fetch-block-header ' + hash)
        .respond(respondSuccess)
        .assert(checkSuccess));
});
