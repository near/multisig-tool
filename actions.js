import * as nearAPI from 'near-api-js';

import * as utils from './utils.js';
import {deployLockup} from './lockup.js';
import {createLedgerU2FClient} from './ledger.js'
import sha256 from "js-sha256";

async function setAccountSigner(contract) {
  const accessKeys = await contract.getAccessKeys();
  console.log(accessKeys);
  let {publicKey, path} = await utils.findPath(accessKeys.map(({public_key}) => public_key));
  if (path == null) {
    alert(`Ledger path not found. Make sure to add it first in "Keys" section`);
    throw new Error(`No key found`);
  }
  console.log(`Found ${publicKey} at ${path}`);

  const client = await createLedgerU2FClient();
  publicKey = nearAPI.utils.PublicKey.fromString(publicKey);
  contract.connection.signer = {
    async getPublicKey() {
      return publicKey;
    },
    async signMessage(message) {
      const signature = await client.sign(message, path);
      return {signature, publicKey};
    }
  };
}

function funcCall(methodName, args, deposit, gas) {
  return {
    "type": "FunctionCall",
    "method_name": methodName,
    "args": btoa(JSON.stringify(args ? args : {})),
    "deposit": deposit ? deposit : '0',
    "gas": gas ? gas : '100000000000000'
  };
}

async function addKey(contract, requestOnly) {
  let accountId = contract.accountId;
  let publicKeyStr = document.querySelector('#new-key').value;
  // check it's a valid key.
  let publicKey = nearAPI.utils.PublicKey.fromString(publicKeyStr);
  console.log(`Add ${publicKey.toString()} key`);
  let methodNames = ['add_request', 'add_request_and_confirm', 'confirm', 'delete_request'];
  if (requestOnly) {
    methodNames = ['add_request'];
  }
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
            method_names: methodNames,
          }
        }
      ]
    }
  })
}

async function lockupEnableTransfer(contract) {
  const accountId = contract.accountId;
  const lockupAccountId = utils.accountToLockup(utils.LOCKUP_BASE, accountId);
  await contract.functionCall(accountId, 'add_request', {
    request: {
      receiver_id: lockupAccountId,
      actions: [
        funcCall("check_transfers_vote", {})
      ]
    }
  });
}

async function transfer(contract, isLockup) {
  let accountId = contract.accountId;
  let receiverId = document.querySelector('#transfer-receiver').value;
  if (!await utils.accountExists(window.near.connection, receiverId)) {
    alert(`Account ${receiverId} doesn't exist`);
    return;
  }
  let amount = document.querySelector('#transfer-amount').value;
  console.log(`Send from ${accountId} to ${receiverId} ${amount}`);
  amount = utils.parseAmount(amount);
  if (isLockup) {
    const lockupAccountId = utils.accountToLockup(utils.LOCKUP_BASE, accountId);
    await contract.functionCall(accountId, 'add_request', {
      request: {
        receiver_id: lockupAccountId,
        actions: [
          funcCall("transfer", {receiver_id: receiverId})
        ]
      }
    });
  } else {
    await contract.functionCall(accountId, 'add_request', {
      request: {
        receiver_id: receiverId,
        actions: [
          {type: "Transfer", amount}
        ]
      }
    });
  }
}

async function setNumConfirmations(contract) {
  let accountId = contract.accountId;
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
}

async function vestingTermination(contract, requestKind) {
  let accountId = contract.accountId;
  let lockupAccountId = document.querySelector('#lockup-account-id').value;
  if (!await utils.accountExists(window.near.connection, lockupAccountId)) {
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
}

function dateToEpoch(date) {
  return Math.floor(date.getTime() / 1000.0 * 1000000)
}

async function vestingPrivateTermination(contract, requestKind) {
  let accountId = contract.accountId;
  let lockupAccountId = document.querySelector('#lockup-account-id').value;
  let lockupVestingStartDate = dateToEpoch(new Date(document.querySelector('#lockup-vesting-start-date').value));
  let lockupVestingEndDate = dateToEpoch(new Date(document.querySelector('#lockup-vesting-end-date').value));
  let lockupVestingCliffDate = dateToEpoch(new Date(document.querySelector('#lockup-vesting-cliff-date').value));
  let lockupVestingSalt = document.querySelector('#lockup-vesting-salt').value;
  if (!await utils.accountExists(window.near.connection, lockupAccountId)) {
    alert(`Account ${lockupAccountId} doesn't exist`);
    return;
  }
  const lockupAccount = await window.near.account(lockupAccountId);
  console.log(`Vesting ${requestKind} for ${lockupAccountId}`);

  let publicKeyStr = document.querySelector('#new-key').value;
  let publicKey = nearAPI.utils.PublicKey.fromString(publicKeyStr);

  const salt = Buffer.from(sha256(Buffer.from(lockupVestingSalt + publicKey)), 'hex').toString('base64');

  let args = {
    vesting_schedule_with_salt:
      {
        vesting_schedule:
          {
            start_timestamp: lockupVestingStartDate.toString(),
            cliff_timestamp: lockupVestingCliffDate.toString(),
            end_timestamp: lockupVestingEndDate.toString()
          },
        salt
      }
  }
  //console.log(args);
  //args = Buffer.from(JSON.stringify(args)).toString('base64');
  //console.log(args);

  try {
    await contract.functionCall(accountId, 'add_request', {
      request: {
        receiver_id: lockupAccountId,
        actions: [funcCall("terminate_vesting", args)],
      }
    });
  } catch (e) {
    console.log(e);
  }

}

async function setupMultisig(contract) {

}

async function setupLockup(contract) {
  let accountId = document.querySelector('#create-lockup-account-id').value;
  let amount = document.querySelector('#create-lockup-amount').value;
  let duration = document.querySelector('#create-lockup-duration').value;
  let allowStaking = document.querySelector('#create-lockup-staking').value;
  if (!await utils.accountExists(window.near.connection, accountId)) {
    alert(`${accountId} doesn't exit. Create it first.`);
    return;
  }
  amount = utils.parseAmount(amount);
  try {
    duration = parseInt(duration);
  } catch (error) {
    alert(`Failed to parse duration ${duration}`);
    return;
  }
  // Days to nano seconds.
  duration = duration * 60 * 60 * 24 * 1000 * 1000 * 1000;
  await deployLockup(contract, accountId, amount, duration, allowStaking);
}

async function submitRequest(accountId, requestKind) {
  let contract = await window.near.account(accountId);
  try {
    await setAccountSigner(contract);
    if (requestKind === "add_key" || requestKind === "add_request_key") {
      await addKey(contract, requestKind === "add_request_key");
    } else if (requestKind === "transfer" || requestKind === "transfer_lockup") {
      await transfer(contract, requestKind === "transfer_lockup");
    } else if (requestKind === "num_confirmations") {
      await setNumConfirmations(contract);
    } else if (requestKind === "terminate_vesting" || requestKind === "termination_withdraw") {
      await vestingTermination(contract, requestKind);
    } else if (requestKind === "terminate_private_vesting") {
      await vestingPrivateTermination(contract, requestKind);
    } else if (requestKind === "multisig") {
      await setupMultisig(contract);
    } else if (requestKind === "lockup") {
      await setupLockup(contract);
    } else {
      alert(`Unkonwn request kind: ${requestKind}`);
    }
  } catch (error) {
    console.log(error);
    alert(error);
  }
}

module.exports = {
  setAccountSigner,
  submitRequest,
  funcCall
}
