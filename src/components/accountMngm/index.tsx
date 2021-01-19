import React, { FC, ReactElement, useEffect, useState } from "react";
import { addAccount, loadAccounts } from "../../utils";
import AccountsList from "./AccountsList";
import AddAccount from "./AddAccount";
import CreateAccount from "./CreateAccount";

const AccountMngm: FC = (): ReactElement => {
  const [data, setData] = useState<
    ({ accountId: string; amount: string } | undefined)[]
  >([]);

  useEffect(() => {
    loadAccounts().then((accounts) => {
      if (accounts) {
        setData(accounts);
      }
    });
  }, []);

  const handleAddAccount = async (value: string) => {
    await addAccount(value);
    const accounts = await loadAccounts();

    if (accounts) {
      setData(accounts);
    }
  };

  return (
    <>
      <AddAccount addAccount={handleAddAccount} />
      <AccountsList data={data} />
      <CreateAccount />
    </>
  );
};

export default AccountMngm;
