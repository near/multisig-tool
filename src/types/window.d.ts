export {};

declare global {
  interface Window {
    nearInitPromise: object;
    contract: any;
    accountId: object;
    walletConnection: {
      isSignedIn: any;
      signOut: any;
      requestSignIn: any;
      account: any;
      getAccountId: any;
    };
  }
}
