import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u) return null;
    return { ...u, _id: u._id || u.id, role: u.role?.trim().toLowerCase() };
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) localStorage.setItem("token", nextToken);
    if (nextUser) localStorage.setItem("user", JSON.stringify(nextUser));
    if (nextToken) setToken(nextToken);
    if (nextUser) setUser({ ...nextUser, role: nextUser.role?.toLowerCase() });
  }, []);

  const login = useCallback(
    async (email, password) => {
      const res = await API.post("/auth/login", { email, password });
      persist(res.data.token, res.data.user);
      return res.data.user;
    },
    [persist]
  );

  const register = useCallback(
    async (payload) => {
      const res = await API.post("/auth/register", payload);
      persist(res.data.token, res.data.user);
      return res.data.user;
    },
    [persist]
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }, []);

  /** Re-fetch the user from the server (e.g. after a profile edit elsewhere). */
  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      persist(null, res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [persist]);

  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }, []);

  // The API interceptor fires this when a token is rejected
  useEffect(() => {
    const onLogout = () => logout();
    window.addEventListener("gradefair:logout", onLogout);
    return () => window.removeEventListener("gradefair:logout", onLogout);
  }, [logout]);

  // Keep the cached user fresh on first mount
  useEffect(() => {
    if (token) refreshUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthed: !!token && !!user,
      isAdmin: user?.role === "admin",
      isManager: user?.role === "manager",
      isMember: user?.role === "member",
      login,
      register,
      logout,
      refreshUser,
      updateUser
    }),
    [user, token, login, register, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
