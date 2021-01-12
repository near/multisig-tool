import React, { FC, ReactElement, useState } from "react";
import { Input, Button, Select, Row, Col } from "antd";

const { Option } = Select;
interface Props {
  addAccount: (arg: string) => void;
}

const AddAccount: FC<Props> = ({ addAccount }): ReactElement => {
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
      <Row justify="center" gutter={[24, 24]}>
        <Col span={6}>
          <Input
            addonAfter={selectAfter}
            placeholder="Enter Account"
            onChange={handleOnChange}
          />
        </Col>
        <Col>
          <Button type="primary" onClick={handleAddAccount}>
            Add Account
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default AddAccount;
