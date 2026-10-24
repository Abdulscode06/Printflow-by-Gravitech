import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import IntakeTerminal from './components/IntakeTerminal.jsx';
import OrderStream from './components/OrderStream.jsx';

const API = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

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
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        setOrders(await res.json());
      }
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

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 35_000);

    try {
      const res = await fetch(`${API}/parse-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput }),
        signal: controller.signal,
      });

      const contentType = res.headers.get('content-type') || '';
      let data;
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        throw new Error(
          'Backend returned HTML instead of JSON. Your backend URL is either not connected or still starting up on Render.',
        );
      }

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }

      setOrders((prev) => [data.order, ...prev]);
      setSuccessId(data.order.orderId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError('Request timed out (35s). Check your connection and try again.');
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

  // Delete an order
  const handleDeleteOrder = useCallback(async (orderId) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
    } catch (e) {
      console.error('Delete order failed:', e.message);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: Intake Terminal */}
        <div className="w-full lg:w-[420px] xl:w-[480px] lg:max-h-[calc(100vh-65px)] lg:overflow-y-auto border-r border-slate-800 flex-shrink-0">
          <IntakeTerminal
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            successId={successId}
          />
        </div>

        {/* Right: Live Order Stream */}
        <div className="flex-1 overflow-y-auto">
          <OrderStream
            orders={orders}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteOrder}
          />
        </div>
      </main>
    </div>
  );
}
