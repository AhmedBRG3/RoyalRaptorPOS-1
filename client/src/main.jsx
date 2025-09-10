import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import RequireAuth from "./components/RequireAuth.jsx";
import Sales from "./pages/Sales.jsx";
import UsersAdmin from "./pages/UsersAdmin.jsx";
import RequireAdmin from "./components/RequireAdmin.jsx";
import Sessions from "./pages/Sessions.jsx";
import ProductsAdmin from "./pages/ProductsAdmin.jsx";
import Finance from "./pages/Finance.jsx";
import RequireFinance from "./components/RequireFinance.jsx";
import HomePage from "./pages/Home.jsx";
import BusSolutions from "./pages/BusSolutions.jsx"
import Marketing from "./pages/Marketing.jsx"
import BusSetup from "./pages/BusSetup.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/home12" element={<HomePage />} />
        <Route path="/setup" element={<BusSetup />} />
        <Route path="/marketing" element={<Marketing />} />
        <Route path="/solutions" element={<BusSolutions />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/sales"
          element={
            <RequireAuth>
              <Sales />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <RequireAdmin>
                <UsersAdmin />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/manageProducts"
          element={
            <RequireAuth>
              <ProductsAdmin />
            </RequireAuth>
          }
        />

        <Route
          path="/sessions"
          element={
            <RequireAuth>
              <RequireAdmin>
                <Sessions />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/finance"
          element={
            <RequireAuth>
              <RequireFinance>
                <Finance />
              </RequireFinance>
            </RequireAuth>
          }
        />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <App />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
