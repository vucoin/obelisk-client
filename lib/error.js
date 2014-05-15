// from libbitcoin/include/bitcoin/error.hpp

exports.codes = [, // error codes start with 1
    'service_stopped',
    'operation_failed',
    // blockchain errors
    'not_found',
    'duplicate',
    'unspent_output',
    'unsupported_payment_type',
    // network errors
    'resolve_failed',
    'network_unreachable',
    'address_in_use',
    'listen_failed',
    'accept_failed',
    'bad_stream',
    'channel_timeout',
    // transaction pool
    'blockchain_reorganized',
    'pool_filled',
    // validate tx
    'coinbase_transaction',
    'is_not_standard',
    'double_spend',
    'input_not_found',
    // check_transaction()
    'empty_transaction',
    'output_value_overflow',
    'invalid_coinbase_script_size',
    'previous_output_null',
    // validate block
    'previous_block_invalid',
    // check_block()
    'size_limits',
    'proof_of_work',
    'futuristic_timestamp',
    'first_not_coinbase',
    'extra_coinbases',
    'too_many_sigs',
    'merkle_mismatch',
    // accept_block()
    'incorrect_proof_of_work',
    'timestamp_too_early',
    'non_final_transaction',
    'checkpoints_failed',
    'old_version_block',
    'coinbase_height_mismatch',
    // connect_block()
    'duplicate_or_spent',
    'validate_inputs_failed',
    'fees_out_of_range',
    'coinbase_too_large'
];

exports.codes.forEach(function(name, index) {
    exports[name] = index;
});

exports.ObeliskError = function(code) {
    var err = new Error(exports.codes[code]);
    err.code = code;
    err.name = 'ObeliskError';
    return err;
};
