import React, { FC, ReactElement } from "react";
import { Layout } from "antd";
import Header from "./components/header";
import AccountMngm from "./components/accountMngm";
import { isUserLoggedIn } from "./utils";

const App: FC = (): ReactElement => {
  return (
    <Layout>
      <Header />
      {isUserLoggedIn() && <AccountMngm />}
    </Layout>
  );
};

export default App;
