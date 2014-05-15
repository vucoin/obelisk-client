var assert = require('assert');
var buffertools = require('buffertools');
var Put = require('put');
var util = require('../lib/util');
var ObTest = require('./util').ObTest;
var column = require('./util').column;

var numbits = 2;
var bitfield = 1763505291;
var bitfield = '8bf41c69';


var addresses = [{
    'ephemkey': '0276044981dc13bdc5e118b63c8715f0d1b00e6c0814d778668fa6b594b2a0ffbd',
    'address': '1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp',
    'tx_hash': '63e75e43de21b73d7eb0220ce44dcfa5fc7717a8decebb254b31ef13047fa518'
}, {
    'ephemkey': '021f1c08214ee2939b63dc5913ef45f9a07967733116e65a3db2a69d886347b275',
    'address': '1Cw3vqPLtbzCPMwBFT6kFPfjWrr9xpNN5X',
    'tx_hash': 'f0b2c267f85928ab77b3e782d9858e0f57594b7266bd0230a51f3f4aec393be6'
}, {
    'ephemkey': '030dce4297c32122a7b364ba37a811e262d3a1805f504ea62757e0d244c9c28a12',
    'address': '1LXXCswQ5eRKJ57YPqiDyg6VTWw6u45WGa',
    'tx_hash': '79d106239e12e082f4791ebb772716ee1e5f5673d85a78af12a05bab34956d16'
}, {
    'ephemkey': '02c71663d13da6bcc234978dc700f70cbfefdf1619702b354965e030f95e3df449',
    'address': '1GocLvGRzAYG28sKqSpVw3iHWUCEqcZT81',
    'tx_hash': 'f7509fee2bc0530838492d0f2459a27a2c6051c41b67d3f57edf6635442a4c63'
}, {
    'ephemkey': '03da838281a019b246817928a107d0166c67f3e3d7277151d1d5a99d17e8c958e6',
    'address': '16fxTw6UjaNHviHoCk7LnRfPebRZCx2fQZ',
    'tx_hash': 'd683429bf49f3475479f8310ed766d2c5c59178b48519704adf3e02eca2e2e62'
}, ];

var respondSuccess = function(command, id, data) {
    assert.equal(command, 'blockchain.fetch_stealth');
    var errcode = 0;
    var p = Put().word32le(errcode);

    addresses.forEach(function(address) {
        p.put(new Buffer(address.ephemkey, 'hex'));
        p.put(new Buffer(util.decodeBase58Check(address.address)));
        p.put(buffertools.reverse(new Buffer(address.tx_hash, 'hex')));
    });

    return p.buffer();
};

describe('api fetchStealth()', function() {

    it('should break if numbits is not supplied', ObTest()
        .api('fetchStealth')
        .assertError('Invalid number of bits.'));

    it('should break if bad numbits is supplied', ObTest()
        .api('fetchStealth', '$#!+')
        .assertError('Invalid number of bits.'));

    it('should break if bad numbits is supplied', ObTest()
        .api('fetchStealth', 33)
        .assertError('Invalid number of bits.'));

    it('should break if bitfield is not supplied', ObTest()
        .api('fetchStealth', numbits)
        .assertError('Invalid bitfield.'));

    it('should break if bad bitfield is supplied', ObTest()
        .api('fetchStealth', numbits, '$#!+')
        .assertError('Invalid bitfield.'));

    it('should break if bad height is supplied', ObTest()
        .api('fetchStealth', numbits, bitfield, '$#!+')
        .assertError('Invalid height.'));

    it('should fetch stealth addresses', ObTest()
        .api('fetchStealth', numbits, bitfield, 0)
        .respond(respondSuccess)
        .assert(function(err, _addresses) {
            _addresses = _addresses.map(function(item) {
                assert.equal(item.address, util.encodeBase58Check(item.raw_address));
                return {
                    'ephemkey': item.ephemkey.toString('hex'),
                    'address': item.address,
                    'tx_hash': item.tx_hash.toString('hex')
                };
            });
            assert.ifError(err);
            assert.deepEqual(_addresses, addresses);
        }));
});

describe('cli fetch-stealth', function() {

    it('should break if numbits is not supplied', ObTest()
        .cli('fetch-stealth')
        .assertError('Invalid number of bits.'));

    it('should break if bad numbits is supplied', ObTest()
        .cli('fetch-stealth $#!+')
        .assertError('Invalid number of bits.'));

    it('should break if bad numbits is supplied', ObTest()
        .cli('fetch-stealth 33')
        .assertError('Invalid number of bits.'));

    it('should break if bitfield is not supplied', ObTest()
        .cli('fetch-stealth 2')
        .assertError('Invalid bitfield.'));

    it('should break if bad bitfield is supplied', ObTest()
        .cli('fetch-stealth 2 $#!+')
        .assertError('Invalid bitfield.'));

    it('should break if bad height is supplied', ObTest()
        .cli('fetch-stealth 2 8bf41c69 $#!+')
        .assertError('Invalid height.'));


    var checkSuccess = function(err, stdout, stderr) {
        assert.equal(err, 0);
        assert.equal(column(stdout, 75), 'd5296');
        assert.equal(column(stdout, 87), 'DCLG6');
        assert.equal(column(stdout, 130), '6f7fd');
        assert.equal(stderr, '');
    };

    it('should get stealth addresses given numbits and bitfield', ObTest()
        .cli('fetch-stealth ' + numbits + ' ' + bitfield + ' 100')
        .respond(respondSuccess)
        .assert(checkSuccess));

    it('should get stealth addresses in json format', ObTest()
        .cli('fetch-stealth ' + numbits + ' ' + bitfield + ' -j')
        .respond(respondSuccess)
        .assert(function(err, stdout, stderr) {
            assert.ifError(err);
            var h = JSON.parse(stdout);
            assert.equal(h.length, 5);
            assert.equal(h[0].address, '1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp');
            assert.equal(stderr, '');
        }));
});
