"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "@fortawesome/fontawesome-free/css/all.min.css";

import AuthContext from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import ResetPassword from "./pages/ResetPassword";
import GuestInterviewAccess from "./pages/GuestInterviewAccess";
import styles from "./App.module.css";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("user");
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => {
      const updated = { ...prev, ...userData };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({ user, handleLogin, handleLogout, updateUser }),
    [user, handleLogin, handleLogout, updateUser]
  );

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      <BrowserRouter>
        <Routes>
          {/* Reset password route MUST be accessible without login */}
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/guest-interview/:token" element={<GuestInterviewAccess />} />

          {/* Main app */}
          <Route
            path="/*"
            element={user ? <Home /> : <AuthPage />}
          />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

export default App;
