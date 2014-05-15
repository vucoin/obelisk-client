var assert = require('assert');
var Client = require('../');
var Put = require('put');
var zmq = require('zmq');
var testLiveCli = require('./util').testLiveCli;

var config = {};
var port = config.blkport = config.txport = 'ipc:///tmp/ob-test-port';

var block0 = {
    height: 0,
    header: '0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a29ab5f49ffff001d1dac2b7c',
    tx: ['4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b']
};

var block1 = {
    height: 1,
    header: '010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e857233e0e61bc6649ffff001d01e36299',
    tx: ['0e3e2357e806b6cdb1f70b54c3a3a17b6714ee1f0e68bebb44a74b1efd512098']
};

block0 = encodeBlock(block0);
block1 = encodeBlock(block1);

function encodeBlock(block) {
    var resp = [
        Put().word32le(block.height).buffer(),
        Buffer(block.header, 'hex')
    ];

    block.tx.forEach(function(tx) {
        resp.push(Buffer(tx, 'hex'));
    });
    return resp;
}

describe('api liveBlocks()', function() {

    it('should receive blocks', function(done) {

        var socket = zmq.socket('pub');
        socket.bindSync(port);

        var ob = new Client(config);
        var got = [];
        ob.on('block', function(block) {
            got.push(block);
        }).subscribeBlocks();

        setTimeout(function() {
            socket.send(block0);
            socket.send(block1);
        }, 10);

        setTimeout(function() {
            ob.unsubscribeBlocks();
            socket.send(block1);
        }, 20);

        setTimeout(function() {
            assert.equal(got.length, 2);
            done();
        }, 30);
    });
});

describe('cli live-blocks', function() {

    it('should receive blocks', function(done) {
        testLiveCli('live-blocks', [block0, block1],
            function(err, stdout, stderr) {
                assert.equal(err, 143); // SIGTERM
                // console.log('stdout', stdout);
                assert.equal(stdout.length, 386);
                assert.equal(stdout.substr(100, 20), '12b27ac72c3e67768f61');
                assert.equal(stderr, '');
                done();
            });
    });
});
