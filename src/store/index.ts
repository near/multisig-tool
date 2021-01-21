import { combineReducers, configureStore } from "@reduxjs/toolkit";
import auth from "./auth";

const store = configureStore({
  reducer: combineReducers({
    auth,
  }),
});

export default store;
