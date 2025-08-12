# Staking Contract

This directory contains a simple staking contract for the NEAR protocol.

## Description

This contract allows users to stake NEAR tokens and receive a 10% reward upon unstaking. The contract owner is responsible for funding the reward pool.

### Key Features

- Users can stake and unstake NEAR.
- A fixed 10% reward is paid on unstaking.
- The contract owner can deposit and withdraw funds for rewards.
- Uses `IterableMap` for efficient storage.

## Building the Contract

To build the contract, run the following command from this directory:

```bash
cargo build --target wasm32-unknown-unknown --release
```

The compiled WASM file will be located at `target/wasm32-unknown-unknown/release/staking_contract.wasm`.

## Running Tests

To run the tests for this contract, run the following command from this directory:

```bash
cargo test
```
