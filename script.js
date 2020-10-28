import 'regenerator-runtime'

import * as nearAPI from 'near-api-js';
// import BN from 'bn.js';
// import sha256 from 'js-sha256';
import {encode, decode} from 'bs58';
import Mustache from 'mustache';

import { createLedgerU2FClient } from './ledger.js'
import * as actions from './actions.js'
import { loadAccountStaking } from './staking.js'
import * as utils from './utils.js';

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
      await display(window.location.hash.slice(1));
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

async function loadAccounts() {
  let accountIds = getAccounts();
  console.log(`Accounts: ${accountIds}`);
  let accounts = [];
  let path = document.querySelector('#path').value;
  for (let i = 0; i < accountIds.length; ++i) {
    try {
      const account = await window.near.account(accountIds[i]);
      const state = await account.state();
      accounts.push({
        accountId: accountIds[i],
        amount: nearAPI.utils.format.formatNearAmount(state.amount, 2),
        //active: (accountIds[i] === path) ? 'active' : '',
      });
    } catch (error) {
      console.log(error);
    }
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

async function display(path) {
  let accountId = path, kind = 'details';
  if (path.includes('/')) {
    [accountId, kind] = path.split('/');
  }
  switch (kind) {
    case 'staking':
      await loadAccountStaking(accountId);
      break;
    case 'details':
    default:
      await loadAccountDetails(accountId);
      break;
  }
}

async function loadAccountDetails(accountId) {
  document.getElementById('requests').innerHTML = '<div class="text-center"><div class="spinner-border" role="status">\n' +
    '        <span class="sr-only">Loading...</span>\n' +
    '      </div></div><br>';
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
    let details = await contract.viewFunction(accountId, "get_request", {request_id: request_ids[i]});
    let confirms = await contract.viewFunction(accountId, "get_confirmations", {request_id: request_ids[i]});
    let repr = [];
    for (let i = 0; i < details.actions.length; ++i) {
      let action = details.actions[i];
      switch (action.type) {
        case 'Transfer':
          repr.push(`Transfer ${nearAPI.utils.format.formatNearAmount(action.amount, 2)}N`);
          break;
        case 'FunctionCall':
          repr.push(`Call ${action.method_name}(${atob(action.args)}), attach ${nearAPI.utils.format.formatNearAmount(action.deposit, 2)}N with ${parseInt(action.gas) / 1000000000000}Tg`);
          break;
        case 'SetNumConfirmations':
          repr.push(`Set number of confirmations = ${action.num_confirmations}`);
          break;
        default:
          repr.push(JSON.stringify(action));
          break;
      }
    }
    requests.push({
      request_id: request_ids[i],
      receiver_id: details.receiver_id,
      actions: JSON.stringify(details.actions),
      repr,
      numConfirms: confirms.length,
      confirms: confirms,
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
  document.querySelectorAll('.form-outline').forEach((formOutline) => {
    new window.mdb.Input(formOutline).init();
  });
}

async function confirmRequest(accountId, requestId) {
  console.log(`Confirm ${accountId} request ${requestId}`);
  let contract = await window.near.account(accountId);
  try {
    await actions.setAccountSigner(contract);
    await contract.functionCall(accountId, 'confirm', {request_id: requestId}, '300000000000000');
  } catch (error) {
    console.log(error);
    alert(error);
  }
  loadAccountDetails(accountId);
}

async function deleteRequest(accountId, requestId) {
  console.log(`Delete ${accountId} request ${requestId}`);
  let contract = await window.near.account(accountId);
  try {
    await actions.setAccountSigner(contract);
    await contract.functionCall(accountId, 'delete_request', {request_id: requestId});
  } catch (error) {
    console.log(error);
    alert(error);
  }
  loadAccountDetails(accountId);
}

async function submitRequest(accountId, requestKind) {
  await actions.submitRequest(accountId, requestKind);
  await loadAccountDetails(accountId);
}

async function loadKeys() {
  let keys = utils.getKeys();
  const template = document.getElementById('template-keys').innerHTML;
  document.getElementById('keys').innerHTML = Mustache.render(template, {
    keys: keys.map(({publicKey, path}) => ({
      publicKey: encode(Buffer.from(publicKey)),
      path
    })),
  });
}

async function addPath() {
  const btn = document.querySelector('#addPathBtn');
  btn.disabled = true;
  btn.innerHTML='<div class="spinner-grow spinner-grow-sm" role="status">\n' +
    '  <span class="sr-only">Loading...</span>\n' +
    '</div>&nbsp;&nbsp;&nbsp;Checking ledger';
  document.getElementById('keysError').innerHTML = '';
  let keys = utils.getKeys();
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
    await loadKeys();
    btn.innerHTML = "add";
    btn.disabled = false;
  } catch (error) {
    document.getElementById('keysError').innerHTML = error;
    console.log(error);
    btn.innerHTML = "add";
    btn.disabled = false;
  }
}

window.nearAPI = nearAPI;
window.addAccount = addAccount;
window.confirmRequest = confirmRequest;
window.deleteRequest = deleteRequest;
window.submitRequest = submitRequest;
window.addPath = addPath;

window.onhashchange = () => {
  console.log(window.location.hash);
  if (window.location.hash) {
    display(window.location.hash.slice(1));
  }
}
