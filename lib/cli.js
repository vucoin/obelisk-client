#!/usr/bin/env node

// ob - javascript obelisk client

var pkg = require('../package.json');
var Client = require('../');
var program = require('../lib/program');
var util = require('../lib/util');
var async = require('async');
var format = require('util').format;

program.name = process.title = 'ob';
program.config = require('../lib/config')();

program
    .version(pkg.version)
    .usage('{{program}} [options] [command] [command options]')
    .option('port', String, 'specify obelisk port, ex: "tcp://127.0.0.1:9091"').shorthand('p', '--port')
    .option('help', Boolean, 'show this help message').shorthand('h', '--help')
    .option('version', Boolean, 'show version').shorthand('V', '--version')
    .option('loglevel', String)
    .shorthand('q', '--loglevel', 'silent')
    .shorthand('v', '--loglevel', 'info')
    .shorthand('vv', '--loglevel', 'verbose')
    .shorthand('vvv', '--loglevel', 'silly');

program
    .command('fetch-last-height')
    .description('Show height of last block on blockchain.')
    .usage('{{program}} {{command}}')
    .action(function(p, done) {

        var ob = new Client(program.config);
        ob.fetchLastHeight(function(err, height) {
            if (err) return done(err);
            console.log(height);
            done();
        });
    });

program
    .command('fetch-block-height')
    .description('Show block height given its hash.')
    .usage('{{program}} {{command}} <hash>')
    .action(function(p, done) {

        var hash = p.argv.remain.shift();
        var ob = new Client(program.config);
        ob.fetchBlockHeight(hash, function(err, height) {
            if (err) return done(err);
            console.log(height);
            done();
        });
    });

program
    .command('fetch-block-header')
    .description('Show block header given its height or hash.')
    .usage('{{program}} {{command}} [options] <height|hash>')
    .action(function(p, done) {

        var index = p.argv.remain.shift();
        var ob = new Client(program.config);
        ob.fetchBlockHeader(index, function(err, header) {
            if (err) return done(err);
            console.log(header.toString('hex'));
            done();
        });
    });

program
    .command('fetch-block-transaction-hashes')
    .description('Show block transaction hashes.')
    .usage('{{program}} {{command}} [options] [height|hash] ...')
    .action(function(p, done) {

        var index = p.argv.remain.shift();
        var ob = new Client(program.config);
        ob.fetchBlockTransactionHashes(index, function(err, hashes) {
            if (err) return done(err);
            hashes.forEach(function(hash) {
                console.log(hash.toString('hex'));
            });
            done();
        });
    });

program
    .command('fetch-transaction')
    .description('Show transaction given its hash.')
    .usage('{{program}} {{command}} [options] TXHASH')
    .action(function(p, done) {

        var txhash = p.argv.remain.shift();
        var ob = new Client(program.config);

        function printTx(tx) {
            console.log(tx.toString('hex'));
        }

        // try blockchain first
        ob.fetchTransaction(txhash, function(err, tx) {
            if (!err) {
                printTx(tx);
                return done();
            }

            if (err.code !== ob.error.not_found) return done(err);

            // if not found, try unconfirmed pool
            ob.fetchTransaction(txhash, true, function(err, tx) {
                if (err) return done(err);
                printTx(tx);
                done();
            });
        });
    });

program
    .command('fetch-transaction-index')
    .description('Show transaction block height and index given its hash.')
    .usage('{{program}} {{command}} [options] TXHASH')
    .action(function(p, done) {

        var txhash = p.argv.remain.shift();
        var ob = new Client(program.config);
        ob.fetchTransactionIndex(txhash, function(err, height, index) {
            if (err) return done(err);
            console.log(format('%d %d', height, index));
            done();
        });
    });

program
    .command('fetch-spend')
    .description('Show spend input for a given output.')
    .usage('{{program}} {{command}} [options] TXHASH INDEX')
    .action(function(p, done) {

        var txhash = p.argv.remain.shift();
        var index = p.argv.remain.shift();

        var ob = new Client(program.config);
        ob.fetchSpend(txhash, index, function(err, txhash, index) {
            if (err) return done(err);
            console.log(format('%s:%d', txhash.toString('hex'), index));
            done();
        });
    });

program
    .command('fetch-stealth')
    .description('Show stealth addresses (experimental).')
    .usage('{{program}} {{command}} [options] NUMBER_BITS BITFIELD [HEIGHT]')
    .option('json', Boolean, 'output in json format').shorthand('j', '--json')
    .action(function(p, done) {

        var nbits = p.argv.remain.shift();
        nbits = nbits && nbits.match(/^\d+$/) && parseInt(nbits);
        var bitfield = p.argv.remain.shift();
        var height = p.argv.remain.shift();
        height = height && height.match(/^\d+$/) && parseInt(height);

        var ob = new Client(program.config);
        ob.fetchStealth(nbits, bitfield, height, function(err, items) {
            if (err) return done(err);
            items = items.map(function(item) {
                return {
                    'ephemkey': item.ephemkey.toString('hex'),
                    'address': item.address,
                    'tx_hash': item.tx_hash.toString('hex')
                };
            });

            if (p.json) {
                console.log(format('%j', items));
            } else {
                items.forEach(function(item) {
                    console.log(format('ephemkey: %s address: %s tx_hash: %s',
                        item.ephemkey,
                        item.address,
                        item.tx_hash));
                });
            }
            done();
        });
    });

