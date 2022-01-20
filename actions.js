import * as nearAPI from 'near-api-js';
import { parseSeedPhrase } from 'near-seed-phrase';

import * as utils from './utils.js';
import {deployLockup} from './lockup.js';
import {createLedgerU2FClient} from './ledger.js'
import sha256 from "js-sha256";

async function setAccountSigner(contract) {
  const accessKeys = await contract.getAccessKeys();

  const seedPhrase = document.querySelector('#seed-phrase').value;
  const seedPath = document.querySelector('#seed-path').value;
  const privateKey = document.querySelector('#private-key').value;

  let keyPair;
  if (privateKey !== '') {
    const _keyPair = nearAPI.utils.KeyPair.fromString(privateKey);
    const publicKeyString = _keyPair.publicKey.toString();
    if (accessKeys.some(({ public_key }) => public_key === publicKeyString)) {
      console.log("Using private key")
      keyPair = _keyPair;
    } else {
      console.log("The public key of the specified private key does not match any of the keys on the contract")
    }
  }

  if (!keyPair && seedPhrase !== '') {
    const { secretKey } = parseSeedPhrase(seedPhrase, seedPath);
    const _keyPair = nearAPI.utils.KeyPair.fromString(secretKey);
    const publicKeyString = _keyPair.publicKey.toString();
    if (accessKeys.some(({ public_key }) => public_key === publicKeyString)) {
      console.log("Using seed phrase key")
      keyPair = _keyPair;
    } else {
      console.log("The public key of the specified seed-phrase-derived key does not match any of the keys on the contract")
    }
  }

  if (keyPair) {
    contract.connection.signer = await nearAPI.InMemorySigner.fromKeyPair(contract.connection.networkId, contract.accountId, keyPair);
    return;
  }

  let {publicKey, path} = await utils.findPath(accessKeys.map(({public_key}) => public_key));
  if (path == null) {
    alert(`Neither Ledger path or raw private key match the keys on the multisig contract. Make sure to add it first in "Keys" section or put the raw private key into the relevant field`);
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
  let lockupAccountIds = document.querySelector('#lockup-account-ids').value.split(/\r?\n/);
  for (let lockupAccountId of lockupAccountIds) {
    if (!await utils.accountExists(window.near.connection, lockupAccountId)) {
      alert(`Account ${lockupAccountId} doesn't exist`);
      continue;
    }
    console.log(`Vesting ${requestKind} for ${lockupAccountId}`);
    const lockupAccount = await window.near.account(lockupAccountId);
    let lockupContract = new nearAPI.Contract(
      lockupAccount,
      lockupAccount.accountId,
      {
        viewMethods: [
          'get_vesting_information',
          'get_termination_status',
        ]
      }
    );
    let lockupVestingInformation = await lockupContract.get_vesting_information();
    
    if (requestKind === "terminate_vesting") {
      if (!('VestingSchedule' in lockupVestingInformation)) {
        alert(`Account ${lockupAccountId} has no public vesting schedule (either it was terminated before, or it is in termination process, or it has private vesting)`)
        continue;
      }
      await contract.functionCall(accountId, 'add_request', {
        request: {
          receiver_id: lockupAccountId,
          actions: [
            funcCall("terminate_vesting", {})
          ]
        }
      });
    } else if (requestKind === "termination_withdraw") {
      if (!('Terminating' in lockupVestingInformation)) {
        alert(`Vesting termination is not initialized on ${lockupAccountId}`)
        continue;
      }
      let lockupTerminationStatus = await lockupContract.get_termination_status();
      if (lockupTerminationStatus === 'VestingTerminatedWithDeficit' || lockupTerminationStatus === 'EverythingUnstaked') {
        await contract.functionCall(accountId, 'add_request', {
          request: {
            receiver_id: lockupAccountId,
            actions: [
              funcCall("termination_prepare_to_withdraw", {})
            ]
          }
        });
        if (lockupTerminationStatus === 'VestingTerminatedWithDeficit') {
          alert(`Account ${lockupAccountId} will the tokens unstaked after confirmation (get back to "Try Withdraw" in 2 days after the confirmation)`)
        } else {
          alert(`Account ${lockupAccountId} will get the tokens withdrawn from the staking pool after confirmation (get back to "Try Withdraw" immediately after the confirmation to withdraw the funds back to foundation)`)
        }
      } else {
        await contract.functionCall(accountId, 'add_request', {
          request: {
            receiver_id: lockupAccountId,
            actions: [
              funcCall("termination_withdraw", {receiver_id: accountId})
            ]
          }
        });
        alert(`Account ${lockupAccountId} will get the tokens withdrawn to foundation and the termination will be completed after confirmation!`)
      }
    }
  }
}

// Copy-paste from near-claims
function dateToNs(dateObj) {
    if (!(dateObj instanceof Date) && typeof dateObj !== 'number') {
        throw new Error(`Must be Date or number, got ${typeof dateObj}: ${dateObj}`);
    }
    if (dateObj instanceof Date) {
        dateObj = dateObj.getTime();
    }
    // Time from getTime is in millis, we need nanos - multiple by 1M.
    return (dateObj * 1000000).toString();
}

// Copy-paste from near-claims `computeVestingHash`
function computeVestingSchedule(authToken, public_key, vesting_start, vesting_end, vesting_cliff) {
    const vestingSchedule = {
        start_timestamp: dateToNs(vesting_start),
        cliff_timestamp: dateToNs(vesting_cliff),
        end_timestamp: dateToNs(vesting_end),
    };
    const salt = Buffer.from(sha256(Buffer.from(authToken + public_key)), 'hex');
    let writer = new nearAPI.utils.serialize.BinaryWriter();
    writer.writeU64(vestingSchedule.start_timestamp);
    writer.writeU64(vestingSchedule.cliff_timestamp);
    writer.writeU64(vestingSchedule.end_timestamp);
    writer.writeU32(salt.length);
    writer.writeBuffer(salt);
    const bytes = writer.toArray();
    vestingHash = Buffer.from(sha256(bytes), 'hex').toString('base64');
    return {
      vestingSchedule,
      salt,
      vestingHash,
    }
}

async function vestingPrivateTermination(contract, requestKind) {
  let accountId = contract.accountId;
  let lockupAccountIds = document.querySelector('#lockup-account-ids').value.split(/\r?\n/);
  let lockupVestingStartDate = new Date(document.querySelector('#lockup-vesting-start-date').value);
  let lockupVestingEndDate = new Date(document.querySelector('#lockup-vesting-end-date').value);
  let lockupVestingCliffDate = new Date(document.querySelector('#lockup-vesting-cliff-date').value);
  let lockupVestingSalt = document.querySelector('#lockup-vesting-salt').value;
  for (let lockupAccountId of lockupAccountIds) {
    if (!await utils.accountExists(window.near.connection, lockupAccountId)) {
      alert(`Account ${lockupAccountId} doesn't exist`);
      continue;
    }
    const lockupAccount = await window.near.account(lockupAccountId);
    console.log(`Vesting ${requestKind} for ${lockupAccountId}`);

    let lockupContract = new nearAPI.Contract(
      lockupAccount,
      lockupAccount.accountId,
      {
        viewMethods: [
          'get_owner_account_id',
          'get_vesting_information',
        ]
      }
    );

    let lockupOwnerAccountId = await lockupContract.get_owner_account_id();
    let vestingInformation = await lockupContract.get_vesting_information();

    function findProperVestingSchedule() {
      // According to near-claims, user might have either specified the owner
      // account id (named or implicit) or a public key (a new implicit account
      // id was automatically created)
      let lockupOwnerInputs = [lockupOwnerAccountId];
      if (lockupOwnerAccountId.length === 64 && !lockupOwnerAccountId.includes('.')) {
        lockupOwnerInputs.push(nearAPI.utils.serialize.base_encode(Buffer.from(lockupOwnerAccountId, 'hex')));
      }

      for (let lockupOwnerInputId = 0; lockupOwnerInputId < lockupOwnerInputs.length; ++lockupOwnerInputId) {
        let lockupOwnerInput = lockupOwnerInputs[lockupOwnerInputId];
        const salt = Buffer.from(sha256(Buffer.from(lockupVestingSalt + lockupOwnerInput)), 'hex').toString('base64');

        for (let timezone = -12; timezone <= 12; timezone += 1) {
          let lockupVestingStartDateCopy = new Date(lockupVestingStartDate);
          lockupVestingStartDateCopy.setHours(lockupVestingStartDate.getHours() + timezone);
          let lockupVestingEndDateCopy = new Date(lockupVestingEndDate);
          lockupVestingEndDateCopy.setHours(lockupVestingEndDate.getHours() + timezone);
          let lockupVestingCliffDateCopy = new Date(lockupVestingCliffDate);
          lockupVestingCliffDateCopy.setHours(lockupVestingCliffDate.getHours() + timezone);
          let { vestingSchedule, salt, vestingHash } = computeVestingSchedule(
            lockupVestingSalt,
            lockupOwnerInput,
            lockupVestingStartDateCopy,
            lockupVestingEndDateCopy,
            lockupVestingCliffDateCopy
          )
          if (vestingInformation.VestingHash === vestingHash) {
            return {
              vesting_schedule_with_salt: {
                vesting_schedule: vestingSchedule,
                salt: salt.toString('base64'),
              }
            }
          }
        }
      }
    }

    let args = findProperVestingSchedule();

    if (!args) {
      alert("The private vesting schedule does not match the hash stored in the lockup contract. Check the date format (YYYY-MM-DD), the dates, and the auth token");
      return;
    }

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
    } else if (requestKind === "terminate_vesting" || requestKind === "termination_unstake" || requestKind === "termination_withdraw") {
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
