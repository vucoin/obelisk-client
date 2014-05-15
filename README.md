# obelisk-client

obelisk is a [Node.js](http://nodejs.org) library and a command line tool to
interface with [Obelisk Bitcoin backend](https://github.com/libbitcoin/obelisk/).

## Installation

Install a library locally:

    npm install obelisk-client

Install the `ob` command line tool globally:

    npm install obelisk-client -g

## Configuration

Obelisk protocol uses several zmq endpoints (or ports) for communication.
The default configuration values are:

```js
var options = {
    port:       'tcp://127.0.0.1:9091',   // main api port
    hbport:     'tcp://127.0.0.1:9092',   // heartbeat port
    blkport:    'tcp://127.0.0.1:9093',   // block publisher port
    txport:     'tcp://127.0.0.1:9094',   // transaction publisher port
    loglevel:   'warn'
};
```

The options may be passed directly to the constructor:

```js
var Obelisk = require('obelisk-client');
var ob = new Obelisk(options);
```

To specify options using system environment variables, prefix `OB_`
in front of the capitalized option name, as follows:

    $ export OB_PORT=tcp://obelisk.unsystem.net:8081
    $ export OB_HBPORT=tcp://obelisk.unsystem.net:8082
    $ export OB_BLKPORT=tcp://obelisk.unsystem.net:8083
    $ export OB_TXPORT=tcp://obelisk.unsystem.net:8084

Obelisk wiki has a listing of publicly available
[Obelisk servers](https://wiki.unsystem.net/index.php/Obelisk/Servers).

## Library usage examples

```js
var Obelisk = require('obelisk-client');
var ob = new Obelisk();
ob.fetchLastHeight(function(err, height) {
    console.log('Latest block height:', height);
});
```

See `examples` directory and `lib/cli.js` for more.

## Command line examples

Fetch current block height:

    $ ob fetch-last-height
    294433

Fetch height of block given its hash:

    $ ob fetch-block-height 000000000000000265383fcb0576982a1bcc9b6c35eccc191af6ad7fbd83174e
    276363

Fetch block header given its height:

    $ ob fetch-block-header 276363
    0200000055db09021009575fb09206b953c13cc8eeb52bf7a404b70d0200000000000000609a318f5d287102f81c1cf93be964f5b00a6e3a3387891e2f0480e094cbb9c3c0cab6520ca303190c788999

Fetch block header given its hash:

    $ ob fetch-block-header 000000000000000265383fcb0576982a1bcc9b6c35eccc191af6ad7fbd83174e
    0200000055db09021009575fb09206b953c13cc8eeb52bf7a404b70d0200000000000000609a318f5d287102f81c1cf93be964f5b00a6e3a3387891e2f0480e094cbb9c3c0cab6520ca303190c788999

Fetch transaction history for an address:

    $ ob fetch-history 1Dorian4RoXcnBv9hnQ4Y2C1an6NJ4UrjX
    Address: 1Dorian4RoXcnBv9hnQ4Y2C1an6NJ4UrjX
      output: 9d672795ae76278c323fe1c8662c3116c647c7809cc8dd6af4bf229fa4254c6e:0
      output_height: 292062
      value: 10000
      spend: Unspent
      spend_height: Unspent
    ...

Fetch transaction history for multiple addresses starting with block 100000
and use jq to order results by output_height:

    $ cat addresses.txt | xargs ob fetch-history 100000 -j | jq '.|sort_by(.output_height)'
    [
      {
        "spend_height": "Unspent",
        "spend": "Unspent",
        "value": "500000000",
        "output_height": 249498,
        "output": "bae553e46507edc10cf4d8a6b7101a6dee5b33d284f1dd5dfed6fb6cb16239b5:0",
        "address": "1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P"
      },
    ...

Compute address balance:

    $ ob fetch-history 1Dorian4RoXcnBv9hnQ4Y2C1an6NJ4UrjX -j | jq '[.[] | select(.spend=="Unspent")] | map(.value|tonumber) | add / 1e8'
    49.31586071

Compute balances for multiple addresses:

    cat addresses.txt | xargs ob fetch-history -j | jq '[.[] | select(.spend=="Unspent")] | group_by(.address)[] | [.[0].address, (map(.value|tonumber) | add / 1e8)]' -c
    ["1CounterpartyXXXXXXXXXXXXXXXUWLpVr",2130.83749757]
    ["1Dorian4RoXcnBv9hnQ4Y2C1an6NJ4UrjX",49.31586071]
    ["1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P",947.71683132]

Fetch raw data for transaction given its hash:

    $ ob fetch-transaction 9d672795ae76278c323fe1c8662c3116c647c7809cc8dd6af4bf229fa4254c6e
    0100000001ff991d12e9b7389f0934bfb8985efadba109f3c0be2fd0dae262fb89e7291f24010000008c493046022100ecdb03022e50fb2448674b2d3aba27f951a5dce4c9c08bfa3cb5cb7a20dd87dd022100f718c93e64d4f739eedc2b0c9d32bbf0e7b122ee4f1b2e9a27ea3ff406c0b993014104de15899392c6b47d8525d81ed6445e2442ab6f111477787960b678155941986da05cbf10ad4010465754b475c86efb02e9413e82704a9a8c098862cbc71c7f62ffffffff0210270000000000001976a9148c7e252f8d64b0b6e313985915110fcfefcf4a2d88ac07bb1400000000001976a914339db0f2175915f0660272f97748234daa1f557488ac00000000

Fetch transaction hashes for a block given its height:

    $ ob fetch-block-transaction-hashes 100000
    8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87
    fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4
    6359f0868171b1d194cbee1af2f16ea598ae8fad666d9b012c8ed2b79a236ec4
    e9a66845e05d5abc0ad04ec80f774a7e585c6e8db975962d069a522137b80c1d

Fetch block height and index of a transaction given its hash:

    $ ob fetch-transaction-index 405c8db675683e41e9b147fc60646a4e13f9a257cd52908689b8e0a34da67fef
    289527 373

Fetch spending transaction for a given output:

    $ ob fetch-spend 3a1b9e330d32fef1ee42f8e86420d2be978bbe0dc5862f17da9027cf9e11f8c4 1
    7a2a6f66e87ed4e72d85ba7a82eda1572605c3330c461e171f58d7ff2763ac63:0

    $ ob fetch-spend 00d3a83d4bd7597fb65c6e2e6fc3f06a596b2dfbecfb11ebb46fdb9774f52dd9 0
    ObeliskError: unspent_output

Fetch stealth addresses (see [DarkWallet wiki](https://wiki.unsystem.net/index.php/DarkWallet/Stealth) for more info):

    $ ob fetch-stealth 2 8bf41c69
    ephemkey: 0276044981dc13bdc5e118b63c8715f0d1b00e6c0814d778668fa6b594b2a0ffbd address: 1DUhzP41otHNKijH4B6dZN1SRVuYJyYfrp tx_hash: 63e75e43de21b73d7eb0220ce44dcfa5fc7717a8decebb254b31ef13047fa518
    ephemkey: 021f1c08214ee2939b63dc5913ef45f9a07967733116e65a3db2a69d886347b275 address: 1Cw3vqPLtbzCPMwBFT6kFPfjWrr9xpNN5X tx_hash: f0b2c267f85928ab77b3e782d9858e0f57594b7266bd0230a51f3f4aec393be6
    ephemkey: 030dce4297c32122a7b364ba37a811e262d3a1805f504ea62757e0d244c9c28a12 address: 1LXXCswQ5eRKJ57YPqiDyg6VTWw6u45WGa tx_hash: 79d106239e12e082f4791ebb772716ee1e5f5673d85a78af12a05bab34956d16
    ephemkey: 02c71663d13da6bcc234978dc700f70cbfefdf1619702b354965e030f95e3df449 address: 1GocLvGRzAYG28sKqSpVw3iHWUCEqcZT81 tx_hash: f7509fee2bc0530838492d0f2459a27a2c6051c41b67d3f57edf6635442a4c63
    ephemkey: 03da838281a019b246817928a107d0166c67f3e3d7277151d1d5a99d17e8c958e6 address: 16fxTw6UjaNHviHoCk7LnRfPebRZCx2fQZ tx_hash: d683429bf49f3475479f8310ed766d2c5c59178b48519704adf3e02eca2e2e62

Stream unconfirmed validated transactions:

    $ ob live-tx
    0100000001c76f001e3f33466bddfb0f62ec4d0056f55b5adcaf454abe1a4569d49cf8bc85000000008c493046022100ca6baa0e4059857bdfdd0c07a9ace03c756a380cb81f5698dd1f169df2aab549022100bf4e83aa43eb6838d6a2fc1a5c6ef5401086cdaa72bf4fa4952403a0a55eec62014104f3bbfc91cd0b83314c5afbc86d738053835d79536e0b2cba476093d0db9a3c50febfd2c03ca0174acd694aa8b7248e2ddf905cc4331cbd6a2b89e090676da972ffffffff02ab901000000000001976a914ddf960683a14c48f35dc3676c717a34146e2fd1088ace8aa3c00000000001976a914f6d6e266aaa6aa140399436d69fb8496f293cde388ac00000000
    ...
    ^C

Stream published confirmed blocks:

    $ ob live-blocks
    Height 297845
    Header 02000000833e68adc6e7773b95dc5b25204a16c1af63a07e12f4910500000000000000003486a233d54b5673348a7d8f2baec84acceac88804ff25411d313baf995fc60efefe5b538c9d0019b1f25a6f
    16 transactions
    cd11e6b399302e241f59cadae4d4464fc2a4f6dff0822f3f7f0c718ee3982c08
    7b18849fbe7912100ea41210d05fdfd948bb8c6dcb8a7ddb26cb6d2a1ba1c8fe
    c0e0c080ae460177fb89f8797ebfd5388a8891404b3ed615b96f316947134e12
    ...
    ^C

## Running tests

Install dev dependencies and execute `make test`:

    $ npm install -d
    $ make test

## License

[The MIT License](LICENSE)

Copyright &copy; 2014

