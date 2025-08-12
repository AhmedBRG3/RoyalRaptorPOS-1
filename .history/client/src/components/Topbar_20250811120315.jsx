import React, { useEffect, useRef } from "react";
import { LogOut, Home, ShoppingCart, Users, Package, UserCircle2, Search } from "lucide-react";
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

  // Receipt printer / barcode scanner detection
  useEffect(() => {
    let keystrokeCount = 0;
    let timer = null;
    let buffer = "";

    const handleKeyDown = (e) => {
      keystrokeCount++;

      if (!timer) {
        timer = setTimeout(() => {
          keystrokeCount = 0;
          buffer = "";
          timer = null;
        }, 500);
      }

      if (keystrokeCount > 6) {
        e.preventDefault();
        console.log("Blocked fast input:", e.key);

        if (e.key === "Enter" && buffer.trim() !== "") {
          console.log("Triggering search with:", buffer);

          // Update the search bar value
          onSearchChange({ target: { value: buffer } });

          // Trigger the search submit
          if (typeof onSearchSubmit === "function") {
            onSearchSubmit();
          }

          buffer = "";
          keystrokeCount = 0;
          clearTimeout(timer);
          timer = null;
        } else if (e.key !== "Enter") {
          buffer += e.key;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onSearchChange, onSearchSubmit]);

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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2
