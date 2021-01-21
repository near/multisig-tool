import React, { FC, ReactElement } from "react";
import { Layout, Button } from "antd";
import { useDispatch, useSelector } from "react-redux";
import { signIn, signOut } from "../../store/auth";
import { getAccountId, getIsSignedIn } from "../../store/selectors/auth";

const { Header } = Layout;

const HeaderComponent: FC = (): ReactElement => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(getIsSignedIn);
  const accountId = useSelector(getAccountId);

  return (
    <Header>
      {(!isLoggedIn || !accountId) && (
        <Button type="primary" onClick={() => dispatch(signIn())}>
          Log in with NEAR wallet
        </Button>
      )}
      {isLoggedIn && accountId && (
        <Button type="primary" onClick={() => dispatch(signOut())}>
          {`Log out (${accountId})`}
        </Button>
      )}
    </Header>
  );
};

export default HeaderComponent;
