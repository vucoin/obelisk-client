// hardcoded defaults

module.exports = function configure(options) {

    // setup defaults
    var config = {
        // main api (ZMQ DEALER/ROUTER)
        port: 'tcp://127.0.0.1:9091',
        // heartbeat (ZMQ PUB/SUB)
        hbport: 'tcp://127.0.0.1:9092',
        // live block feed (ZMQ PUB/SUB)
        blkport: 'tcp://127.0.0.1:9093',
        // live unconfirmed transaction feed (ZMQ PUB/SUB)
        txport: 'tcp://127.0.0.1:9094',
        // logging level ("silent", "error", "warn", "info", "verbose", "silly")
        loglevel: 'warn'
    };

    // load config file
    // TODO

    // environment variables starting with `OB_`
    Object.keys(process.env).map(function(k) {
        if (k.search('OB_') === 0) {
            config[k.substring(3).toLowerCase()] = process.env[k];
        }
    });

    // explicit options
    if (options) {
        Object.keys(options).map(function(k) {
            config[k] = options[k];
        });
    }

    return config;
};
