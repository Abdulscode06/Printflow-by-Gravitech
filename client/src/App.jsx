import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import IntakeTerminal from './components/IntakeTerminal.jsx';
import OrderStream from './components/OrderStream.jsx';

const API = '/api';

export default function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successId, setSuccessId] = useState(null);

  // Fetch all existing orders on mount
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOrders(await res.json());
    } catch (e) {
      console.error('fetchOrders:', e);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Submit raw order text
  const handleSubmit = useCallback(async (rawInput) => {
    setLoading(true);
    setError(null);
    setSuccessId(null);

    // 15-second client-side timeout mirror
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 16_000);

    try {
      const res = await fetch(`${API}/parse-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput }),
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }

      setOrders((prev) => [data.order, ...prev]);
      setSuccessId(data.order.orderId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timed out (15s). Check your connection and try again.');
      } else {
        setError(e.message);
      }
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }, []);

  // Update order status
  const handleStatusChange = useCallback(async (orderId, newStatus) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (e) {
      console.error('Status update failed:', e.message);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: Intake Terminal */}
        <div className="w-full lg:w-[420px] xl:w-[480px] lg:min-h-screen border-r border-slate-800 flex-shrink-0">
          <IntakeTerminal
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            successId={successId}
          />
        </div>

        {/* Right: Live Order Stream */}
        <div className="flex-1 overflow-y-auto">
          <OrderStream orders={orders} onStatusChange={handleStatusChange} />
        </div>
      </main>
    </div>
  );
}
