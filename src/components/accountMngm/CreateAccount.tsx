import React, { FC, ReactElement, useState } from "react";
import { Input, Button, Row, Col } from "antd";
import { createAccount } from "../../utils";

const CreateAccount: FC = (): ReactElement => {
  const [state, setState] = useState<{
    accountName: string;
    publicKey: string;
  }>({
    accountName: "",
    publicKey: "",
  });

  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setState({ ...state, [name]: value });
  };
  const handleCreateAccount = async () => {
    const { accountName, publicKey } = state;
    await createAccount(accountName, publicKey);
  };

  return (
    <>
      <Row justify="center" gutter={[24, 24]}>
        <Col span={6}>
          <Input
            placeholder="Account name"
            name="accountName"
            value={state.accountName}
            onChange={handleOnChange}
          />
        </Col>
        <Col span={6}>
          <Input
            placeholder="Public key"
            name="publicKey"
            value={state.publicKey}
            onChange={handleOnChange}
          />
        </Col>
        <Col>
          <Button type="primary" onClick={handleCreateAccount}>
            Create Account
          </Button>
        </Col>
      </Row>
    </>
  );
};

export default CreateAccount;
