import React, { FC, ReactElement } from "react";
import { Layout, Button } from "antd";
import { login, logout } from "../../utils";

const { Header } = Layout;

const HeaderComponent: FC = (): ReactElement => {
  const auth = JSON.parse(localStorage.getItem("null_wallet_auth_key") || "{}");
  const isLoggedIn = auth?.accountId;

  return (
    <Header>
      {!isLoggedIn && (
        <Button type="primary" onClick={login}>
          Log in with NEAR wallet
        </Button>
      )}
      {isLoggedIn && (
        <Button type="primary" onClick={logout}>
          {`Log out (${isLoggedIn})`}
        </Button>
      )}
    </Header>
  );
};

export default HeaderComponent;