program
    .command('fetch-history')
    .description('Show transaction history for one or more addresses.')
    .usage('{{program}} {{command}} [options] ADDRESS [ADDRESS2...] [HEIGHT]')
    .option('confirmed', Boolean, 'confirmed history only').shorthand('c', '--confirmed')
    .option('json', Boolean, 'output in json format').shorthand('j', '--json')
    .action(function(p, done) {

        var height = 0;
        var addresses = p.argv.remain.filter(function(addr) {
            addr = addr.match(/^\d+$/) && parseInt(addr);
            if (addr) {
                height = addr;
                return false;
            }
            return true;
        });

        if (!addresses.length)
            return done(new Error('Must supply one or more addresses.'));

        var allitems = [];
        var formatRow = p.json ? function(row) {
            allitems.push(row);
        } : function(row) {
            console.log(format('Address: %s', row.address));
            console.log(format('  output: %s', row.output));
            console.log(format('  output_height: %s', row.output_height));
            console.log(format('  value: %s', row.value));
            console.log(format('  spend: %s', row.spend));
            console.log(format('  spend_height: %s', row.spend_height));
            console.log();
        };

        function showHistory(address, history) {
            history = history.map(function(row) {
                var spent = (row.spend_index !== undefined);
                return {
                    'address': address,
                    'output': format('%s:%d', row.output_hash.toString('hex'), row.output_index),
                    'output_height': row.output_height ? row.output_height : 'Pending',
                    'value': row.value.toString(),
                    'spend': spent ? format('%s:%d', row.spend_hash.toString('hex'), row.spend_index) : 'Unspent',
                    'spend_height': spent ? row.spend_height ? row.spend_height : 'Pending' : 'Unspent'
                };
            });

            history.forEach(formatRow);
        }

        var ob = new Client(program.config);

        async.each(addresses,
            function(address, done) {
                ob.fetchHistory(address, height, !p.confirmed,
                    function(err, history) {
                        if (err) return done(err);
                        showHistory(address, history);
                        done();
                    });
            },
            function(err) {
                if (p.json) console.log(format('%j', allitems));
                done(err);
            });
    });

program
    .command('address')
    .description('Watch for transactions on an address.')
    .usage('{{program}} {{command}} [options]')
    .action(function(p, done) {

        var ob = new Client(program.config);

        var addresses = p.argv.remain;
        if (!addresses.length) {
            if (process.stdin.isTTY)
                console.error('Expecting addresses on standard input');

            var split = require('split');
            process.stdin.pipe(split()).on('data', subscribe);
        }

        ob.on('address', function(address, height, block_hash, tx) {
            console.log(address, height, block_hash, tx.toString('hex'));
        });

        function subscribe(address) {
            if (!address) return;
            ob.subscribeAddress(address, function(err) {
                if (err) return done(err);
                console.log('subscribed', address);

                setInterval(function() {
                    ob.renewAddress(address, function(err) {
                        if (err) return done(err);
                        console.log('renewed', address);
                    });
                }, 120000); // renew every 2 minutes
            });
        }
    });

program
    .command('blocks')
    .description('Show specified range of blocks.')
    .usage('{{program}} {{command}} [options]')
    .action(function(p, done) {

        var ob = new Client(program.config);

        ob.fetchLastHeight(function(err, height) {
            if (err) return done(err);

            var limit = 100; // show last 100 blocks
            var data = util.xrange(Math.max(height - limit + 1, 0), height);

            var q = util.runq(data, 20,
                function(height, cb) {
                    ob.fetchBlockHeader(height, function(err, header) {
                        cb(err, [height, header]);
                    });
                },
                function(err, results) {
                    if (err) done(err);
                    var height = results[0];
                    var header = results[1];
                    console.log('%d %s', height, header.toString('hex'));
                });

            q.drain = done;
            q.run();
        });
    });

program
    .command('live-blocks')
    .description('Show live blocks.')
    .usage('{{program}} {{command}} [options]')
    .option('txhashes', Boolean, 'show transaction hashes').shorthand('t', '--txhashes')
    .option('json', Boolean, 'output in json format').shorthand('j', '--json')
    .action(function(p, done) {

        var ob = new Client(program.config);

        ob.on('block', function(block) {
            block.header = block.header.toString('hex');
            block.tx = block.tx.map(function(tx) {
                return tx.toString('hex');
            });
            block.numtx = block.tx.length;
            if (!p.txhashes) delete block.tx;
            if (p.json) {
                console.log('%j', block);
            } else {
                console.log(format('Height %d', block.height));
                console.log(format('Header %s', block.header));
                console.log(format('%d transactions', block.numtx));
                if (block.tx) block.tx.forEach(function(tx) {
                    console.log(tx);
                });
                console.log();
            }
        }).subscribeBlocks();
    });

program
    .command('live-tx')
    .description('Show live unconfirmed transactions.')
    .usage('{{program}} {{command}} [options]')
    .option('json', Boolean, 'output in json format').shorthand('j', '--json')
    .action(function(p, done) {

        var ob = new Client(program.config);

        ob.on('tx', function(tx) {
            tx = tx.toString('hex');
            if (p.json) {
                console.log('%j', {
                    data: tx
                });
            } else {
                console.log(tx);
            }
        }).subscribeTransactions();
    });

module.exports = program;
