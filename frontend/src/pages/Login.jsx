import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, Folder, Eye, EyeOff } from 'lucide-react';
import ShapeGrid from '../components/ShapeGrid';

export default function Login({ onToggleView, onShowToast }) {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword]               = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrUsername || !password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    setError('');
    try {
      await login(emailOrUsername, password);
      onShowToast?.('Welcome back!', 'success');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* animated background */}
      <div className="auth-waves-bg">
        <ShapeGrid
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="#2a2a2a"
          hoverFillColor="#222"
          shape="square"
          hoverTrailAmount={4}
        />
      </div>

      <div className="auth-card">
        <div className="auth-top">
          <div className="auth-logo">
            <div className="auth-logo-icon"><Folder size={17} /></div>
            <span className="auth-logo-name">Dobby Drive</span>
          </div>
          <p className="auth-tagline">Your personal image vault organized, secure, always accessible.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-err">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Email or Username</label>
            <div className="auth-input-wrap">
              <Mail size={14} className="auth-input-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="you@example.com"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input
                type={showPass ? 'text' : 'password'}
                className="auth-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /><span>Signing in…</span></>
              : <><LogIn size={14} /><span>Sign In</span></>
            }
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account?
          <span className="auth-switch-link" onClick={onToggleView}>Sign up</span>
        </div>
      </div>
    </div>
  );
}
