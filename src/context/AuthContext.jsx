
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/profile")
      .then((response) => {
        setUser(response.data);
      })
      .catch(() => {
        sessionStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    const token = response.data.token;

    if (!token) {
      throw new Error("Login response did not contain a token");
    }

    sessionStorage.setItem("token", token);

    try {
      const profileResponse = await api.get("/profile");
      setUser(profileResponse.data);
    } catch (error) {
      sessionStorage.removeItem("token");
      throw error;
    }

    return response.data;
  };

  const logout = () => {
    sessionStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: Boolean(user),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
