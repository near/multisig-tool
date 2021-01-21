import React, { FC, useState } from "react";
import { Input, Button, Row, Col } from "antd";
import { addPath } from "../../utils";

const Connection: FC = () => {
  const [path, setPath] = useState("");
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPath(event.target.value);
  };
  const onSubmit = async () => {
    await addPath(path);
  };
  return (
    <Row justify="center" gutter={[24, 24]}>
      <Col span={6}>
        <Input placeholder="Add path to ledger" onChange={handleOnChange} />
      </Col>
      <Col>
        <Button type="primary" onClick={onSubmit}>
          Connect by ledger
        </Button>
      </Col>
    </Row>
  );
};

export default Connection;
