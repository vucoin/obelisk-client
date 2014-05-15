var zmq = require('zmq');
var buffertools = require('buffertools');
var Put = require('put');
var log = require('npmlog');
var binary = require('binary');
var EventEmitter = require('events').EventEmitter;
var util = require('./util');
var config = require('./config');
var error = require('./error');

log.level = 'error';

// handlers for zmq response messages
var handlers = {};

var MAX_UINT32 = 4294967295; // -1 >>> 0
var UNSPENT_INDEX = MAX_UINT32;

// make a random unsigned 32-bit integer
function randint() {
    return Math.floor(Math.random() * MAX_UINT32);
}

// pack an integer (represented by a string or an number) into a 4-byte buffer.
function packInt(n) {
    if (typeof n === 'string') {
        if (!n.match(/^\d+$/)) return;
        n = parseInt(n);
    }
    if (typeof n !== 'number' || n < 0) return;
    var buf = new Buffer(4);
    buf.writeUInt32LE(n, 0);
    return buf;
}

// pack a 256-bit hash value (represented by hex string or buffer) into
// a buffer using network encoding.
function packHash(hash) {
    if (typeof hash === 'string') {
        if (!hash.match(/^([0-9a-fA-F]{64})$/)) return;
        hash = new Buffer(hash, 'hex');
    }
    if (hash instanceof Buffer) {
        if (hash.length !== 32) return;
        return buffertools.reverse(hash);
    }
}

// pack block index (either an integer height or a 256-bit hash) into
// a buffer using network encoding.
function packBlockIndex(value) {
    if (typeof value === 'string') {
        if (!value.match(/^(\d+)$|^([0-9a-fA-F]{64})$/)) return;
        value = (value.length === 64) ? new Buffer(value, 'hex') : parseInt(value);
    }
    if (value instanceof Buffer) {
        if (value.length !== 32) return;
        return buffertools.reverse(value);
    }
    if (typeof value === 'number') {
        return packInt(value);
    }
}

// pack bitfield used in stealth address requests.
function packBitfield(value) {
    if (typeof value === 'string') {
        if (!value.match(/^(\d+)$|^([0-9a-fA-F]{8})$/)) return;
        value = (value.length === 8) ? new Buffer(value, 'hex') : parseInt(value);
    }
    if (value instanceof Buffer) {
        if (value.length !== 4) return;
        return buffertools.reverse(value);
    }
    if (typeof value === 'number') {
        return packInt(value);
    }
}

/**
 * Client constructor.
 *
 * @class
 * @param {Object} options.
 * @api public
 */

function Client(options) {
    options = config(options);
    this._port = options.port;
    this._blkport = options.blkport;
    this._txport = options.txport;
    this._hbport = options.hbport;
    this._subscriptions = {};
    this.error = error;
    var self = this;
    subscribe(this._hbport, function(msg) {
        self.emit('heartbeat', msg);
    });
}

// make this Client and EventEmitter to emit 'address' events.
require('util').inherits(Client, EventEmitter);

/**
 * Initialize connection to obelisk server using ZMQ DEALER socket.
 *
 * @api private
 */

Client.prototype._socket = function() {
    if (!this._sock) {
        var socket = this._sock = zmq.socket('dealer');
        socket.linger = 0;
        socket.connect(this._port);
        log.info('Connected to', this._port);
        var self = this;

        socket.on('message', function(command, id, data) {
            console.assert(arguments.length === 3);
            id = id.readUInt32LE(0);
            command = command.toString();
            log.verbose('C<', '%d %s', id, command, data);

            // special case for 'address.update' which doesn't include errcode
            if (command === 'address.update') {
                handleAddressUpdate(data, self);
            } else {
                var cb = self._subscriptions[id];
                delete self._subscriptions[id];
                handleMessage(command, data, cb);
            }
        });

        socket.on('error', function(err) {
            log.error(err);
        });
    }
    return this._sock;
};

/**
 * Send request to obelisk server using ZMQ DEALER socket.
 *
 * @param {String} command obelisk zmq command.
 * @param {Buffer} data request payload.
 * @param {Function} cb callback.
 * @api private
 */

