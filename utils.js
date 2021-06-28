import * as nearAPI from 'near-api-js';

import sha256 from 'js-sha256';
import { encode, decode } from 'bs58';

const LOCKUP_BASE = 'lockup.near';

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

function parseAmount(amount) {
    try {
        return nearAPI.utils.format.parseNearAmount(amount.replace(/,/g, ''));
    } catch (error) {
        alert(`Failed to parse amount ${amount}`);
        throw error;
    }    
}


function getKeys() {
    let keys = window.localStorage.getItem('keys');
    return keys ? JSON.parse(keys) : [];
}

function setKeys(keys) {
    window.localStorage.setItem('keys', JSON.stringify(keys));
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

function accountToLockup(masterAccountId, accountId) {
    return `${sha256(Buffer.from(accountId)).toString('hex').slice(0, 40)}.${masterAccountId}`;
}

async function lockupStatus(account, lockupAccountId) {
    let lockupBalance = await account.viewFunction(lockupAccountId, 'get_balance');
    let lockupTransferEnabled = await account.viewFunction(lockupAccountId, 'are_transfers_enabled');
    return {
        lockupBalance,
        lockupTransferEnabled
    };
}

module.exports = {
    accountExists,
    parseAmount,
    getKeys,
    setKeys,
    findPath,
    accountToLockup,
    lockupStatus,
    LOCKUP_BASE,
}
