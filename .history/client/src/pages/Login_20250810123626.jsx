import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login } from '../api';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '', startingBalance: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await login(form.username, form.password, form.startingBalance);
      navigate(from, { replace: true });
    } catch (e) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h2>Login</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <input placeholder="Starting balance" type="number" min="0" step="0.01" value={form.startingBalance} onChange={(e) => setForm({ ...form, startingBalance: e.target.value })} required />
        <button type="submit" disabled={loading}>{loading ? 'Logging in…' : 'Login'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: 12 }}>No account? <Link to="/register">Register</Link></p>
    </div>
  );
}


