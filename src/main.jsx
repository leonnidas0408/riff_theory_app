import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AdminAcessos from "./components/pages/AdminAcessos";
import "./assets/admin.css";

const isAdminRoute = window.location.pathname.replace(/\/$/, "") === "/admin/acessos";

ReactDOM.createRoot(document.body).render(isAdminRoute ? <AdminAcessos /> : <App />);
