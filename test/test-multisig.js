#!/usr/bin/env bare

/**
 * Test script for Multisig Safe integration
 *
 * Usage:
 *   bare test/test-multisig.js
 *
 * Tests:
 *   1. Initialize worklet with Alice's seed
 *   2. Get Safe address
 *   3. Get Safe owners
 *   4. Get Safe threshold
 *   5. Get Safe balance
 */

// Provide BareKit global before loading the worklet
const IPC = require('bare-ipc')

// Create a pair of connected IPC ports
const [workletPort, clientPort] = IPC.open()

// Create IPC instances from the ports
const workletIPC = workletPort.connect()
const clientIPC = clientPort.connect()

// Provide BareKit global with the IPC instance for the worklet
global.BareKit = {
  IPC: workletIPC
}

// Load the worklet
require('../src/wdk-worklet.js')

// Create HRPC client
const HRPC = require('../generated/hrpc/index.js')
const hrpc = new HRPC(clientIPC)

const fs = require('fs')
const path = require('path')

// Test seed phrases
const ALICE_SEED_PHRASE = 'glance cinnamon vicious bounce suspect aware injury echo bronze submit midnight tackle'
const BOB_SEED_PHRASE = 'remove picture mouse thank acid almost edge glare buffalo cruise humor extend'

// Load network configurations
const networkConfigPath = process.env.TEST_NETWORK_CONFIG || path.join(__dirname, 'config/networks.json')
let networkConfigs

try {
  const configData = fs.readFileSync(networkConfigPath, 'utf8')
  networkConfigs = JSON.parse(configData)
} catch (error) {
  console.error(`Failed to load network config from ${networkConfigPath}:`, error.message)
  process.exit(1)
}

// Only use sepolia-multisig for this test
const multisigConfig = {
  'sepolia-multisig': networkConfigs['sepolia-multisig']
}

async function testMultisigSafe() {
  try {
    console.log('='.repeat(70))
    console.log('Testing Multisig Safe Integration')
    console.log('='.repeat(70))
    console.log('')

    // Step 1: Start worklet
    console.log('Step 1: Starting worklet...')
    const startResult = await hrpc.workletStart({})
    console.log('  Worklet started:', startResult.status)
    console.log('')

    // Step 2: Get encrypted seed from Alice's mnemonic
    console.log('Step 2: Encrypting Alice seed phrase...')
    console.log(`  Seed: ${ALICE_SEED_PHRASE.split(' ').slice(0, 3).join(' ')}... (${ALICE_SEED_PHRASE.split(' ').length} words)`)
    const seedResult = await hrpc.getSeedAndEntropyFromMnemonic({
      mnemonic: ALICE_SEED_PHRASE
    })
    console.log('  Encryption key generated')
    console.log('  Seed encrypted')
    console.log('')

    // Step 3: Initialize WDK with multisig config
    console.log('Step 3: Initializing WDK with multisig config...')
    console.log('  Network: sepolia-multisig')
    console.log('  Safe Address:', multisigConfig['sepolia-multisig'].options.safeAddress)
    const initResult = await hrpc.initializeWDK({
      encryptionKey: seedResult.encryptionKey,
      encryptedSeed: seedResult.encryptedSeedBuffer,
      config: JSON.stringify(multisigConfig)
    })
    console.log('  WDK initialized:', initResult.status)
    console.log('')

    // Step 4: Get Safe address
    console.log('Step 4: Getting Safe address...')
    const addressResult = await hrpc.callMethod({
      methodName: 'getAddress',
      network: 'sepolia-multisig',
      accountIndex: 0
    })
    const safeAddress = JSON.parse(addressResult.result)
    console.log('  Safe Address:', safeAddress)
    console.log('')

    // Step 5: Get Safe owners
    console.log('Step 5: Getting Safe owners...')
    const ownersResult = await hrpc.callMethod({
      methodName: 'getOwners',
      network: 'sepolia-multisig',
      accountIndex: 0
    })
    const owners = JSON.parse(ownersResult.result)
    console.log('  Owners:')
    owners.forEach((owner, i) => console.log(`    ${i + 1}. ${owner}`))
    console.log('')

    // Step 6: Get Safe threshold
    console.log('Step 6: Getting Safe threshold...')
    const thresholdResult = await hrpc.callMethod({
      methodName: 'getThreshold',
      network: 'sepolia-multisig',
      accountIndex: 0
    })
    const threshold = JSON.parse(thresholdResult.result)
    console.log('  Threshold:', threshold, 'of', owners.length)
    console.log('')

    // Step 7: Get Safe balance
    console.log('Step 7: Getting Safe balance...')
    const balanceResult = await hrpc.callMethod({
      methodName: 'getBalance',
      network: 'sepolia-multisig',
      accountIndex: 0
    })
    const balance = JSON.parse(balanceResult.result)
    console.log('  Balance:', balance, 'wei')
    console.log('')

    // Step 8: Check if deployed
    console.log('Step 8: Checking if Safe is deployed...')
    const deployedResult = await hrpc.callMethod({
      methodName: 'isDeployed',
      network: 'sepolia-multisig',
      accountIndex: 0
    })
    const isDeployed = JSON.parse(deployedResult.result)
    console.log('  Is Deployed:', isDeployed)
    console.log('')

    // Cleanup
    console.log('Step 9: Cleaning up...')
    hrpc.dispose({})
    console.log('  Worklet disposed')
    console.log('')

    console.log('='.repeat(70))
    console.log('All tests passed!')
    console.log('='.repeat(70))

  } catch (error) {
    console.error('')
    console.error('Test failed!')
    console.error('Error:', error.message)
    if (error.stack) {
      console.error('')
      console.error('Stack trace:')
      console.error(error.stack)
    }

    // Try to cleanup on error
    try {
      hrpc.dispose({})
    } catch (e) {
      // Ignore cleanup errors
    }

    process.exit(1)
  }
}

// Run the test
testMultisigSafe().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
