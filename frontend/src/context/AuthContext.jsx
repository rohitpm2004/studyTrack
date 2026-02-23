import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("st_token") || "");
  const [loading, setLoading] = useState(true);

  // on mount — validate stored token
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    API.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => { localStorage.removeItem("st_token"); setToken(""); })
      .finally(() => setLoading(false));
  }, [token]);

  const login = async (email, password) => {
    const { data } = await API.post("/auth/login", { email, password });
    localStorage.setItem("st_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (fields) => {
    const { data } = await API.post("/auth/register", fields);
    localStorage.setItem("st_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("st_token");
    setToken("");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
