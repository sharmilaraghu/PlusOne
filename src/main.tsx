import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "@fontsource/libre-caslon-display";
import "@fontsource/libre-caslon-text/400.css";
import "@fontsource/libre-caslon-text/400-italic.css";
import "@fontsource-variable/assistant";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
if (!convexUrl) {
  // Surface a readable error instead of a blank page when the env var is missing.
  document.getElementById("root")!.innerHTML =
    '<p style="font-family:sans-serif;padding:2rem">Missing <code>VITE_CONVEX_URL</code>. Run <code>npx convex dev</code> once to create <code>.env.local</code>.</p>';
} else {
  const convex = new ConvexReactClient(convexUrl);
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ConvexAuthProvider>
    </React.StrictMode>,
  );
}
