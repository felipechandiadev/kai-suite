import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AgentLogPanel } from "./features/agent-log/AgentLogPanel";
import "./globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error('Missing root element with id "root"');
}

const params = new URLSearchParams(window.location.search);
const logsOnly = params.get("view") === "logs";

createRoot(root).render(
  <StrictMode>{logsOnly ? <AgentLogPanel standalone /> : <App />}</StrictMode>,
);
