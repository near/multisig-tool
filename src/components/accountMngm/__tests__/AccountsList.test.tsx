import React from "react";
import { render } from "enzyme";
import findByAttr from "../../../helpers/findByAttr";
import AccountsList from "../AccountsList";

const mock = [
  {
    id: "test",
    amount: "123",
  },
];
describe("<AccountsList/>", () => {
  it("render properly", () => {
    const wrapper: any = render(<AccountsList data={mock} />);
    expect(wrapper).toMatchSnapshot();
  });

  it("render props properly", () => {
    const wrapper: any = render(<AccountsList data={mock} />);
    const accountInfo = findByAttr(wrapper, "account-item");
    const shouldEqual = `${mock[0].id}: ${mock[0].amount}`;

    expect(accountInfo.text()).toEqual(shouldEqual);
  });
});
