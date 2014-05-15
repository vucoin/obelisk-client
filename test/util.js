var assert = require('assert');
var zmq = require('zmq');
var log = require('npmlog');
var cli = require('../lib/cli');
var Client = require('../');
var error = require('../lib/error');
var spawn = require('child_process').spawn;

var config = {
    port: 'ipc:///tmp/ob-test-port',
    txport: 'ipc:///tmp/ob-test-port',
    blkport: 'ipc:///tmp/ob-test-port',
    loglevel: 'error'
};

function setupServer(responses, cb) {
    var socket = zmq.socket('router');

    socket.bind(config.port, function(err) {
        if (err) return cb(err);
        log.info('Mock Obelisk server listening on', config.port);

        socket.on('message', function(envelope, command, id, data) {
            var res = responses.shift();
            command = command.toString();
            log.verbose('>S', [envelope, command, id, data]);
            var resp = [envelope, command, id, res(command, id, data)];
            socket.send(resp);
            log.verbose('S>', resp);
        });

        function cleanup(cb) {
            // socket.unbind(config.port, cb);
            socket.unbind(config.port, function() {
                setTimeout(cb, 10);
            });
        }

        cb(null, cleanup);
    });
}

function runCommand(cmd, cb) {
    cli.config = config;
    cmd = ['node', 'ob'].concat(cmd.split(/\s+/));

    var stdout = [],
        stderr = [],
        origstdout = console.log,
        origstderr = console.error;

    console.log = function() {
        stdout.push([].slice.call(arguments) + '\n');
    };

    console.error = function() {
        stderr.push([].slice.call(arguments) + '\n');
    };

    cli.run(cmd, function(err) {
        console.log = origstdout;
        console.error = origstderr;
        cb(err, stdout.join(''), stderr.join(''));
    });
}

exports.ObTest = function ObTest() {

    function Test() {}

    Test.prototype.api = function() {
        var self = this;
        console.assert(self._request === undefined);

        var args = [].slice.call(arguments);
        var name = args.shift();

        self._request = function(done) {
            args.push(function() {
                self._assert.apply(null, [].slice.call(arguments));
                done();
            });
            var ob = new Client(config);
            ob[name].apply(ob, args);
        };

        self.assertError = function(msg) {
            self._assert = function(err) {
                assert.equal(arguments.length, 1, 'expecting single err argument');
                assert.ok(err.message.match(msg),
                    '"' + msg + '" not found in "' + err.message + '"');
            };
            return self._request;
        };

        return self;
    };

    Test.prototype.cli = function(cmd) {
        var self = this;
        console.assert(self._request === undefined);

        self._request = function(done) {
            runCommand(cmd, function(err, stdout, stderr) {
                self._assert(err, stdout, stderr);
                done();
            });
        };

        self.assertError = function(msg) {
            if (typeof msg === 'number') {
                msg = 'ObeliskError: ' + error.codes[msg] + '\n';
            } else {
                msg = 'Error: ' + msg + '\n';
            }

            self._assert = function(err, stdout, stderr) {
                assert.equal(err, 1);
                assert.equal(stdout, '');
                assert.equal(stderr, msg);
            };
            return self._request;
        };

        return self;
    };

    Test.prototype.assert = function(cb) {
        console.assert(this._assert === undefined);
        console.assert(this._request !== undefined);
        this._assert = cb;
        return this._request;
    };

    Test.prototype.respond = function() {
        var self = this;
        console.assert(self._request !== undefined);
        var responses = [].slice.call(arguments);

        var subrequest = self._request;
        self._request = function(done) {
            setupServer(responses, function(err, cb) {
                if (err) return done(err);
                subrequest(function() {
                    cb(done);
                });
            });
        };

        return self;
    };

    return new Test();
};

exports.column = function column(text, col) {
    return text.split(/\n/).map(function(line) {
        return line.charAt(col);
    }).join('');
};

exports.testLiveCli = function testLiveCli(cmd, responses, done) {
    var socket = zmq.socket('pub');
    socket.bindSync(config.port);

    var options = {};
    options.env = {};
    Object.keys(config).map(function(k) {
        options.env['OB_' + k.toUpperCase()] = config[k];
    });
    // options.env.OB_LOGLEVEL = 'verbose';

    var child = spawn('node', ['bin/ob', cmd], options);
    var stdout = '';
    var stderr = '';

    child.stdout.on('data', function(data) {
        // console.log('stdout', '' + data);
        stdout += data;
    });

    child.stderr.on('data', function(data) {
        // console.log('stderr', '' + data);
        stderr += data;
    });

    child.on('close', function(code) {
        done(code, stdout, stderr);
    });

    setTimeout(function() {
        responses.forEach(function(resp) {
            socket.send(resp);
        });
    }, 200);

    setTimeout(function() {
        child.kill('SIGTERM');
    }, 400);
};

module.exports = exports;
