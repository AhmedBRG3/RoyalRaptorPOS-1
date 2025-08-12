import { useEffect, useState } from 'react';
import { fetchSessions } from '../api';
import Topbar from '../components/Topbar';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchSessions();
      setSessions(list);
    } catch (e) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 16 }}>
      <Topbar />
      <h2>Sessions</h2>
      {loading ? <p>Loading…</p> : error ? <p style={{ color: 'red' }}>{error}</p> : (
        <div style={{ display: 'grid', gap: 16 }}>
          {sessions.map((s) => (
            <div key={s._id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{s.user?.username}</div>
                  <div style={{ color: '#666', fontSize: 12 }}>Start: {new Date(s.startTime).toLocaleString()} • End: {s.endTime ? new Date(s.endTime).toLocaleString() : 'Open'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div>Starting: ${Number(s.startingBalance).toFixed(2)}</div>
                  <div>Ending: ${Number(s.endingBalance).toFixed(2)}</div>
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #eee' }}>Sale ID</th>
                    <th style={{ textAlign: 'right', padding: 6, borderBottom: '1px solid #eee' }}>Final Total</th>
                    <th style={{ textAlign: 'left', padding: 6, borderBottom: '1px solid #eee' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(s.sales || []).map((sale) => (
                    <tr key={sale._id}>
                      <td style={{ padding: 6 }}>{sale._id}</td>
                      <td style={{ padding: 6, textAlign: 'right' }}>${Number(sale.finalTotal).toFixed(2)}</td>
                      <td style={{ padding: 6 }}>{sale.refunded ? 'Refunded' : 'Completed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