Client.prototype._send = function(command, data, cb) {
    console.assert(typeof cb === 'function');
    var id = randint();
    this._subscriptions[id] = cb;
    var socket = this._socket();
    socket.send([command, packInt(id), data]);
    log.verbose('C>', '%d %s', id, command, data);
    return id;
};

/**
 * ## fetchLastHeight
 *
 * Fetches the height of the last block in blockchain.
 *
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchlastheight%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchLastHeight = function(cb) {
    this._send('blockchain.fetch_last_height', '', cb);
    return this;
};

/**
 * ### fetchLastHeight callback.
 *
 * @callback Client~fetchLastHeight
 * @param {Error} error error or `null`.
 * @param {Number} height height of the most recent block.
 */

handlers['blockchain.fetch_last_height'] = function(cb) {
    this
        .word32lu('height')
        .tap(function(vars) {
            console.assert(this.eof());
            cb(null, vars.height);
        });
};

/**
 * ## fetchBlockHeight
 *
 * Fetches the block height by its hash.
 *
 * @param {String|Buffer} hash 256-bit block hash as hex string or `Buffer`.
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchblockheight%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchBlockHeight = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var hash = packHash(args.shift());
    if (hash === undefined)
        return cb(new Error('Invalid block hash.'));

    this._send('blockchain.fetch_block_height', hash, cb);
    return this;
};

/**
 * ### fetchBlockHeight callback.
 *
 * @callback Client~fetchBlockHeight
 * @param {Error} error error or `null`.
 * @param {Number} height height of the requested block.
 */

handlers['blockchain.fetch_block_height'] = handlers['blockchain.fetch_last_height'];

/**
 * ## fetchBlockHeader
 *
 * Fetches the block header by height or hash.
 *
 * @param {Number|String|Buffer} height|hash integer block height
 *                           or 256-bit hash as hex string or `Buffer`.
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchblockheader%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchBlockHeader = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var index = packBlockIndex(args.shift());
    if (index === undefined)
        return cb(new Error('Invalid block index.'));

    this._send('blockchain.fetch_block_header', index, cb);
    return this;
};

/**
 * ### fetchBlockHeader callback.
 *
 * @callback Client~fetchBlockHeader
 * @param {Error} error error or `null`.
 * @param {Buffer} header 80-byte header of the requested block.
 */

handlers['blockchain.fetch_block_header'] = function(cb) {
    this
        .buffer('header', 80)
        .tap(function(vars) {
            console.assert(this.eof());
            cb(null, vars.header);
        });
};

/**
 * ## fetchBlockTransactionHashes
 *
 * Fetches the block transaction hashes by height or hash.
 *
 * @param {Number|String|Buffer} height|hash integer block height
 *                           or 256-bit hash as hex string or `Buffer`.
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchblocktransactionhashes%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchBlockTransactionHashes = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var index = packBlockIndex(args.shift());
    if (index === undefined)
        return cb(new Error('Invalid block index.'));

    this._send('blockchain.fetch_block_transaction_hashes', index, cb);
    return this;
};

/**
 * ### fetchBlockTransactionHashes callback.
 *
 * @callback Client~fetchBlockTransactionHashes
 * @param {Error} error error or `null`.
 * @param {Array} hashes transaction hashes as 32-byte `Buffers`.
 */

handlers['blockchain.fetch_block_transaction_hashes'] = function(cb) {
    var hashes = [];

    this
        .loop(function(end, vars) {
            if (this.eof()) return end();
            this
                .buffer('txhash', 32)
                .tap(function(vars) {
                    hashes.push(buffertools.reverse(vars.txhash));
                });
        });

    cb(null, hashes);
};

/**
 * ## fetchTransaction
 *
 * Fetches a transaction by its hash.
 *
 * @param {String|Buffer} hash 256-bit transaction hash as hex string or `Buffer`.
 * @param {Boolean} unconfirmed (optional) search in unconfirmed pool
 *               instead of the blockchain (default: `false`).
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchtransaction%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchTransaction = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var hash = packHash(args.shift());
    if (hash === undefined)
        return cb(new Error('Invalid transaction hash.'));

    var unconfirmed = args && args.shift();
    var command = (unconfirmed ? 'transaction_pool' : 'blockchain') + '.fetch_transaction';

    this._send(command, hash, cb);
    return this;
};

/**
 * ### fetchTransaction callback.
 *
 * @callback Client~fetchTransaction
 * @param {Error} error error or `null`.
 * @param {Buffer} txdata raw transaction data.
 */

