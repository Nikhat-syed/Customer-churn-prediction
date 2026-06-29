import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('churn_token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check token integrity on mount
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        // We can fetch a dashboard summary or define a simple profile route.
        // For simplicity, verify token by hitting a dashboard analytics call.
        const res = await fetch(`${API_BASE}/analytics/dashboard`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.status === 401) {
          // Token expired or invalid
          logout();
        } else {
          // Retrieve email/user details decoded from JWT locally
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUser({ email: payload.sub, role: payload.role });
        }
      } catch (err) {
        console.error("Failed to verify token:", err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    setError(null);
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE}/auth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('churn_token', data.access_token);
      setToken(data.access_token);
      
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      setUser({ email: payload.sub, role: payload.role });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const register = async (email, password, fullName) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: 'analyst'
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Registration failed');
      }
      
      const data = await res.json();
      return data;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const loginWithGoogle = async (googleCredential) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: googleCredential
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Google Login failed');
      }

      const data = await res.json();
      localStorage.setItem('churn_token', data.access_token);
      setToken(data.access_token);
      
      const payload = JSON.parse(atob(data.access_token.split('.')[1]));
      setUser({ email: payload.sub, role: payload.role });
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('churn_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, error, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
