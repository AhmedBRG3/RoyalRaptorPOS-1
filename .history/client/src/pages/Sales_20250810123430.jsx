import { useEffect, useState } from 'react';
import { fetchSales, refundSale } from '../api';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isAdmin = (() => {
    try { return !!JSON.parse(localStorage.getItem('user'))?.admin; } catch { return false; }
  })();

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchSales();
      setSales(list);
    } catch (e) {
      setError('Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onRefund = async (id) => {
    if (!confirm('Refund this sale?')) return;
    try {
      await refundSale(id);
      await load();
    } catch (e) {
      alert('Refund failed');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Sales</h2>
      {loading ? (
        <p>Loading…</p>
      ) : error ? (
        <p style={{ color: 'red' }}>{error}</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>User</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc' }}>Subtotal</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc' }}>VAT</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc' }}>Service Fee</th>
              <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #ccc' }}>Final</th>
              <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ccc' }}>Status</th>
              <th style={{ padding: 8, borderBottom: '1px solid #ccc' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
              {sales.map((s) => (
              <tr key={s._id}>
                <td style={{ padding: 8 }}>{s.user?.username || '-'}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${s.total.toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${(s.vat || 0).toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${(s.serviceFee || 0).toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${s.finalTotal.toFixed(2)}</td>
                <td style={{ padding: 8 }}>{s.refunded ? 'Refunded' : 'Completed'}</td>
                <td style={{ padding: 8 }}>
                  {isAdmin && !s.refunded && (
                    <button onClick={() => onRefund(s._id)}>Refund</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}


