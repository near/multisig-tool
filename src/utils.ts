import {
  connect,
  Contract,
  keyStores,
  WalletConnection,
  utils,
} from "near-api-js";
import getConfig from "./config";

const nearConfig = getConfig(process.env.NODE_ENV || "development");

export const init = async () => {
  const connectionBody = {
    ...{ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } },
    ...nearConfig,
  };
  const near = await connect(connectionBody);

  window.near = near;
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

export const login = async () => {
  await window.walletConnection.requestSignIn(nearConfig.contractName);
};

export const loadAccount = async (accountId: string) => {
  let result: Account | undefined;
  try {
    const account = await window.near.account(accountId);
    const state = await account.state();
    if (account) {
      result = {
        id: account?.accountId as string,
        amount: utils.format.formatNearAmount(state?.amount, 2),
      } as Account;
    }
  } catch (error) {
    console.log(error);
  }

  return result;
};

// TODO Decide should we use class
// class AppState {
//   walletConnection: any;
//
//   accountId: string;
//
//   contract: any;
//
//   constructor() {
//     console.log(1);
//     this.walletConnection = null;
//     this.accountId = "";
//     this.contract = "";
//   }
//
//   init = async () => {
//     const connectionBody = {
//       ...{ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } },
//       ...nearConfig,
//     };
//     const near = await connect(connectionBody);
//
//     this.walletConnection = new WalletConnection(near, null);
//     this.accountId = this.walletConnection.getAccountId();
//     this.contract = new Contract(
//       this.walletConnection.account(),
//       nearConfig.contractName,
//       {
//         viewMethods: ["getGreeting"],
//         changeMethods: ["setGreeting"],
//       }
//     );
//   };
//
//   logout = () => {
//     this.walletConnection.signOut();
//     window.location.replace(window.location.origin + window.location.pathname);
//   };
//
//   login = () => {
//     this.walletConnection.requestSignIn(nearConfig.contractName);
//   };
// }
// const appState = new AppState();
//
// export default appState;
