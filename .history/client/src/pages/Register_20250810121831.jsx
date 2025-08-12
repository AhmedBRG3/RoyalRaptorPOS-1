import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await register(form.username, form.password);
      navigate('/', { replace: true });
    } catch (e) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h2>Register</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <input placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit" disabled={loading}>{loading ? 'Registering…' : 'Register'}</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <p style={{ marginTop: 12 }}>Have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}


