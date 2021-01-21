import {
  createAsyncThunk,
  createEntityAdapter,
  createSlice,
} from "@reduxjs/toolkit";
import { loadAccount } from "../utils";
import { signOut } from "./auth";

export const accountsAdapter = createEntityAdapter<Account>({
  selectId: (account) => account.id,
  sortComparer: (a, b) => parseInt(a.amount, 10) - parseInt(b.amount, 10),
});

export const loadAccounts = createAsyncThunk(
  "accounts/fetch",
  async (_, { getState }) => {
    const list = (getState() as any).accounts as Account[];
    const accountIds = list.map((item) => item.id);
    const accounts = await Promise.all(
      accountIds.map(async (acc) => loadAccount(acc))
    );
    return accounts;
  }
);

export const addAccount = createAsyncThunk(
  "accounts/add",
  async (accountId: string) => {
    const account = await loadAccount(accountId);
    return account;
  }
);

export default createSlice({
  name: "accounts",
  initialState: accountsAdapter.getInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(loadAccounts.fulfilled, (state, { payload }) => {
      const accounts = payload.filter((account) => !!account) as Account[];
      accountsAdapter.setAll(state, accounts);
    });
    builder.addCase(addAccount.fulfilled, (state, { payload }) => {
      if (payload) {
        accountsAdapter.addOne(state, payload);
      }
    });
    builder.addCase(signOut, (state) => {
      accountsAdapter.removeAll(state);
    });
  },
}).reducer;
