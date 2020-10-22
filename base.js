

class MultisigBase {
    constructor(masterAccount, receiverId) {
        this.masterAccount = masterAccount;
        this.receiverId = receiverId;
        this.actions = [];
    }

    transfer = (amount) => {
        this.actions.push({ type: "Transfer", amount });
        return this;
    }

    functionCall = (methodName, args, deposit, gas) => {
        this.actions.push({
            "type": "FunctionCall",
            "method_name": methodName,
            "args": btoa(JSON.stringify(args)),
            "deposit": deposit ? deposit : '0',
            "gas": gas ? gas : '100000000000000'
        });
        return this;
    }

    finish = async () => {
        console.log(`Creating request to ${this.receiverId}: ${this.actions}`);
        return contract.functionCall(accountId, 'add_request', {
            request: {
                receiver_id: this.receiverId,
                actions: this.actions
            }
        });
    }

}

export { MultisigBase };
