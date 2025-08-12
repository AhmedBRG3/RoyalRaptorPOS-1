import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { login } from "../api";

export default function Login() {
  const [form, setForm] = useState({
    username: "",
    password: "",
    startingBalance: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await login(form.username, form.password, form.startingBalance);
      navigate(from, { replace: true });
    } catch (e) {
      setError("Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-6">Login</h2>

      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          required
          className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          placeholder="Starting balance"
          type="number"
          min="0"
          step="0.01"
          value={form.startingBalance}
          onChange={(e) =>
            setForm({ ...form, startingBalance: e.target.value })
          }
          required
          className="border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Logging in…" : "Login"}
        </button>
      </form>

      {error && <p className="text-red-600 mt-3">{error}</p>}

      <p className="mt-4 text-sm text-gray-600">
        No account?{" "}
        <Link to="/register" className="text-blue-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
