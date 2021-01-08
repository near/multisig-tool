import React, { FC, ReactElement } from "react";
import { Layout } from "antd";
import Header from "./components/header";

const App: FC = (): ReactElement => {
  return (
    <Layout>
      <Header />
    </Layout>
  );
};

export default App;
