import { createSelector } from "reselect";
import rootState from "..";

type RootState = ReturnType<typeof rootState.getState>;

export const getState = (state: RootState) => state.auth;

export const getIsSignedIn = createSelector(
  getState,
  (state) => state.isSignedIn
);

export const getAccountId = createSelector(
  getState,
  (state) => state.accountId
);
