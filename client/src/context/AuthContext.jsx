// client/src/context/AuthContext.jsx
// Holds the logged-in user and token for the whole app.
import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On page load, if a token is saved, ask the server who it belongs to.
  useEffect(() => {
    if (!localStorage.getItem("drivex_token")) return setLoading(false);
    api.get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => localStorage.removeItem("drivex_token"))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = ({ token, user }) => {
    localStorage.setItem("drivex_token", token);
    setUser(user);
  };

  const login = async (email, password) =>
    saveSession((await api.post("/auth/login", { email, password })).data);

  const register = async (email, password) =>
    saveSession((await api.post("/auth/register", { email, password })).data);

  const logout = () => {
    localStorage.removeItem("drivex_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
