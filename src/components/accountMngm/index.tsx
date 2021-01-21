import React, { FC, ReactElement, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addAccount, loadAccounts } from "../../store/accounts";
import { getAccountsList } from "../../store/selectors/accounts";
import AccountsList from "./AccountsList";
import AddAccount from "./AddAccount";

const AccountMngm: FC = (): ReactElement => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(loadAccounts);
  }, [dispatch]);

  const accounts = useSelector(getAccountsList);

  return (
    <>
      <AddAccount addAccount={(value: string) => dispatch(addAccount(value))} />
      <AccountsList data={accounts} />
    </>
  );
};

export default AccountMngm;
