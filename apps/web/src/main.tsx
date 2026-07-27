import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

document.documentElement.dataset.font = "inter";
document.documentElement.dataset.radius = "pill";

createRoot(rootElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
