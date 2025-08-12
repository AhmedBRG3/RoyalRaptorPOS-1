import React from "react";

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

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-black backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left - Logo */}
        <div className="flex items-center gap-3">
          <div className="text-lg font-extrabold tracking-tight text-white">
            🦅 Royal Raptor POS
          </div>

          {showSearch && (
            <form
              onSubmit={onSearchSubmit}
              className="flex items-center border rounded-full overflow-hidden shadow-sm"
            >
              <input
                value={searchValue}
                onChange={onSearchChange}
                placeholder="Search products…"
                className="h-9 px-4 text-sm focus:outline-none min-w-[180px]"
              />
              <button
                type="submit"
                className="h-9 px-4 bg-blue-500 hover:bg-blue-600 text-white text-sm transition-colors"
              >
                Search
              </button>
            </form>
          )}
        </div>

        {/* Right - User & Navigation */}
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm text-gray-600 pr-3 border-r border-gray-300">
            {username}
          </span>

          <NavButton href="/">Home</NavButton>
          <NavButton href="/sales">Sales</NavButton>

          {isAdmin && (
            <>
              <NavButton href="/users">Users</NavButton>
              <NavButton href="/sessions">Sessions</NavButton>
              <NavButton href="/manageProducts">Products</NavButton>
            </>
          )}

          <button
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg shadow-sm transition-colors"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function NavButton({ href, children }) {
  return (
    <button
      onClick={() => (window.location.href = href)}
      className="text-white hover:text-black hover:bg-white px-4 py-2 text-sm rounded-lg transition-colors"
    >
      {children}
    </button>
  );
}
