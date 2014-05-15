var async = require('async');
var base58 = require('base58-native');
var bignum = require('bignum');
var buffertools = require('buffertools');
var crypto = require('crypto');

function sha256(data) {
    return new Buffer(crypto.createHash('sha256').update(data).digest('binary'), 'binary');
}

function checksum(data) {
    return sha256(sha256(data)).slice(0, 4);
}

exports.encodeBase58Check = function encodeBase58Check(addr) {
    if (addr.length !== 21) return;
    addr = Buffer(addr); // clone to avoid side effects
    addr = Buffer.concat([addr.slice(0, 1), buffertools.reverse(addr.slice(1, 21))]);
    addr = Buffer.concat([addr, checksum(addr)]);
    return base58.encode(addr);
};

exports.decodeBase58Check = function decodeBase58Check(addr) {
    try {
        addr = base58.decode(addr);
    } catch (err) {
        return;
    }
    if (addr.length !== 25) return;
    var cksum = addr.slice(21);
    addr = addr.slice(0, 21);
    if (!buffertools.equals(cksum, checksum(addr))) return;
    return Buffer.concat([addr.slice(0, 1), buffertools.reverse(addr.slice(1, 21))]);
};

// bigint conversions from bitcore/util/util.js

exports.valueToBigInt = function valueToBigInt(valueBuffer) {
    if (Buffer.isBuffer(valueBuffer)) {
        return bignum.fromBuffer(valueBuffer, {
            endian: 'little',
            size: 8
        });
    } else {
        return valueBuffer;
    }
};

exports.bigIntToValue = function bigIntToValue(valueBigInt) {
    if (Buffer.isBuffer(valueBigInt)) {
        return valueBigInt;
    } else {
        return valueBigInt.toBuffer({
            endian: 'little',
            size: 8
        });
    }
};

function xrange(start, end) {
    var step = 1;
    var i = start - step;
    return function() {
        i += step;
        return i > end ? undefined : i;
    };
}

function orderedQueue(q, cb) {
    var ordered = [];

    return function(work) {
        var slot = {};
        ordered.push(slot);

        q.push(work, function() {
            slot.result = arguments;
            while (ordered.length) {
                if (ordered[0].result === undefined) break;
                cb.apply(null, Array.apply(null, ordered.shift().result));
            }
        });
    };
}

function runq(data, concurrency, worker, cb) {
    var q = async.queue(worker, concurrency);
    var push = orderedQueue(q, cb);
    q.empty = q.run = function() {
        var v = data();
        if (v !== undefined) push(v);
    };
    return q;
}

// var testworker = function(task, cb) {
//     console.log('doing', task);
//     setTimeout(function() { cb(null, task, task * 2) }, 500 * Math.random());
// };
//
// var q = runq(xrange(1, 200), 10, testworker, function() { console.log(arguments); });
// q.drain = function() {
//     console.log('all done');
// };
// q.run();

exports.xrange = xrange;
exports.runq = runq;