handlers['blockchain.fetch_transaction'] = handlers['transaction_pool.fetch_transaction'] = function(cb) {
    this
        .buffer('txdata', 1e6)
        .tap(function(vars) {
            console.assert(this.eof());
            cb(null, vars.txdata);
        });
};

/**
 * ## fetchTransactionIndex
 *
 * Fetches block height and index of a transaction by hash.
 *
 * @param {String|Buffer} hash 256-bit transaction hash as hex string or `Buffer`.
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchtransactionindex%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchTransactionIndex = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var hash = packHash(args.shift());
    if (hash === undefined)
        return cb(new Error('Invalid transaction hash.'));

    this._send('blockchain.fetch_transaction_index', hash, cb);
    return this;
};

/**
 * ### fetchTransactionIndex callback.
 *
 * @callback Client~fetchTransactionIndex
 * @param {Error} error error or `null`.
 * @param {Number} height block height of requested transaction.
 * @param {Number} index index of requested transaction within its block.
 */

handlers['blockchain.fetch_transaction_index'] = function(cb) {
    this
        .word32le('height')
        .word32le('index')
        .tap(function(vars) {
            console.assert(this.eof());
            cb(null, vars.height, vars.index);
        });
};

/**
 * ## fetchSpend
 *
 * Fetches the spent output [txhash:index] for a given input [txhash:index].
 *
 * @param {String|Buffer} hash 256-bit transaction hash as hex string or `Buffer`.
 * @param {Number} index transaction index.
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchspend%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchSpend = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var hash = packHash(args.shift());
    if (hash === undefined)
        return cb(new Error('Invalid transaction hash.'));

    var index = packInt(args.shift());
    if (index === undefined)
        return cb(new Error('Invalid transaction index.'));

    var data = Buffer.concat([hash, index]);
    this._send('blockchain.fetch_spend', data, cb);
    return this;
};

/**
 * ### fetchSpend callback.
 *
 * @callback Client~fetchSpend
 * @param {Error} error error or `null`.
 * @param {Buffer} txhash 256-bit spent output hash.
 * @param {Number} index spent output index.
 */

handlers['blockchain.fetch_spend'] = function(cb) {
    this
        .buffer('txhash', 32)
        .word32le('index')
        .tap(function(vars) {
            console.assert(this.eof());
            cb(null, buffertools.reverse(vars.txhash), vars.index);
        });
};

/**
 * ## fetchStealth
 *
 * Fetches stealth keys.
 *
 * @param {Number} nbits number of bits [0-32].
 * @param {String|Buffer} bitfield 32-bit bitfield as hex string or `Buffer`.
 * @param {Number} height (optional) search starting from this block height (default: 0).
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchstealth%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchStealth = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var nbits = args.shift();
    if (!(typeof nbits === 'number' && nbits >= 0 && nbits <= 32))
        return cb(new Error('Invalid number of bits.'));

    var bitfield = packBitfield(args.shift());
    if (bitfield === undefined)
        return cb(new Error('Invalid bitfield.'));

    var height = args.shift();
    if (height === undefined) height = 0;
    if (!(typeof height === 'number' && height >= 0))
        return cb(new Error('Invalid height.'));

    var data = Put()
        .word8(nbits)
        .put(bitfield)
        .word32le(height)
        .buffer();

    this._send('blockchain.fetch_stealth', data, cb);
    return this;
};

/**
 * ### fetchStealth callback.
 *
 * @callback Client~fetchStealth
 * @param {Error} error error or `null`.
 * @param {Array} addresses array of stealth address `Objects` as follows:
 *
 *     [{
 *         ephemkey     : [Buffer],
 *         raw_address  : [Buffer],
 *         address      : [String],
 *         tx_hash      : [Buffer],
 *     }, ...]
 */

