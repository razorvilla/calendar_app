import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { login as apiLogin, register as apiRegister, refreshToken as apiRefreshToken, logout as apiLogout } from '../api/authApi';
import { User } from '../types/user.types'; // Assuming you have a User type
import axios from 'axios';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  accessToken: string | null;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const performLogout = (setAccessToken: any, setUser: any, setIsAuthenticated: any, setLoading: any) => {
  setLoading(true);
  apiLogout();
  setAccessToken(null);
  setUser(null);
  setIsAuthenticated(false);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  setLoading(false);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    console.log('AuthContext: Initializing from localStorage');
    console.log('  storedAccessToken:', storedAccessToken ? 'present' : 'absent');
    console.log('  storedUser:', storedUser ? 'present' : 'absent');

    if (storedAccessToken && storedUser) {
      setAccessToken(storedAccessToken);
      setUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
      console.log('AuthContext: Successfully restored state from localStorage');
    } else {
      console.log('AuthContext: No stored state found in localStorage');
    }
    setLoading(false);
  }, []);

  // Configure Axios interceptor
  useEffect(() => {
    console.log('AuthContext: Configuring Axios interceptor. Current accessToken:', accessToken ? 'present' : 'absent');
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        // If error is 401 and not a retry, and refresh token exists
        if (error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true; // Mark as retry to prevent infinite loops
          try {
            console.log('AuthContext: Attempting to refresh token...');
            const newAccessToken = await apiRefreshToken();
            setAccessToken(newAccessToken);
            localStorage.setItem('accessToken', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            console.log('AuthContext: Token refreshed successfully.');
            return axios(originalRequest); // Retry the original request with new token
          } catch (refreshError) {
            console.error('AuthContext: Token refresh failed:', refreshError);
            performLogout(setAccessToken, setUser, setIsAuthenticated, setLoading); // Logout user if refresh fails
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken]);

  const logout = useCallback(() => {
    performLogout(setAccessToken, setUser, setIsAuthenticated, setLoading);
  }, [setAccessToken, setUser, setIsAuthenticated, setLoading]);

  

  const login = useCallback(async (credentials: any) => {
    setLoading(true);
    try {
      const { accessToken, user } = await apiLogin(credentials); // No longer expect refreshToken
      setAccessToken(accessToken);
      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('AuthContext: Login successful, state updated and stored. isAuthenticated:', true, 'User:', user);
    } catch (error) {
      console.error('AuthContext: Login failed:', error);
      throw error; // Re-throw to allow UI to handle
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: any) => {
    setLoading(true);
    try {
      const { accessToken, user } = await apiRegister(userData); // No longer expect refreshToken
      setAccessToken(accessToken);
      setUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('AuthContext: Registration successful, state updated and stored. isAuthenticated:', true, 'User:', user);
    } catch (error) {
      console.error('AuthContext: Registration failed:', error);
      throw error; // Re-throw to allow UI to handle
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, accessToken, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
