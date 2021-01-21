import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import auth from "./auth";
import accounts from "./accounts";

const persistConfig = {
  key: "multisig",
  storage,
  whitelist: ["accounts"],
};

const persistedReducer = persistReducer(
  persistConfig,
  combineReducers({
    auth,
    accounts,
  })
);

const store = configureStore({
  reducer: persistedReducer,
});

export default store;
export const persistor = persistStore(store);
