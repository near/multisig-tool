const nearAPI = require('near-api-js');
const homedir = require('os').homedir();
const path = require('path');
const fs = require('fs');
const reader = require("readline-sync");

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

async function deployMultisig(masterAccount, accountId, keys, amount, numConfirmations) {
    const code = fs.readFileSync(MULTISIG_WASM_PATH);
    const args = { "num_confirmations": parseInt(numConfirmations) };
    const methodNames = ["add_request", "delete_request", "confirm"];
    let actions = [
        nearAPI.transactions.createAccount(),
        nearAPI.transactions.transfer(nearAPI.utils.format.parseNearAmount(amount)),
        nearAPI.transactions.deployContract(code)];
    actions = actions.concat(keys.map((key) => nearAPI.transactions.addKey(
        nearAPI.utils.PublicKey.from(key),
        nearAPI.transactions.functionCallAccessKey(accountId, methodNames, null)
    )));
    actions.push(nearAPI.transactions.functionCall('new', args, '100000000000000'));
    await masterAccount.signAndSendTransaction(accountId, actions);
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
    const amount = reader.question('Amount: ');
    const numConfirmations = reader.question('Number of confirmations: ');
    
    masterAccount = await near.account(masterAccountId);

    console.log(`"${masterAccount.accountId}" deploying ${numConfirmations} of ${keys.length} multisig at "${accountId}" with ${amount}N.`);
    console.log(`List of keys: ${keys}`);

    const confirm = reader.question('Confirm [Y/n]: ');
    if (confirm != 'Y' && confirm != '') {
        console.log('Cancelling creation');
        return;
    }

    await deployMultisig(masterAccount, accountId, keys, amount, numConfirmations);
})().catch(e => { console.error(e); process.exit(1); });
