import 'regenerator-runtime'

import * as nearAPI from 'near-api-js';
// import BN from 'bn.js';
// import sha256 from 'js-sha256';
import { encode, decode } from 'bs58';
import Mustache from 'mustache';

import { createLedgerU2FClient } from './ledger.js'

const options = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    networkId: 'mainnet',
    deps: {}
};

window.onload = () => {
    (async () => {
        window.near = await nearAPI.connect(options);
        await loadKeys();
        await loadAccounts();
        if (window.location.hash) {
            await loadAccountDetails(window.location.hash.slice(1));
        }
    })().catch(e => console.error(e));
};

function getAccounts() {
    let accountIds = window.localStorage.getItem('accounts');
    return accountIds ? accountIds.split(',') : [];
}

function setAccounts(accountIds) {
    window.localStorage.setItem('accounts', accountIds.join(','));
}

function getKeys() {
    let keys = window.localStorage.getItem('keys');
    return keys ? JSON.parse(keys) : [];
}

function setKeys(keys) {
    window.localStorage.setItem('keys', JSON.stringify(keys));
}

async function loadAccounts() {
    let accountIds = getAccounts();
    console.log(`Accounts: ${accountIds}`);
    let accounts = [];
    for (let i = 0; i < accountIds.length; ++i) {
        const account = await window.near.account(accountIds[i]);
        const state = await account.state();
        accounts.push({ 
            accountId: accountIds[i],
            amount: nearAPI.utils.format.formatNearAmount(state.amount, 2)
        });
    }
    console.log(accounts);
    const template = document.getElementById('template1').innerHTML;
    document.getElementById('accounts').innerHTML = Mustache.render(template, {
        accounts
    });
}

async function addAccount() {
    let accountId = document.querySelector('#account').value;
    console.log(`Adding ${accountId}`);
    let accountIds = getAccounts();
    if (!accountIds.includes(accountId)) {
        accountIds.push(accountId);
        setAccounts(accountIds);
    }
    await loadAccounts();
    window.hash = accountId;
}

async function loadAccountDetails(accountId) {
    document.getElementById('requests').innerHTML = 'loading';
    let accountIds = getAccounts();
    if (!accountIds.includes(accountId)) {
        accountIds.push(accountId);
        setAccounts(accountIds);
        await loadAccounts();
    }
    let contract = await window.near.account(accountId);
    const numConfirmations = await contract.viewFunction(accountId, "get_num_confirmations", {});
    const accessKeys = await contract.getAccessKeys();
    console.log(accessKeys);
    const request_ids = await contract.viewFunction(accountId, "list_request_ids", {});
    let requests = [];
    for (let i = 0; i < request_ids.length; ++i) {
        let details = await contract.viewFunction(accountId, "get_request", { request_id: request_ids[i] });
        requests.push({ 
            request_id: request_ids[i], 
            receiver_id: details.receiver_id,
            actions: JSON.stringify(details.actions),
         });
    }
    console.log(requests);
    const template = document.getElementById('template2').innerHTML;
    document.getElementById('requests').innerHTML = Mustache.render(template, {
        accountId,
        accessKeys,
        numConfirmations,
        requests
    });
}

async function setAccountSigner(contract) {
    const accessKeys = await contract.getAccessKeys();
    console.log(accessKeys);
    let { publicKey, path } = await findPath(accessKeys.map(({ public_key }) => public_key));
    if (path == null) {
        alert(`Ledger path not found. Make sure to add it first`);
        throw new Error(`No key found`);
    }
    console.log(`Found ${publicKey} at ${path}`);

    const client = await createLedgerU2FClient();
    publicKey = nearAPI.utils.PublicKey.fromString(publicKey);
    let signer = {
        async getPublicKey() {
            return publicKey;
        },
        async signMessage(message) {
            const signature = await client.sign(message, path);
            return { signature, publicKey };
        }
    }

    contract.connection.signer = signer;
}

async function confirmRequest(accountId, requestId) {
    console.log(`Confirm ${accountId} request ${requestId}`);
    let contract = await window.near.account(accountId);
    await setAccountSigner(contract);
    await contract.functionCall(accountId, 'confirm', { request_id: requestId });
}

async function submitRequest(accountId, requestKind) {
    let contract = await window.near.account(accountId);
    await setAccountSigner(contract);
    if (requestKind == "add_key") {

    } else if (requestKind == "transfer") {
        let receiverId = document.querySelector('#transfer-receiver').value;
        let amount = document.querySelector('#transfer-amount').value;
        console.log(`Send from ${accountId} to ${receiverId} ${amount}`);
        await contract.functionCall(accountId, 'add_request', { request: {
            receiver_id: receiverId,
            actions: [
                { type: "Transfer", amount: nearAPI.utils.format.parseNearAmount(amount) }
            ]
        } });
    }
}

async function loadKeys() {
    let keys = getKeys();
    const template = document.getElementById('template-keys').innerHTML;
    document.getElementById('keys').innerHTML = Mustache.render(template, {
        keys: keys.map(({ publicKey, path }) => ({
            publicKey: encode(Buffer.from(publicKey)),
            path
        })),
    });
}

async function findPath(accessKeys) {
    let keys = getKeys();
    for (let i = 0; i < keys.length; ++i) {
        let publicKey = 'ed25519:' + encode(Buffer.from(keys[i].publicKey));
        console.log(accessKeys, publicKey, accessKeys.includes(publicKey));
        if (accessKeys.includes(publicKey)) {
            console.log({ publicKey, path: keys[i].path });
            return { publicKey, path: keys[i].path };
        }
    }
    return { publicKey: null, path: null };
}

async function addPath() {
    let keys = getKeys();
    let path = document.querySelector('#path').value;
    try {
        const client = await createLedgerU2FClient();
        let publicKey = await client.getPublicKey(path);
        console.log(path, publicKey);
        keys.push({
            publicKey,
            path
        });
        setKeys(keys);
        loadKeys();
    } catch (error) {
        document.getElementById('keys').innerHTML = error;
        console.log(error);
    }
}

window.nearAPI = nearAPI;
window.addAccount = addAccount;
window.confirmRequest = confirmRequest;
window.submitRequest = submitRequest;
window.addPath = addPath;

window.onhashchange = () => {
    if (window.location.hash) {
        loadAccountDetails(window.location.hash.slice(1));
    }
}