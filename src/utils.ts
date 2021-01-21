import {
  connect,
  Contract,
  keyStores,
  // Account,
  WalletConnection,
  utils,
} from "near-api-js";
// import {encode} from "bs58"
import getConfig from "./config";
import createLedgerU2FClient from "./api/ledger";

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

// const accountExists = async (connection:any, accountId:any) => {
//   try {
//     const account = new Account(connection, accountId);
//     await account.state();
//     return true;
//   } catch (error) {
//     if (!error.message.includes('does not exist while viewing')) {
//       throw error;
//     }
//     return false;
//   }
// }

// const parseAmount = (amount: any) => {
//   try {
//     return utils.format.parseNearAmount(amount.replaceAll(",", ""));
//   } catch (error) {
//     alert(`Failed to parse amount ${amount}`);
//     throw error;
//   }
// }

const getKeys = (): [{ publicKey: string; path: string }] => {
  const keys = window.localStorage.getItem("keys");
  return keys ? JSON.parse(keys) : [];
};

const setKeys = (keys: any) => {
  window.localStorage.setItem("keys", JSON.stringify(keys));
};

// const findPath = async (accessKeys: any) => {
//   const keys = getKeys();
//   for (let i = 0; i < keys.length; ++i) {
//     const publicKey = `ed25519:${encode(Buffer.from(keys[i].publicKey))}`;
//     console.log(accessKeys, publicKey, accessKeys.includes(publicKey));
//     if (accessKeys.includes(publicKey)) {
//       console.log({ publicKey, path: keys[i].path });
//       return { publicKey, path: keys[i].path };
//     }
//   }
//   return { publicKey: null, path: null };
// }

export const addPath = async (path: string) => {
  const keys = getKeys();
  try {
    const client = await createLedgerU2FClient();
    const publicKey = await client.getPublicKey(path);
    console.log(path, publicKey);

    keys.push({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      publicKey,
      path,
    });
    setKeys(keys);
  } catch (error) {
    console.log(error);
  }
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

  const accounts = await Promise.all(
    accountIds.map(async (acc) => {
      let result;
      try {
        const account = await window.near.account(acc);
        const state = await account.state();
        if (account) {
          result = {
            accountId: account?.accountId,
            amount: utils.format.formatNearAmount(state?.amount, 2),
          };
        }
      } catch (error) {
        console.log(error);
      }

      return result;
    })
  );

  return accounts.filter(Boolean);
};

const setAccounts = (accountIds: string[]): void => {
  window.localStorage.setItem("accounts", accountIds.join(","));
};

export const addAccount = async (accountId: string) => {
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
