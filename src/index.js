import React from "react";
import { render } from "react-dom";
import "./index.css";
import { App } from "./app.jsx";
import { setNodeUri } from "oo7-substrate";
require("./denominations");
import "semantic-ui-css/semantic.min.css";

setNodeUri(["ws://104.248.37.226:16181/"]);
// setNodeUri(['ws://127.0.0.1:9944/', 'wss://substrate-rpc.parity.io/'])

render(<App />, document.getElementById("app"));
