// @refresh reload
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { MetaProvider } from "@solidjs/meta";
import "./app.css";

export default function App() {
  return (
    <MetaProvider>
      <Router
        root={props => (
          <Suspense>{props.children}</Suspense>
        )}
      >
        <FileRoutes />
      </Router>
    </MetaProvider>
  );
}
