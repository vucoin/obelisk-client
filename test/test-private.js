var assert = require('assert');
var buffertools = require('buffertools');
var lib = require('../lib');

describe('packInt', function() {
    var fn = lib._packInt;

    it('should parse integers', function(done) {
        assert.equal(fn(0).toString('hex'), '00000000');
        assert.equal(fn('0').toString('hex'), '00000000');
        assert.equal(fn(10).toString('hex'), '0a000000');
        assert.equal(fn('10').toString('hex'), '0a000000');
        assert.equal(fn(), undefined);
        assert.equal(fn(''), undefined);
        assert.equal(fn(-1), undefined);
        assert.equal(fn('-1'), undefined);
        assert.equal(fn('1xyz'), undefined);
        assert.equal(fn([]), undefined);

        done();
    });
});

describe('packHash', function() {
    var fn = lib._packHash;
    var hash = '405c8db675683e41e9b147fc60646a4e13f9a257cd52908689b8e0a34da67fef';
    var good = buffertools.reverse(new Buffer(hash, 'hex'));

    it('should parse 32-byte sha256 hash', function(done) {
        assert.deepEqual(fn(hash), good);
        assert.deepEqual(fn(new Buffer(hash, 'hex')), good);
        assert.equal(fn(''), undefined);
        assert.equal(fn('1234'), undefined);
        assert.equal(fn(new Buffer('1234', 'hex')), undefined);
        assert.equal(fn([]), undefined);
        assert.equal(fn(1), undefined);

        done();
    });
});

describe('packBlockIndex', function() {
    var fn = lib._packBlockIndex;
    var hash = '405c8db675683e41e9b147fc60646a4e13f9a257cd52908689b8e0a34da67fef';
    var good = buffertools.reverse(new Buffer(hash, 'hex'));

    it('should parse 32-byte sha256 hash or positive integer', function(done) {
        assert.deepEqual(fn(hash), good);
        assert.deepEqual(fn(new Buffer(hash, 'hex')), good);
        assert.equal(fn(''), undefined);
        assert.equal(fn('1234').toString('hex'), 'd2040000');
        assert.equal(fn(new Buffer('1234', 'hex')), undefined);
        assert.equal(fn([]), undefined);
        assert.equal(fn(1).toString('hex'), '01000000');

        done();
    });
});

describe('packBitfield', function() {
    var fn = lib._packBitfield;

    it('should parse 4-byte bitfield value', function(done) {
        assert.equal(fn(''), undefined);
        assert.equal(fn('1234').toString('hex'), 'd2040000');
        assert.equal(fn(new Buffer('1234', 'hex')), undefined);
        assert.equal(fn([]), undefined);
        assert.equal(fn(1).toString('hex'), '01000000');
        assert.deepEqual(fn(1763505291).toString('hex'), '8bf41c69');
        assert.deepEqual(fn('691cf48b').toString('hex'), '8bf41c69');
        assert.deepEqual(fn(new Buffer('691cf48b', 'hex')).toString('hex'), '8bf41c69');

        done();
    });
});
