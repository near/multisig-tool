export {};

declare global {
  interface Window {
    nearInitPromise: any;
    contract: any;
    accountId: any;
    hash: string;
    near: any;
    walletConnection: {
      isSignedIn: any;
      signOut: any;
      requestSignIn: any;
      account: any;
      getAccountId: any;
    };
  }
}