handlers['blockchain.fetch_stealth'] = function(cb) {
    var items = [];

    this
        .loop(function(end, vars) {
            if (this.eof()) return end();
            this
                .buffer('ephemkey', 33)
                .buffer('raw_address', 21)
                .buffer('tx_hash', 32)
                .tap(function(vars) {
                    var row = {};
                    row.ephemkey = vars.ephemkey;
                    row.raw_address = vars.raw_address;
                    row.address = util.encodeBase58Check(row.raw_address);
                    row.tx_hash = buffertools.reverse(vars.tx_hash);
                    items.push(row);
                });
        });

    cb(null, items);
};

/**
 * ## fetchHistory
 *
 * Fetches the output points, output values, corresponding input point
 * spends and the block heights associated with a Bitcoin address.
 *
 * @param {String} address base58check-encoded address.
 * @param {Number} height only include transactions from this block height (default: 0).
 * @param {Boolean} unconfirmed (optional) include unconfirmed transactions
 *                (default: `false`).
 * @param {Function} cb callback that handles the response
                     ([see below](#fetchhistory%20callback.)).
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.fetchHistory = function() {
    var args = [].slice.call(arguments);
    var cb = args.pop();

    var address = util.decodeBase58Check(args.shift());
    if (!address) return cb(new Error('Invalid address.'));

    var height = args.shift();
    if (height === undefined) height = 0;
    if (!(typeof height === 'number' && height >= 0))
        return cb(new Error('Invalid height.'));

    var unconfirmed = args && args.shift();
    var command = (unconfirmed ? 'address' : 'blockchain') + '.fetch_history';

    var data = Put()
        .put(address)
        .word32le(height)
        .buffer();

    this._send(command, data, cb);
    return this;
};

/**
 * ### fetchHistory callback.
 *
 * @callback Client~fetchHistory
 * @param {Error} error error or `null`.
 * @param {Array} items array of `Objects` of the following format:
 *
 *     [{
 *         output_hash   : [Buffer],
 *         output_index  : [Number],
 *         output_height : [Number],
 *         value         : [Number],
 *         spend_hash    : [Buffer],
 *         spend_index   : [Number],
 *         spend_height  : [Number],
 *     }, ...]
 *
 * If an output is unspent then `spend_hash`, `spend_index` and `spend_height`
 * are `undefined`.
 *
 * If only `output_height` or `spend_height` are `undefined` then they belong
 * to an unconfirmed transaction.
 *
 * Summing the list of values for unspent outpoints gives the balance
 * for an address.
 */

handlers['blockchain.fetch_history'] = handlers['address.fetch_history'] = function(cb) {
    var history = [];

    this
        .loop(function(end, vars) {
            if (this.eof()) return end();
            this
                .buffer('output_hash', 32)
                .word32le('output_index')
                .word32le('output_height')
                .buffer('value', 8)
                .buffer('spend_hash', 32)
                .word32le('spend_index')
                .word32le('spend_height')
                .tap(function(vars) {
                    var row = {};
                    row.output_hash = buffertools.reverse(vars.output_hash);
                    row.output_index = vars.output_index;
                    row.output_height = vars.output_height;
                    row.value = util.valueToBigInt(vars.value);
                    if (vars.spend_index !== UNSPENT_INDEX) {
                        row.spend_hash = buffertools.reverse(vars.spend_hash);
                        row.spend_index = vars.spend_index;
                        row.spend_height = vars.spend_height;
                    }
                    history.push(row);
                });
        });

    cb(null, history);
};

/**
 * common method shared by subscribeAddress() and renewAddress().
 *
 * @api private
 */

Client.prototype._subscribeAddress = function() {
    var args = [].slice.call(arguments);
    var command = args.shift();
    var cb = args.pop();

    var address = util.decodeBase58Check(args.shift());
    if (!address) return cb(new Error('Invalid address.'));

    var data = Put()
        .put(address)
        .buffer();

    this._send(command, data, cb);
    return this;
};

/**
 * ## subscribeAddress
 *
 * Subscribe to transactions on an address.
 *
 * @param {String} address base58check-encoded address.
 * @param {Function} cb callback that handles the response.
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.subscribeAddress = function(address, cb) {
    return this._subscribeAddress('address.subscribe', address, cb);
};

/**
 * ### subscribeAddress callback.
 *
 * @callback Client~subscribeAddress
 * @param {Error} error error or `null`.
 */

handlers['address.subscribe'] = function(cb) {
    cb();
};

