import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Login     from './pages/Login';
import Signup    from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [view,   setView]   = useState('login');
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" style={{ width: 26, height: 26 }} />
        <span>Loading Dobby Drive…</span>
      </div>
    );
  }

  return (
    <>
      {user ? (
        <Dashboard onShowToast={showToast} />
      ) : view === 'login' ? (
        <Login   onToggleView={() => setView('signup')} onShowToast={showToast} />
      ) : (
        <Signup  onToggleView={() => setView('login')}  onShowToast={showToast} />
      )}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ display: 'flex', flexShrink: 0 }}>
              {t.type === 'success' ? <CheckCircle2 size={14} />
               : t.type === 'error' ? <AlertCircle  size={14} />
               : <Info size={14} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </>
  );
}
