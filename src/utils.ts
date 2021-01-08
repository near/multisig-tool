import { connect, Contract, keyStores, WalletConnection } from "near-api-js";
import getConfig from "./config";

const nearConfig = getConfig(process.env.NODE_ENV || "development");

export const init = async () => {
  const connectionBody = {
    ...{ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } },
    ...nearConfig,
  };
  const near = await connect(connectionBody);

  window.walletConnection = new WalletConnection(near, null);
  window.accountId = window.walletConnection.getAccountId();
  window.contract = new Contract(
    window.walletConnection.account(),
    nearConfig.contractName,
    {
      viewMethods: ["getGreeting"],
      changeMethods: ["setGreeting"],
    }
  );
};

export const logout = () => {
  window.walletConnection.signOut();
  window.location.replace(window.location.origin + window.location.pathname);
};

export const login = () => {
  window.walletConnection.requestSignIn(nearConfig.contractName);
};
