import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Cpu, Mail, Lock, User, AlertCircle, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1';

const Login = () => {
  const { login, register, loginWithGoogle, error: authError } = useAuth();
  
  // Views: 'login', 'register', 'forgot-password', 'verify-email'
  const [view, setView] = useState('login');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Verification & Reset states
  const [verifyCode, setVerifyCode] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = input email, 2 = input token + new password
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // UI notifications
  const [localError, setLocalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (view === 'login' && window.google) {
      window.google.accounts.id.initialize({
        client_id: "109823456789-google_client_id.apps.googleusercontent.com", // Placeholder
        callback: handleGoogleResponse
      });
      window.google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "filled_blue", size: "large", width: 330, shape: "pill" }
      );
    }
  }, [view]);

  const handleGoogleResponse = async (response) => {
    setLocalError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    const success = await loginWithGoogle(response.credential);
    setSubmitting(false);
    if (!success) {
      setLocalError(authError || "Google Authentication failed.");
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!email || !password) {
      setLocalError("Please enter your email and password.");
      setSubmitting(false);
      return;
    }

    const success = await login(email, password);
    setSubmitting(false);
    if (!success) {
      setLocalError(authError || "Authentication failed. Please verify credentials.");
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!email || !password || !fullName) {
      setLocalError("Please fill out all registration fields.");
      setSubmitting(false);
      return;
    }

    const userObj = await register(email, password, fullName);
    setSubmitting(false);
    
    if (userObj) {
      setSuccessMsg("Account workspace created! Please check verification code details below.");
      // Route directly to email verification screen
      setView('verify-email');
    } else {
      setLocalError(authError || "Registration failed. Account might already exist.");
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (!email || !verifyCode) {
      setLocalError("Please enter your registered email and verification code.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Verification failed");
      }

      setSuccessMsg("Account verified successfully! You may now sign in.");
      setView('login');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    if (resetStep === 1) {
      if (!email) {
        setLocalError("Please enter your registered email address.");
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        
        if (data.reset_token) {
          setResetToken(data.reset_token);
          setSuccessMsg(`Reset token generated: ${data.reset_token}. Set new password below.`);
          setResetStep(2);
        } else {
          setSuccessMsg("If the account exists, a reset token has been registered.");
        }
      } catch (err) {
        setLocalError("Error initiating forgot password routine.");
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!resetToken || !newPassword) {
        setLocalError("Please enter the reset token and your new password.");
        setSubmitting(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, new_password: newPassword })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Reset failed");
        }

        setSuccessMsg("Password updated successfully! Redirecting to sign in.");
        setResetStep(1);
        setView('login');
      } catch (err) {
        setLocalError(err.message);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card animate-fade-in" style={{ animationDuration: '0.4s' }}>
        <div className="auth-header">
          <div style={{ 
            width: '48px', height: '48px', backgroundColor: 'rgba(99,102,241,0.1)', 
            borderRadius: 'var(--radius-md)', display: 'inline-flex', alignItems: 'center', 
            justifyContent: 'center', marginBottom: '16px' 
          }}>
            <Cpu size={24} style={{ color: 'rgb(var(--color-primary-light))' }} />
          </div>
          
          {view === 'login' && (
            <>
              <h2>Sign In to RetainAI</h2>
              <p>Access customer churn prediction metrics</p>
            </>
          )}
          {view === 'register' && (
            <>
              <h2>Create an Account</h2>
              <p>Register a new analytics workspace</p>
            </>
          )}
          {view === 'forgot-password' && (
            <>
              <h2>Reset Password</h2>
              <p>{resetStep === 1 ? 'Request a password reset token' : 'Specify credentials reset details'}</p>
            </>
          )}
          {view === 'verify-email' && (
            <>
              <h2>Email Verification</h2>
              <p>Confirm the 6-digit code to activate your account</p>
            </>
          )}
        </div>

        {localError && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            backgroundColor: 'rgba(239,68,68,0.1)', color: 'rgb(var(--color-danger))',
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px'
          }}>
            <AlertCircle size={16} />
            <span style={{ flexGrow: 1 }}>{localError}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(var(--color-success))',
            padding: '12px 16px', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '13px'
          }}>
            <CheckCircle2 size={16} />
            <span style={{ flexGrow: 1 }}>{successMsg}</span>
          </div>
        )}

        {/* --- View 1: Login Form --- */}
        {view === 'login' && (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  id="email"
                  placeholder="analyst@company.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="input-label" htmlFor="password" style={{ margin: 0 }}>Password</label>
                <button 
                  type="button" 
                  onClick={() => { setView('forgot-password'); setResetStep(1); setLocalError(null); setSuccessMsg(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Forgot password?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* --- View 2: Register Form --- */}
        {view === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label" htmlFor="fullName">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  id="fullName"
                  placeholder="John Doe"
                  className="input-field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="email">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  id="email"
                  placeholder="analyst@company.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  id="password"
                  placeholder="••••••••"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Registering Workspace...' : 'Register Workspace'}
            </button>
          </form>
        )}

        {/* --- View 3: Forgot Password Form --- */}
        {view === 'forgot-password' && (
          <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {resetStep === 1 ? (
              <div>
                <label className="input-label" htmlFor="resetEmail">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    id="resetEmail"
                    placeholder="analyst@company.com"
                    className="input-field"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                  <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="input-label" htmlFor="resetToken">Reset Token</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      id="resetToken"
                      placeholder="Paste generated UUID reset token"
                      className="input-field"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                    <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
                <div>
                  <label className="input-label" htmlFor="newPassword">New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="password"
                      id="newPassword"
                      placeholder="Enter new account password"
                      className="input-field"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                    />
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Processing Request...' : resetStep === 1 ? 'Generate Reset Token' : 'Reset Password'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setView('login'); setLocalError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* --- View 4: Email Verification Form --- */}
        {view === 'verify-email' && (
          <form onSubmit={handleVerifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label className="input-label" htmlFor="verifyEmail">Registered Email</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  id="verifyEmail"
                  placeholder="analyst@company.com"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div>
              <label className="input-label" htmlFor="verifyCode">6-Digit Verification Code</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  id="verifyCode"
                  placeholder="Enter 6-digit code"
                  className="input-field"
                  value={verifyCode}
                  maxLength={6}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  style={{ paddingLeft: '40px', letterSpacing: '0.1em' }}
                />
                <KeyRound size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submitting}>
              {submitting ? 'Verifying Account...' : 'Verify Account'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button 
                type="button" 
                onClick={() => { setView('login'); setLocalError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '12px' }}
              >
                Cancel and Login
              </button>
            </div>
          </form>
        )}

        {/* --- Google OAuth Integration --- */}
        {view === 'login' && (
          <>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', 
              color: 'var(--text-secondary)', fontSize: '12px', margin: '20px 0' 
            }}>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
              <span>OR</span>
              <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
              <div id="google-signin-btn"></div>
            </div>
          </>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          {view === 'login' && (
            <>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setView('register'); setLocalError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'rgb(var(--color-primary-light))', fontWeight: 700, cursor: 'pointer' }}
              >
                Register here
              </button>
            </>
          )}
          {view === 'register' && (
            <>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => { setView('login'); setLocalError(null); setSuccessMsg(null); }}
                style={{ background: 'none', border: 'none', color: 'rgb(var(--color-primary-light))', fontWeight: 700, cursor: 'pointer' }}
              >
                Login here
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
