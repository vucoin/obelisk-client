var assert = require('assert');
var Client = require('../');
var zmq = require('zmq');
var testLiveCli = require('./util').testLiveCli;

var config = {};
var port = config.blkport = config.txport = 'ipc:///tmp/ob-test-port';

var tx0 = new Buffer('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000', 'hex');

var tx1 = new Buffer('01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff0704ffff001d0104ffffffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166bf621e73a82cbf2342c858eeac00000000', 'hex');

describe('api liveTransactions()', function() {

    it('should receive transactions', function(done) {

        var socket = zmq.socket('pub');
        socket.bindSync(port);

        var ob = new Client(config);
        var got = [];
        ob.on('tx', function(tx) {
            got.push(tx);
        }).subscribeTransactions();

        setTimeout(function() {
            socket.send(tx0);
            socket.send(tx1);
        }, 10);

        setTimeout(function() {
            ob.unsubscribeTransactions();
            socket.send(tx1);
        }, 20);

        setTimeout(function() {
            assert.equal(got.length, 2);
            done();
        }, 30);
    });
});

describe('cli live-transactions', function() {

    it('should receive transactions', function(done) {
        testLiveCli('live-tx', [tx0, tx1],
            function(err, stdout, stderr) {
                assert.equal(err, 143); // SIGTERM
                // console.log('stdout', stdout);
                assert.equal(stdout.length, 678);
                assert.equal(stdout.substr(100, 20), '5468652054696d657320');
                assert.equal(stderr, '');
                done();
            });
    });
});
