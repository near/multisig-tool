export {};

declare global {
  interface Window {
    nearInitPromise: any;
    contract: any;
    accountId: any;
    walletConnection: {
      isSignedIn: any;
      signOut: any;
      requestSignIn: any;
      account: any;
      getAccountId: any;
    };
  }
}
