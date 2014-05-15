var assert = require('assert');
var ObTest = require('./util').ObTest;

describe('cli general tests', function() {
    it('should get top level help by default', ObTest()
        .cli('')
        .assert(function(err, stdout, stderr) {
            assert.equal(err, 1);
            assert.ok(stdout.search('Commands') > 100);
            assert.equal(stderr, '');
        }));

    it('should get top level help', ObTest()
        .cli('--help')
        .assert(function(err, stdout, stderr) {
            assert.equal(err, 0);
            assert.ok(stdout.search('Commands') > 100);
            assert.equal(stderr, '');
        }));

    it('should break on unknown command', ObTest()
        .cli('xyz')
        .assert(function(err, stdout, stderr) {
            assert.equal(err, 1);
            assert.equal(stdout, '');
            assert.ok(stderr.search('Unknown command.'));
        }));

    it('should show help for command', ObTest()
        .cli('fetch-history -h')
        .assert(function(err, stdout, stderr) {
            assert.equal(err, 0);
            assert.ok(stdout.search('Shorthands') > 100);
            assert.equal(stderr, '');
        }));
});
