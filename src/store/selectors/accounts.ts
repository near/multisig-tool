import { createSelector } from "reselect";
import { accountsAdapter } from "../accounts";
import rootState from "..";

type RootState = ReturnType<typeof rootState.getState>;

export const getState = (state: RootState) => state;

const accountsSelector = accountsAdapter.getSelectors<any>(
  (state) => state.accounts
);

export const getAccountsList = createSelector(getState, (state) =>
  accountsSelector.selectAll(state)
);
