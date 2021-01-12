import React, { FC, ReactElement, useEffect, useState } from "react";
import { addAccount, loadAccounts } from "../../utils";
import AccountsList from "./AccountsList";
import AddAccount from "./AddAccount";

const AccountMngm: FC = (): ReactElement => {
  const [data, setData] = useState<
    ({ accountId: string; amount: string } | undefined)[]
  >([]);

  useEffect(() => {
    loadAccounts().then((res) => {
      setData(res);
    });
  }, []);

  const handleAddAccount = async (value: string) => {
    await addAccount(value);
    const accounts = await loadAccounts();
    setData(accounts);
  };

  return (
    <>
      <AddAccount addAccount={handleAddAccount} />
      <AccountsList data={data} />
    </>
  );
};

export default AccountMngm;
