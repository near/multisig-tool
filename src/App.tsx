import React, { FC, ReactElement, useEffect } from "react";
import { Layout } from "antd";
import { useDispatch, useSelector } from "react-redux";
import Header from "./components/header";
import { checkAuthentication } from "./store/auth";
import { getIsSignedIn } from "./store/selectors/auth";
import AccountMngm from "./components/accountMngm";

const App: FC = (): ReactElement => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuthentication());
  }, [dispatch]);

  const isSignedIn = useSelector(getIsSignedIn);

  return (
    <Layout>
      <Header />
      {isSignedIn && <AccountMngm />}
    </Layout>
  );
};

export default App;
