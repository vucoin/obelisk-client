var assert = require('assert');
var Put = require('put');
var ObTest = require('./util').ObTest;
var error = require('../lib/error');

var height = 290440;

var makeResponse = function(errcode, height) {
    return function(command, id, data) {
        assert.equal(command, 'blockchain.fetch_last_height');
        var p = Put().word32le(errcode);
        if (!errcode) p.word32le(height);
        return p.buffer();
    };
};
describe('api fetchLastHeight()', function() {

    it('should get last height', ObTest()
        .api('fetchLastHeight')
        .respond(makeResponse(0, height))
        .assert(function(err, _height) {
            assert.ifError(err);
            assert.equal(_height, height);
        }));

    it('should report server error', ObTest()
        .api('fetchLastHeight')
        .respond(makeResponse(error.service_stopped))
        .assert(function(err) {
            assert.equal(err.code, error.service_stopped);
        }));
});


describe('cli fetch-last-height', function() {

    it('should get last height', ObTest()
        .cli('fetch-last-height ' + height)
        .respond(makeResponse(0, height))
        .assert(function(err, stdout, stderr) {
            assert.ifError(err);
            assert.equal(stdout, '' + height + '\n');
            assert.equal(stderr, '');
        }));

    it('should report server error', ObTest()
        .cli('fetch-last-height')
        .respond(makeResponse(error.service_stopped))
        .assertError(error.service_stopped));
});
