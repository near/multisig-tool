import { createClient } from 'near-ledger-js';
//import TransportU2F from "@ledgerhq/hw-transport-webhid";
/* deprecated, redo with new library, untested */
import TransportU2F from "@ledgerhq/hw-transport-u2f";

async function createLedgerU2FTransport() {
    let transport = await TransportU2F.create();
    transport.setScrambleKey("NEAR");
    return transport;
}

async function createLedgerU2FClient() {
    const transport = await createLedgerU2FTransport();
    const client = await createClient(transport);
    return client;
}

export { createLedgerU2FClient };

