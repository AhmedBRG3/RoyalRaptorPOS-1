import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api";
import { User, Key, UserPlus } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "", masterPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await register(form.username, form.password, form.masterPassword);
      navigate("/", { replace: true });
    } catch (e) {
      setError("Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h2 className="text-2xl font-bold mb-6">Register</h2>

      <form onSubmit={onSubmit} className="grid gap-3">
        <div className="relative">
          <User className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
            className="border rounded-md px-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
        <div className="relative">
          <Key className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            className="border rounded-md px-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
        <div className="relative">
          <Key className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            placeholder="Master Password"
            type="password"
            value={form.masterPassword}
            onChange={(e) => setForm({ ...form, masterPassword: e.target.value })}
            required
            className="border rounded-md px-8 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 justify-center"
        >
          <UserPlus className="w-4 h-4" />
          {loading ? "Registering…" : "Register"}
        </button>
      </form>

      {error && <p className="text-red-600 mt-3">{error}</p>}

      <p className="mt-4 text-sm text-gray-600">
        Have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
