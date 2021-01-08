import React, { FC, ReactElement } from "react";
import { Layout } from "antd";
import Header from "./components/header";
import AddAccount from "./components/accountMngm/AddAccount";

const App: FC = (): ReactElement => {
  return (
    <Layout>
      <Header />
      <AddAccount />
    </Layout>
  );
};

export default App;
