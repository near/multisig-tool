import 'regenerator-runtime'

import * as nearAPI from 'near-api-js';
// import BN from 'bn.js';
// import sha256 from 'js-sha256';
// import { encode, decode } from 'bs58';
import Mustache from 'mustache';

const options = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    networkId: 'mainnet',
    deps: {}
};

window.onload = () => {
    (async () => {
        window.near = await nearAPI.connect(options);
        await loadAccounts();
        if (window.location.hash) {
            await loadAccountDetails(window.location.hash.slice(1));
        }
    })().catch(e => console.error(e));
};

function getAccounts() {
    let accountIds = window.localStorage.getItem('accounts');
    if (accountIds) {
        return accountIds.split(',');
    }
    return [];
}

function setAccounts(accountIds) {
    console.log(accountIds);
    window.localStorage.setItem('accounts', accountIds.join(','));
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

function confirmRequest(accountId, requestId) {
    console.log(`Confirm ${accountId} request ${requestId}`);
    alert(`Doesn't work yet`);
}

function submitRequest(requestKind) {
    alert(`Doesn't work yet`);
    if (requestKind == "add_key") {

    }
}

window.nearAPI = nearAPI;
window.addAccount = addAccount;
window.confirmRequest = confirmRequest;
window.submitRequest = submitRequest;

window.onhashchange = () => {
    if (window.location.hash) {
        loadAccountDetails(window.location.hash.slice(1));
    }
}