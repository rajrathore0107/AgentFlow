import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('agentflow_token');
    const savedUser = localStorage.getItem('agentflow_user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { user, token } = res.data;
    localStorage.setItem('agentflow_token', token);
    localStorage.setItem('agentflow_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const register = async (email, username, password) => {
    const res = await authAPI.register({ email, username, password });
    const { user, token } = res.data;
    localStorage.setItem('agentflow_token', token);
    localStorage.setItem('agentflow_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('agentflow_token');
    localStorage.removeItem('agentflow_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
