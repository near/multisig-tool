import * as nearAPI from 'near-api-js';
import Mustache from 'mustache';

import * as utils from './utils.js';
import { funcCall, setAccountSigner } from './actions';

async function fetchPools(masterAccount) {
    const result = await masterAccount.connection.provider.sendJsonRpc('validators', [null]);
    const pools = new Set();
    const stakes = new Map();
    result.current_validators.forEach((validator) => {
        pools.add(validator.account_id);
        stakes.set(validator.account_id, validator.stake);
    });
    result.next_validators.forEach((validator) => pools.add(validator.account_id));
    result.current_proposals.forEach((validator) => pools.add(validator.account_id));
    let poolsWithFee = [];
    let promises = []
    pools.forEach((accountId) => {
        promises.push((async () => {
            let stake = nearAPI.utils.format.formatNearAmount(stakes.get(accountId), 2);
            let fee = await masterAccount.viewFunction(accountId, 'get_reward_fee_fraction', {});
            poolsWithFee.push({ poolId: accountId, stake, fee: `${(fee.numerator * 100 / fee.denominator)}%` });
        })());
    });
    await Promise.all(promises);
    return poolsWithFee;
}

async function loadAccountStaking(accountId) {
    let masterAccount = await window.near.account(accountId);
    let pools = await fetchPools(masterAccount);
    const template = document.getElementById('template-staking').innerHTML;
    let staking = [];
    await Promise.all(pools.map(async ({ poolId }) => {
        let totalStaked = await masterAccount.viewFunction(poolId, "get_account_staked_balance", { account_id: accountId });
        let totalUnstaked = await masterAccount.viewFunction(poolId, "get_account_unstaked_balance", { account_id: accountId });
        if (totalStaked != "0" || totalUnstaked != "0") {
            staking.push({ 
                poolId, 
                totalStaked: nearAPI.utils.format.formatNearAmount(totalStaked, 2),
                totalUnstaked: nearAPI.utils.format.formatNearAmount(totalUnstaked, 2),
            });
        }
    }));
    document.getElementById('requests').innerHTML = Mustache.render(template, {
        accountId,
        pools,
        staking
    });
    window.initInputs();
}

async function poolRequest(accountId, poolId, action, args, amount) {
    console.log(`from ${accountId} to ${poolId}.${action}(${JSON.stringify(args)}) with ${amount}N`);
    amount = amount ? utils.parseAmount(amount) : null;
    let masterAccount = await window.near.account(accountId);
    try {
        await setAccountSigner(masterAccount);
        await masterAccount.functionCall(accountId, "add_request", {
            request: {
                receiver_id: poolId,
                actions: [funcCall(action, args, amount)],
            }
        });
    } catch (error) {
        console.error(error);
        alert(error);
    }
    loadAccountStaking(accountId);
}

async function withdrawAll(accountId, poolId) {
    await poolRequest(accountId, poolId, "withdraw_all", {});
}

async function unstakeAll(accountId, poolId) {
    await poolRequest(accountId, poolId, "unstake_all", {});
}

async function depositAndStake(accountId) {
    const poolId = document.querySelector('#select-pool-id').value;
    const amount = document.querySelector('#stake-amount').value;
    await poolRequest(accountId, poolId, "deposit_and_stake", {}, amount);
}

async function unstake(accountId) {
    const poolId = document.querySelector('#select-pool-id').value;
    const amount = document.querySelector('#stake-amount').value;
    await poolRequest(accountId, poolId, "unstake", { amount: utils.parseAmount(amount) });
}

async function stakeWithdraw(accountId) {
    const poolId = document.querySelector('#select-pool-id').value;
    const amount = document.querySelector('#stake-amount').value;
    await poolRequest(accountId, poolId, "withdraw", { amount: utils.parseAmount(amount) });
}

module.exports = {
    loadAccountStaking,
}

window.withdrawAll = withdrawAll;
window.unstakeAll = unstakeAll;
window.depositAndStake = depositAndStake;
window.unstake = unstake;
window.stakeWithdraw = stakeWithdraw;

