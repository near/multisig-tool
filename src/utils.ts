import {
  connect,
  Contract,
  keyStores,
  WalletConnection,
  Account,
  utils,
} from "near-api-js";
import BN from "bn.js";
import getConfig from "./config";

const nearConfig = getConfig(process.env.NODE_ENV || "development");

export const init = async (): Promise<void> => {
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

export const login = () => {
  window.walletConnection.requestSignIn(nearConfig.contractName);
};

const getAccounts = () => {
  const accountIds = localStorage.getItem("accounts");
  return accountIds ? accountIds.split(",") : [];
};

export const loadAccounts = async () => {
  const accountIds = getAccounts();

  return Promise.all(
    accountIds.map(async (acc) => {
      let result;
      try {
        const account = await window.near.account(acc);
        const state = await account.state();

        result = {
          accountId: account.accountId,
          amount: utils.format.formatNearAmount(state.amount, 2),
        };
      } catch (error) {
        console.log(error);
      }

      return result;
    })
  );
};

const setAccounts = (accountIds: string[]): void => {
  window.localStorage.setItem("accounts", accountIds.join(","));
};

export const addAccount = async (accountId: string): Promise<void> => {
  const accountIds = getAccounts();
  if (!accountIds.includes(accountId)) {
    accountIds.push(accountId);
    setAccounts(accountIds);
  }
  await loadAccounts();
  window.hash = accountId;
};

export const isUserLoggedIn = (): boolean => {
  const auth = JSON.parse(localStorage.getItem("null_wallet_auth_key") || "{}");

  return Boolean(auth?.accountId);
};

export const createAccount = async (
  name: string,
  publicKey: string
): Promise<void> => {
  try {
    const account = new Account(window.near.connection, window.accountId);
    const num = new BN("1");
    console.log(window.near, window);
    const a = await account.createAccount(name, publicKey, num);
    console.log(a);
  } catch (error) {
    console.log(error);
  }
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
