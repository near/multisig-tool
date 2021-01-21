import { createAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { login } from "../utils";

export const signIn = createAsyncThunk("auth/login", async () => {
  await login();
});

export const signOut = createAction("auth/logout");
export const checkAuthentication = createAction("auth/check");

const initialState: {
  isLoading: boolean;
  isSignedIn: boolean;
  accountId?: string;
} = {
  isLoading: false,
  isSignedIn: false,
};

export default createSlice({
  name: "auth",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(signIn.pending, (state) => {
      state.isLoading = true;
      state.isSignedIn = false;
    });
    builder.addCase(signIn.fulfilled, (state) => {
      state.isLoading = false;
      if (window.walletConnection.isSignedIn()) {
        state.accountId = window.walletConnection.getAccountId();
        state.isSignedIn = true;
      }
    });
    builder.addCase(signIn.rejected, (state) => {
      state.isLoading = false;
      state.isSignedIn = false;
    });
    builder.addCase(signOut, (state) => {
      window.walletConnection.signOut();
      state.isSignedIn = false;
      state.accountId = undefined;
    });
    builder.addCase(checkAuthentication, (state) => {
      state.isSignedIn = false;
      state.accountId = undefined;
      if (window.walletConnection && window.walletConnection.isSignedIn()) {
        state.isSignedIn = true;
        state.accountId = window.walletConnection.getAccountId();
      }
    });
  },
}).reducer;
