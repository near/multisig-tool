import * as nearAPI from 'near-api-js';

async function deployMultisig(masterAccount, accountId, keys, amount, numConfirmations, deployNew) {
    const code = fs.readFileSync(MULTISIG_WASM_PATH);
    const args = { "num_confirmations": parseInt(numConfirmations) };
    const methodNames = ["add_request", "delete_request", "confirm"];
    let actions = [];
    if (deployNew) {
        actions.push(nearAPI.transactions.createAccount());
    }
    if (amount > 0) {
        actions.push(nearAPI.transactions.transfer(nearAPI.utils.format.parseNearAmount(amount)));
    }
    actions.push(nearAPI.transactions.deployContract(code));
    actions = actions.concat(keys.map((key) => nearAPI.transactions.addKey(
        nearAPI.utils.PublicKey.from(key),
        nearAPI.transactions.functionCallAccessKey(accountId, methodNames, null)
    )));
    actions.push(nearAPI.transactions.functionCall('new', args, '100000000000000'));
    await masterAccount.signAndSendTransaction(accountId, actions);
}

module.exports = { deployMultisig };