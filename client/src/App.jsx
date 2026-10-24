import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import IntakeTerminal from './components/IntakeTerminal.jsx';
import OrderStream from './components/OrderStream.jsx';

const API = '/api';

// Web Audio API chime synthesizer (two-tone harmonious alert)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.15);
    osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.3); // D6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.15);
    osc1.stop(now + 0.3);
    osc2.stop(now + 0.6);
  } catch (e) {
    console.debug('Audio chime muted or unavailable:', e);
  }
}

export default function App() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);
  const [successId, setSuccessId] = useState(null);
  const [liveAlert, setLiveAlert] = useState(null);
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  const seenOrderIds = useRef(new Set());

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      setNotifPermission(res);
      return res;
    }
  }, []);

  // Fetch all existing orders on mount
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API}/orders`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      data.forEach((o) => seenOrderIds.current.add(o.orderId));
      setOrders(data);
    } catch (e) {
      console.error('fetchOrders:', e);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Connect to Real-time Server-Sent Events (SSE)
  useEffect(() => {
    const sse = new EventSource(`${API}/orders/live`);

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'new_order' && payload.order) {
          const newOrder = payload.order;

          // Avoid duplicates if created by local submit
          if (!seenOrderIds.current.has(newOrder.orderId)) {
            seenOrderIds.current.add(newOrder.orderId);
            setOrders((prev) => [newOrder, ...prev.filter((o) => o.orderId !== newOrder.orderId)]);

            // Trigger Real-time Alert
            playNotificationChime();
            setLiveAlert({
              orderId: newOrder.orderId,
              customerName: newOrder.customerName,
              source: payload.source,
              itemCount: newOrder.items?.length || 1,
            });

            // Native Browser Desktop Notification
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(`🚨 PrintFlow Order: ${newOrder.customerName}`, {
                body: `${newOrder.orderId} • ${newOrder.items?.map((i) => `${i.quantity}x ${i.productType}`).join(', ') || 'New order'}`,
                icon: '/vite.svg',
              });
            }

            setTimeout(() => setLiveAlert(null), 6000);
          }
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    sse.onerror = () => {
      console.debug('SSE reconnecting...');
    };

    return () => {
      sse.close();
    };
  }, []);

  // Submit raw order text (Manual Terminal)
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? `Server error ${res.status}`);
        return;
      }

      seenOrderIds.current.add(data.order.orderId);
      setOrders((prev) => [data.order, ...prev.filter((o) => o.orderId !== data.order.orderId)]);
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

  // Trigger simulated incoming WhatsApp message (Hands-Free)
  const handleSimulateWhatsApp = useCallback(async (scenario) => {
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch(`${API}/webhook/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Simulation failed');
      // Order automatically delivered via SSE + chime!
    } catch (e) {
      setError(e.message);
    } finally {
      setSimulating(false);
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
      <Header
        notifPermission={notifPermission}
        onRequestNotif={requestNotificationPermission}
      />

      {/* Real-time Webhook Live Alert Toast */}
      {liveAlert && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-2xl backdrop-blur-md animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs">
            <span className="font-bold">{liveAlert.orderId}</span> received automatically from{' '}
            <span className="font-semibold capitalize">{liveAlert.source}</span>! ({liveAlert.customerName})
          </div>
          <button
            onClick={() => setLiveAlert(null)}
            className="text-emerald-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
        {/* Left: Intake Terminal with WhatsApp Auto-Intake Simulator */}
        <div className="w-full lg:w-[420px] xl:w-[480px] lg:min-h-screen border-r border-slate-800 flex-shrink-0">
          <IntakeTerminal
            onSubmit={handleSubmit}
            onSimulateWhatsApp={handleSimulateWhatsApp}
            loading={loading}
            simulating={simulating}
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
