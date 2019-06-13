import React from "react";
import { render } from "react-dom";
import { App } from "./app.jsx";
import { setNodeUri } from "oo7-substrate";
require("./denominations");
import "semantic-ui-css/semantic.min.css";

// setNodeUri(['ws://165.22.72.170:9944']) // Temp node without Totem runtime modules
setNodeUri(["ws://localhost:9944"]); // local node
// setNodeUri(["ws://104.248.37.226:16181/"]);
// setNodeUri(['ws://127.0.0.1:9944/', 'wss://substrate-rpc.parity.io/'])

render(<App />, document.getElementById("app"));
