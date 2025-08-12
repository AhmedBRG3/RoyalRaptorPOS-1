import React from 'react';

export default function Topbar({
  showSearch = false,
  searchValue = '',
  onSearchChange,
  onSearchSubmit,
  onManageProducts,
  onLogout,
}) {
    let user = null;
    try { user = JSON.parse(localStorage.getItem('user')); } catch { }
    const isAdmin = !!user?.admin;
    const username = user?.username || '';

  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-200">
      <div className="flex items-center justify-between gap-3 px-4 h-14">
        <div className="font-extrabold tracking-tight">RoyalRaptorPOS</div>

        {showSearch ? (
          <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
            <input
              value={searchValue}
              onChange={onSearchChange}
              placeholder="Search products…"
              className="h-8 px-3 rounded-full border border-gray-300 min-w-[160px] focus:outline-none"
            />
            <button type="submit" className="h-8 px-3 rounded-full border border-gray-300 bg-gray-50">Search</button>
          </form>
        ) : <div />}

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">{username}</span>
          <button className="btn" onClick={() => (window.location.href = '/sales')}>Sales</button>
          {isAdmin && (
            <>
              <button className="btn" onClick={() => (window.location.href = '/users')}>Users</button>
              <button className="btn" onClick={() => (window.location.href = '/sessions')}>Sessions</button>
              {onManageProducts && (
                <button className="btn" onClick={onManageProducts}>Manage Products</button>
              )}
            </>
          )}
          {onLogout && <button className="btn" onClick={onLogout}>Logout</button>}
        </div>
      </div>
    </div>
  );
}


