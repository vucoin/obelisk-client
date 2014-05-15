var Obelisk = require('../');

var ob = new Obelisk(),
    addresses = [
        '1Dorian4RoXcnBv9hnQ4Y2C1an6NJ4UrjX',
        '1EXoDusjGwvnjZUyKkxZ4UHEf77z6A5S4P',
        '1CounterpartyXXXXXXXXXXXXXXXUWLpVr'
    ];

addresses.forEach(function(address) {
    ob.fetchHistory(address, 0, true, function(err, history) {

        var confirmed = 0,
            unconfirmed = 0;

        history.forEach(function(item) {
            // count only unspent outputs
            if (!item.spend) {
                if (item.output_height) {
                    confirmed += parseInt(item.value);
                }
                unconfirmed += parseInt(item.value);
            }
        });

        console.log('Balance for %s: %s (confirmed) %s (unconfirmed)',
            address, confirmed / 1e8, unconfirmed / 1e8);
    });
});
