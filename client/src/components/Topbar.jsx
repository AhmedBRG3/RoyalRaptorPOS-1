import React from "react";
import {
  LogOut,
  Home,
  ShoppingCart,
  Users,
  Package,
  UserCircle2,
  Search,
  X,
} from "lucide-react";
import { closeSession } from "../api";

export default function Topbar({
  showSearch = false,
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
}) {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {}
  const isAdmin = !!user?.admin;
  const username = user?.username || "";

  const logout = async () => {
    await closeSession();
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-black backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left - Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
            🦅 Royal Raptor POS
          </div>

          {showSearch && (
            <form
              onSubmit={onSearchSubmit}
              className="relative flex items-center bg-white rounded-full shadow-sm focus-within:ring-2 focus-within:ring-blue-400 transition-all"
              style={{ minWidth: 220 }}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />

              <input
                value={searchValue}
                onChange={onSearchChange}
                placeholder="Search products…"
                className="h-10 pl-10 pr-8 text-sm rounded-full focus:outline-none bg-transparent w-full"
                style={{ minWidth: 180 }}
              />

              {searchValue && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange({ target: { value: "" } }); // clear
                  }}
                  className="absolute right-16 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4 mr-2" />
                </button>
              )}

              <button
                type="submit"
                className="h-8 px-2 mx-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-full transition-colors flex items-center gap-1 shadow"
              >
                Search
              </button>
            </form>
          )}
        </div>

        {/* Right - User & Navigation */}
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm text-gray-600 pr-3 border-r border-gray-300 flex items-center gap-1">
            <UserCircle2 className="w-4 h-4 mr-1" />
            {username}
          </span>

          <NavButton href="/" icon={<Home className="w-4 h-4 mr-1" />}>
            Home
          </NavButton>
          <NavButton
            href="/sales"
            icon={<ShoppingCart className="w-4 h-4 mr-1" />}
          >
            Sales
          </NavButton>

          {isAdmin && (
            <>
              <NavButton
                href="/users"
                icon={<Users className="w-4 h-4 mr-1" />}
              >
                Users
              </NavButton>
              <NavButton
                href="/sessions"
                icon={<UserCircle2 className="w-4 h-4 mr-1" />}
              >
                Sessions
              </NavButton>
              <NavButton
                href="/manageProducts"
                icon={<Package className="w-4 h-4 mr-1" />}
              >
                Products
              </NavButton>
            </>
          )}

          <button
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-1"
            onClick={logout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ href, children, icon }) {
  const isActive = window.location.pathname === href;

  return (
    <button
      onClick={() => {
        if (!isActive) {
          window.location.href = href;
        }
      }}
      disabled={isActive}
      className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-1
        ${
          isActive
            ? "bg-white text-black cursor-default pointer-events-none"
            : "text-white hover:text-black hover:bg-white"
        }`}
    >
      {icon}
      {children}
    </button>
  );
}
