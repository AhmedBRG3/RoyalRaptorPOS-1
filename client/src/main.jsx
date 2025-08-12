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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
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
              <RequireAdmin>
                <ProductsAdmin />
              </RequireAdmin>
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
