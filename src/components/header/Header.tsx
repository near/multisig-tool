import React, { FC, ReactElement } from "react";
import { Layout, Button } from "antd";
import { login, logout, isUserLoggedIn } from "../../utils";

const { Header } = Layout;

const HeaderComponent: FC = (): ReactElement => {
  const auth = JSON.parse(localStorage.getItem("null_wallet_auth_key") || "{}");
  const isLoggedIn = isUserLoggedIn();

  return (
    <Header>
      {!isLoggedIn && (
        <Button type="primary" onClick={login}>
          Log in with NEAR wallet
        </Button>
      )}
      {isLoggedIn && (
        <Button type="primary" onClick={logout}>
          {`Log out (${auth?.accountId})`}
        </Button>
      )}
    </Header>
  );
};

export default HeaderComponent;
