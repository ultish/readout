import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { registerHazardTiles } from "./hazardTiles";
import "./index.css";

registerHazardTiles();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
