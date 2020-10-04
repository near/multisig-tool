import 'regenerator-runtime'

import * as nearAPI from 'near-api-js';
// import BN from 'bn.js';
// import sha256 from 'js-sha256';
import {encode, decode} from 'bs58';
import Mustache from 'mustache';

import {createLedgerU2FClient} from './ledger.js'

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

async function setAccountSigner(contract) {
  const accessKeys = await contract.getAccessKeys();
  console.log(accessKeys);
  let {publicKey, path} = await findPath(accessKeys.map(({public_key}) => public_key));
  if (path == null) {
    alert(`Ledger path not found. Make sure to add it first in "Keys" section`);
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
      return {signature, publicKey};
    }
  }

  contract.connection.signer = signer;
}

async function confirmRequest(accountId, requestId) {
  console.log(`Confirm ${accountId} request ${requestId}`);
  let contract = await window.near.account(accountId);
  try {
    await setAccountSigner(contract);
    await contract.functionCall(accountId, 'confirm', {request_id: requestId}, '150000000000000');
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
    await setAccountSigner(contract);
    await contract.functionCall(accountId, 'delete_request', {request_id: requestId});
  } catch (error) {
    console.log(error);
    alert(error);
  }
  loadAccountDetails(accountId);
}

function funcCall(methodName, args, deposit, gas) {
  return {
    "type": "FunctionCall",
    "method_name": methodName,
    "args": btoa(JSON.stringify(args)),
    "deposit": deposit ? deposit : '0',
    "gas": gas ? gas : '100000000000000'
  };
}

async function submitRequest(accountId, requestKind) {
  let contract = await window.near.account(accountId);
  try {
    await setAccountSigner(contract);
    if (requestKind === "add_key") {
      let publicKeyStr = document.querySelector('#new-key').value;
      // check it's a valid key.
      let publicKey = nearAPI.utils.PublicKey.fromString(publicKeyStr);
      console.log(`Add ${publicKey.toString()} key`);
      await contract.functionCall(accountId, 'add_request', {
        request: {
          receiver_id: accountId,
          actions: [
            {
              type: "AddKey",
              public_key: publicKey.toString().replace('ed25519:', ''),
              permission: {
                allowance: null,
                receiver_id: accountId,
                method_names: ['add_request', 'add_request_and_confirm', 'confirm', 'delete_request'],
              }
            }
          ]
        }
      })
    } else if (requestKind === "transfer") {
      let receiverId = document.querySelector('#transfer-receiver').value;
      if (!await accountExists(window.near.connection, receiverId)) {
        alert(`Account ${receiverId} doesn't exist`);
        return;
      }
      let amount = document.querySelector('#transfer-amount').value;
      console.log(`Send from ${accountId} to ${receiverId} ${amount}`);
      await contract.functionCall(accountId, 'add_request', {
        request: {
          receiver_id: receiverId,
          actions: [
            {type: "Transfer", amount: nearAPI.utils.format.parseNearAmount(amount)}
          ]
        }
      });
    } else if (requestKind === "num_confirmations") {
      let numConfirmations = document.querySelector('#num-confirmations').value;
      try {
        numConfirmations = parseInt(numConfirmations);
      } catch (error) {
        alert(error);
        return;
      }
      const accessKeys = await contract.getAccessKeys();
      console.log(`Change ${accountId} to ${numConfirmations} of ${accessKeys.length} multisig`);
      if (numConfirmations + 1 > accessKeys.length) {
        alert(`Dangerously high number of confirmations. Set lower or add more keys`);
        return;
      }
      if (numConfirmations < 1) {
        alert('Min num confirmations is 1');
        return;
      }
      await contract.functionCall(accountId, 'add_request', {
        request: {
          receiver_id: accountId,
          actions: [
            {type: "SetNumConfirmations", num_confirmations: numConfirmations}
          ]
        }
      });
    } else if (requestKind === "terminate_vesting" || requestKind === "termination_withdraw") {
      let lockupAccountId = document.querySelector('#lockup-account-id').value;
      if (!await accountExists(window.near.connection, lockupAccountId)) {
        alert(`Account ${lockupAccountId} doesn't exist`);
        return;
      }
      const lockupAccount = await window.near.account(lockupAccountId);
      console.log(`Vesting ${requestKind} for ${lockupAccountId}`);
      if (requestKind === "terminate_vesting") {
        await contract.functionCall(accountId, 'add_request', {
          request: {
            receiver_id: lockupAccountId,
            actions: [
              funcCall("terminate_vesting", {})
            ]
          }
        });
      } else if (requestKind === "termination_withdraw") {
        await contract.functionCall(accountId, 'add_request', {
          request: {
            receiver_id: lockupAccountId,
            actions: [
              funcCall("termination_withdraw", {receiver_id: accountId})
            ]
          }
        });
      }
    } else {
      alert(`Unkonwn request kind: ${requestKind}`);
    }
  } catch (error) {
    console.log(error);
    alert(error);
  }

  await loadAccountDetails(accountId);
}

async function loadKeys() {
  let keys = getKeys();
  const template = document.getElementById('template-keys').innerHTML;
  document.getElementById('keys').innerHTML = Mustache.render(template, {
    keys: keys.map(({publicKey, path}) => ({
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
      console.log({publicKey, path: keys[i].path});
      return {publicKey, path: keys[i].path};
    }
  }
  return {publicKey: null, path: null};
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
    document.getElementById('keysError').innerHTML = error;
    console.log(error);
  }
}

window.nearAPI = nearAPI;
window.addAccount = addAccount;
window.confirmRequest = confirmRequest;
window.deleteRequest = deleteRequest;
window.submitRequest = submitRequest;
window.addPath = addPath;

window.onhashchange = () => {
  if (window.location.hash) {
    loadAccountDetails(window.location.hash.slice(1));
  }
}
