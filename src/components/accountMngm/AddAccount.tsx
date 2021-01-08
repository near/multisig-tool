import React, { FC, ReactElement, useState } from "react";
import { Input, Button, Select } from "antd";
import { addAccount } from "../../utils";

const { Option } = Select;

const AddAccount: FC = (): ReactElement => {
  const [account, setAccount] = useState("");
  const [net, setNet] = useState(".near");

  const handleAddAccount = async () => {
    await addAccount(account + net);
  };
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setAccount(event.target.value);
  };
  const handleSelect = (value: string): void => {
    setNet(value);
  };

  const selectAfter = (
    <Select
      defaultValue=".near"
      className="select-after"
      onSelect={handleSelect}
    >
      <Option value=".near">.near</Option>
      <Option value=".testnet">.testnet</Option>
    </Select>
  );

  return (
    <>
      <Input
        addonAfter={selectAfter}
        placeholder="Enter Account"
        onChange={handleOnChange}
      />
      <Button type="primary" onClick={handleAddAccount}>
        Add Account
      </Button>
    </>
  );
};

export default AddAccount;
