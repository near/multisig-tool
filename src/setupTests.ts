import React from "react";
import { configure, shallow, render, mount } from "enzyme";
import { createSerializer } from "enzyme-to-json";
import Adapter from "enzyme-adapter-react-16";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
expect.addSnapshotSerializer(createSerializer({ mode: "deep" }));

configure({ adapter: new Adapter() });

global.React = React;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.shallow = shallow;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.render = render;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.mount = mount;
