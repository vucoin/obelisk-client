var assert = require('assert');
var util = require('../lib/util');

describe('base58 encoding', function() {

    it('should transcode without side effects', function(done) {
        var addr = '1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp';
        var addrbuf = util.decodeBase58Check(addr);
        assert.equal(addr, '1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp');
        assert.equal(addrbuf.toString('hex'), '00549619cbda3ee1a449ca6350560a9d22dff4de88');

        var addr2 = util.encodeBase58Check(addrbuf);
        assert.equal(addr2, '1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp');
        assert.equal(addrbuf.toString('hex'), '00549619cbda3ee1a449ca6350560a9d22dff4de88');

        done();
    });
});
