import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/fraunces/500.css";
import "./index.css";
import { App } from "./App.jsx";
import { applyTokens } from "./garden/tokens.js";

registerSW({ immediate: true });
applyTokens(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
