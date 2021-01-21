import React, { FC, ReactElement } from "react";
import { List } from "antd";

interface Props {
  data: Account[];
}

const AccountsList: FC<Props> = ({ data }): ReactElement => {
  return (
    <List
      header={<h3>Accounts list</h3>}
      bordered
      dataSource={data}
      renderItem={(item) => (
        <List.Item>
          <span data-test="account-item">{`${item.id}: ${item.amount}`}</span>
        </List.Item>
      )}
    />
  );
};

export default AccountsList;
