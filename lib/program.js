var nopt = require('nopt');
var log = require('npmlog');
var sprintf = require('sprintf').sprintf;
var mustache = require('mustache');

function Program() {
    this._options = [];
    this._shorthands = [];
    this._commands = {};
    this._commandsList = [];
}

Program.prototype.version = function(version) {
    this._version = version;
    return this;
};

Program.prototype.usage = function(usage) {
    this._usage = mustache.render(usage, {
        program: this.name
    });
    return this;
};

function Option(name, type, help) {
    this.name = name;
    this.type = type;
    this.help = help;
}

Program.prototype.option = function(name, type, help) {
    this._options.push(new Option(name, type, help));
    return this;
};

Program.prototype.shorthand = function() {
    this._shorthands.push(Array.apply(null, arguments));
    return this;
};

Program.prototype.showHelp = function() {
    var help = [];

    if (this._usage) {
        help.push(this._usage);
        help.push('');
    }

    if (this._options.length) {
        help.push('Options');
        help.push('');

        this._options.forEach(function(opt) {
            help.push(sprintf('  %-20s  %s', '--' + opt.name, opt.help));
        });
        help.push('');
    }

    if (this._shorthands && this._shorthands.length) {
        help.push('Shorthands');
        help.push('');

        this._shorthands.forEach(function(shorthand) {
            help.push(sprintf('  %-20s  %s', '-' + shorthand[0], shorthand.slice(1).join(' ')));
        });
        help.push('');
    }

    if (this._commandsList && this._commandsList.length) {
        // auto-size column width to accomodate longest command
        var width = Math.max.apply(null,
            this._commandsList.map(function(cmd) {
                return cmd.name.length;
            }));
        var template = sprintf('  %%-%ds  %%s', width);

        help.push('Commands');
        help.push('');
        this._commandsList.forEach(function(cmd) {
            help.push(sprintf(template, cmd.name, cmd._description));
        });
        help.push('');
    }

    console.log(help.join('\n'));
};

Program.prototype.command = function(name) {
    var cmd = new Command(name);
    cmd.program = this;
    this._commands[name] = cmd;
    this._commandsList.push(cmd);
    return cmd;
};

Program.prototype.parseOptions = function(opts, sopts, argv) {
    this._options.forEach(function(opt) {
        opts[opt.name] = opt.type;
    });
    this._shorthands.forEach(function(sopt) {
        sopts[sopt[0]] = sopt.slice(1);
    });
    return nopt(opts, sopts, argv, 2);
};

Program.prototype.run = function(argv, exit) {
    if (argv === undefined) argv = process.argv;
    if (exit === undefined) exit = process.exit;

    function done(err) {
        if (err) {
            if (typeof err === 'number') {
                // numeric err is exit code
                exit(err);
            } else {
                console.error(err.toString());
                exit(1);
            }
        } else {
            exit(0);
        }
    }

    var opts = {},
        sopts = {};
    var p = this.parseOptions(opts, sopts, argv);

    if (p.version) {
        console.log(this._version);
        return done();
    }

    if (p.loglevel) {
        this.config.loglevel = p.loglevel;
    }

    log.level = this.config.loglevel;

    // handle commands

    var cmd = p.argv.remain.shift();

    if (cmd) {
        cmd = this._commands[cmd];
        if (cmd) {
            if (p.help) {
                cmd.showHelp();
                return done();
            }

            p = cmd.parseOptions(opts, sopts, argv);
            p.argv.remain.shift();

            cmd._action(p, done);

        } else {
            done(new Error(sprintf('Unknown command. See "%s --help".', this.name)));
        }
    } else {
        this.showHelp();
        return done(p.help ? 0 : 1);
    }
};

function Command(name) {
    this.name = name;
    this._options = [];
    this._shorthands = [];
}

Command.prototype.description = function(description) {
    this._description = description;
    return this;
};

Command.prototype.action = function(action) {
    this._action = action;
    return this;
};

Command.prototype.usage = function(usage) {
    this._usage = mustache.render(usage, {
        program: this.program.name,
        command: this.name
    });
    return this;
};

Command.prototype.option = Program.prototype.option;
Command.prototype.shorthand = Program.prototype.shorthand;
Command.prototype.parseOptions = Program.prototype.parseOptions;
Command.prototype.showHelp = Program.prototype.showHelp;

module.exports = new Program();
