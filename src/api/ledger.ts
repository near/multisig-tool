// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { createClient } from "near-ledger-js";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TransportU2F from "@ledgerhq/hw-transport-u2f";

const createLedgerU2FTransport = async () => {
  const transport = await TransportU2F.create();
  transport.setScrambleKey("NEAR");
  return transport;
};

const createLedgerU2FClient = async () => {
  const transport = await createLedgerU2FTransport();
  const client = await createClient(transport);
  return client;
};

export default createLedgerU2FClient;
