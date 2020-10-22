import * as nearAPI from 'near-api-js';
const sha256 = require('js-sha256');

import * as utils from './utils.js';
import MultisigBase from './base.js';

const TRANSFER_POLL_ACCOUNT_ID = 'transfer-vote.near';
const WHITELIST_ACCOUNT_ID = 'lockup-whitelist.near';
const LOCKUP_CONTRACT_URL = 'https://raw.githubusercontent.com/near/core-contracts/master/lockup/res/lockup_contract.wasm';

function dateToNs(dateString) {
    // Time from getTime is in millis, we need nanos - multiple by 1M.
    return ((new Date(dateString)).getTime() * 1000000).toString();
}

function accountToLockup(masterAccountId, accountId) {
    return `${sha256(Buffer.from(accountId)).toString('hex').slice(0, 40)}.${masterAccountId}`;
}

async function deployLockup(masterAccount, accountId, amount, releaseDuration, allowStaking) {
    const contractId = accountToLockup(masterAccount.accountId, accountId);
    if (await utils.accountExists(masterAccount.connection, contractId)) {
        console.log(`${contractId} for ${accountId} already exists.`);
        alert(`${contractId} lockup for ${accountId} already exists.`);
        return false;
    }

    args = {
        owner_account_id: accountId,
        lockup_duration: "0",
        lockup_timestamp: "0",
        transfers_information: { TransfersDisabled: { transfer_poll_account_id: TRANSFER_POLL_ACCOUNT_ID } },
        vesting_schedule: null,
        release_duration: releaseDuration.toString(),
        staking_pool_whitelist_account_id: allowStaking ? WHITELIST_ACCOUNT_ID : '',
        foundation_account_id: null,
    };
    console.log(`Deploy ${contractId} lockup with ${amount}:`);
    console.log(`${JSON.stringify(args, null, 4)}`);

    if (!window.lockupContract) {
        const response = await fetch(LOCKUP_CONTRACT_URL);
        window.lockupContract = await response.body.getReader().read();
    }

    const actions = [
        nearAPI.transactions.transfer(amount),
        nearAPI.transactions.deployContract(window.lockupContract),
        nearAPI.transactions.functionCall('new', args, '100000000000000')
    ];
    // if (!DRY_RUN) {
    //     await masterAccount.signAndSendTransaction(contractId, actions);
    // }
    console.log(JSON.stringify(actions));
}

export {
    deployLockup,
    accountToLockup
};
