import React from "react";
import { Sidebar, Menu } from "semantic-ui-react";
import SystemStatus from "./SystemStatus";

const SystemStatusBar = props => {
  return (
    <Sidebar
      as={Menu}
      className="statusbar-bottom"
      visible={props.visible}
      amination="push"
      direction="bottom"
      width="very thin"
      inverted
    >
      <Menu.Item>
        <SystemStatus items={props.items} />
      </Menu.Item>
    </Sidebar>
  );
};

export default SystemStatusBar;
