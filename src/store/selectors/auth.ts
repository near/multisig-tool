import { createSelector } from "reselect";
import rootState from "..";

type RootState = ReturnType<typeof rootState.getState>;

export const getState = (state: RootState) => state.auth;

// get sign-in status
export const getIsSignedIn = createSelector(
  getState,
  (state) => state.isSignedIn
);

// get signed account id
export const getAccountId = createSelector(
  getState,
  (state) => state.accountId
);
