import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, UserPlus, AlertCircle, Folder, Eye, EyeOff } from 'lucide-react';
import ShapeGrid from '../components/ShapeGrid';

export default function Signup({ onToggleView, onShowToast }) {
  const { signup } = useAuth();
  const [username,        setUsername]        = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.'); return;
    }
    if (username.length < 3)       { setError('Username must be at least 3 characters.'); return; }
    if (password.length < 6)       { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      await signup(username, email, password);
      onShowToast?.('Account created! Welcome to Dobby Drive.', 'success');
    } catch (err) {
      setError(err.message || 'Registration failed. Try a different email.');
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
          <p className="auth-tagline">Create an account to start organizing your images in one place.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-err">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Username</label>
            <div className="auth-input-wrap">
              <User size={14} className="auth-input-icon" />
              <input type="text" className="auth-input" placeholder="yourname"
                value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-wrap">
              <Mail size={14} className="auth-input-icon" />
              <input type="email" className="auth-input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input type={showPass ? 'text' : 'password'} className="auth-input" placeholder="Min. 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="auth-field">
            <label className="auth-label">Confirm Password</label>
            <div className="auth-input-wrap">
              <Lock size={14} className="auth-input-icon" />
              <input type={showConfirm ? 'text' : 'password'} className="auth-input" placeholder="Repeat password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} /><span>Creating account…</span></>
              : <><UserPlus size={14} /><span>Create Account</span></>
            }
          </button>
        </form>

        <div className="auth-switch">
          Already have an account?
          <span className="auth-switch-link" onClick={onToggleView}>Sign in</span>
        </div>
      </div>
    </div>
  );
}
