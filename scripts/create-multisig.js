const nearAPI = require('near-api-js');
const homedir = require('os').homedir();
const path = require('path');
const fs = require('fs');
const reader = require("readline-sync");
const { deployMultisig } = require("../multisig.js");

const config = {
    mainnet: {
        nodeUrl: 'https://rpc.mainnet.near.org',
        networkId: 'mainnet',
    },
    testnet: {
        nodeUrl: 'https://rpc.testnet.near.org',
        networkId: 'default',
    }
};

const NETWORK = process.env.NEAR_ENV || 'testnet';
const CORE_CONTRACTS_PATH = process.env.CORE_CONTRACTS_PATH || '../initial-contracts';
const MULTISIG_WASM_PATH = `${CORE_CONTRACTS_PATH}/multisig/res/multisig.wasm`;

const CREDENTIALS_DIR = '.near-credentials';
const PROJECT_KEY_DIR = './neardev';

async function createKeyStore() {
    // ./neardev is an old way of storing keys under project folder. We want to fallback there for backwards compatibility
    // TODO: use system keystores.
    // TODO: setting in config for which keystore to use
    const credentialsPath = path.join(homedir, CREDENTIALS_DIR);
    const keyStores = [
        new nearAPI.keyStores.UnencryptedFileSystemKeyStore(credentialsPath),
        new nearAPI.keyStores.UnencryptedFileSystemKeyStore(PROJECT_KEY_DIR)
    ];
    return new nearAPI.keyStores.MergeKeyStore(keyStores);
}

async function accountExists(connection, accountId) {
    try {
        const account = new nearAPI.Account(connection, accountId);
        await account.state();
        return true;
    } catch (error) {
        if (!error.message.includes('does not exist while viewing')) {
            throw error;
        }
        return false;
    }
}

(async () => {
    const options = config[NETWORK];
    options.keyStore = await createKeyStore();
    const near = await nearAPI.connect(options);

    console.log(`Selected ${NETWORK} network.`);

    const masterAccountId = reader.question('Master account: ');
    const accountId = reader.question('Multisig account: ');
    const keys = [];
    while (true) {
        const key = reader.question('Key: ');
        if (!key) break;
        keys.push(key);
    }
    let deployNew = true;
    if (await accountExists(near.connection, accountId)) {
        deployNew = false;
    }
    let amount = 0;
    if (deployNew) {
        amount = reader.question('Amount: ');
    }
    const numConfirmations = reader.question('Number of confirmations: ');
    
    masterAccount = await near.account(masterAccountId);

    console.log(`"${masterAccount.accountId}" deploying ${numConfirmations} of ${keys.length} multisig at "${accountId}" (${deployNew ? "New" : "Existing"}) with ${amount}N.`);
    console.log(`List of keys: ${keys}`);

    const confirm = reader.question('Confirm [Y/n]: ');
    if (confirm != 'Y') {
        console.log('Cancelling creation, select Y to continue');
        return;
    }

    await deployMultisig(masterAccount, accountId, keys, amount, numConfirmations, deployNew);
})().catch(e => { console.error(e); process.exit(1); });