/**
 * ## renewAddress
 *
 * Renew address subscription.
 *
 * @param {String} address base58check-encoded address.
 * @param {Function} cb callback that handles the response.
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.renewAddress = function(address, cb) {
    return this._subscribeAddress('address.renew', address, cb);
};

/**
 * ### renewAddress callback.
 *
 * @callback Client~subscribeAddress
 * @param {Error} error error or `null`.
 */

handlers['address.renew'] = function(cb) {
    cb();
};

/**
 * handle zmq request message, process error and dispatch specific handler.
 *
 * @see http://libbitcoin.dyne.org/obelisk/api.html
 * @api private
 */
function handleMessage(cmd, data, cb) {
    binary(data)
        .word32lu('ec')
        .tap(function(vars) {
            if (vars.ec)
                return cb(error.ObeliskError(vars.ec));
            var handler = handlers[cmd];
            if (!handler)
                return cb(new Error('No handler for message ' + cmd));
            handler.call(this, cb);
        });
}

/**
 * parse address.update message
 * address_version_byte(1) + address_hash(20) + height(4) + block_hash(32) + tx
 *
 * @api private
 */

function handleAddressUpdate(data, client) {
    binary(data)
        .buffer('address', 21)
        .word32le('height')
        .buffer('blkhash', 32)
        .buffer('txdata', 1e6)
        .tap(function(vars) {
            console.assert(this.eof());
            client.emit('address',
                util.encodeBase58Check(vars.address),
                vars.height === 0 ? undefined : vars.height,
                vars.height === 0 ? undefined : vars.blkhash,
                vars.txdata);
        });
}

/**
 * ## subscribeBlocks
 *
 * Subscribes to new block notifications.
 * Notifications are emitted as `block` events.
 * Each block has the following structure:
 *
 *     {
 *       "height": [Number],   // 297690
 *       "header": [Buffer],   // "02000000...ce2402e0"
 *       "tx": [
 *         [Buffer],           // "509fa51e...0d7025f0"
 *         [Buffer],           // "7c0b7a90...1230255d"
 *         ...
 *         [Buffer],           // "6836d912...9e7bc65a"
 *         [Buffer]            // "1ba97fe9...87b64ea5"
 *       ]
 *     }
 *
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.subscribeBlocks = function() {
    var self = this;
    subscribe(this._blkport, function() {
        var args = [].slice.call(arguments);
        var block = {
            height: args.shift().readUInt32LE(0),
            header: args.shift(),
        };
        block.tx = args;
        self.emit('block', block);
    });
    return this;
};

/**
 * ## unsubscribeBlocks
 *
 * Stop receiving block notitifications.
 *
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.unsubscribeBlocks = function() {
    unsubscribe(this._blkport);
    return this;
};

/**
 * ## subscribeTransactions
 *
 * Subscribes to new unconfirmed validated transaction notifications.
 * Notifications are emitted as `tx` events.
 * Each transaction is a Buffer containing raw data.
 *
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.subscribeTransactions = function() {
    var self = this;
    subscribe(this._txport, function() {
        console.assert(arguments.length === 1);
        self.emit('tx', arguments[0]);
    });
    return this;
};

/**
 * ## unsubscribeTransactions
 *
 * Stop receiving transaction notitifications.
 *
 * @return {Client} `this` for chaining.
 * @api public
 */

Client.prototype.unsubscribeTransactions = function() {
    unsubscribe(this._txport);
    return this;
};

var subscriptions = {};

function subscribe(port, handler) {
    var socket = subscriptions[port];
    if (socket) {
        log.warn('Already subscribed to', port);
    } else {
        socket = subscriptions[port] = zmq.socket('sub');
        socket.connect(port);
        socket.subscribe('');
        log.info('Subscribed to', port);
        socket.on('message', handler);
    }
    return socket;
}

function unsubscribe(port) {
    var socket = subscriptions[port];
    if (socket) {
        socket.unsubscribe('');
        socket.disconnect(port);
        log.info('Unsubscribed from', port);
        delete subscriptions[port];
    } else {
        log.warn('Not subscribed to', port);
    }
}

// expose for unit testing
Client._packInt = packInt;
Client._packHash = packHash;
Client._packBlockIndex = packBlockIndex;
Client._packBitfield = packBitfield;

// publicly export Client class
module.exports = Client;
