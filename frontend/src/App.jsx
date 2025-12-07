import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { initializeAuth } from "./redux/slices/authSlice";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import Dashboard from "./pages/Dashboard";
import Forum from "./pages/Forum";
import "./App.css";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Token ellenőrzése az oldal betöltésekor
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      // Mock auth esetén: ha van token, akkor beállítjuk az autentikált állapotot
      // A felhasználó adatait a localStorage-ból olvassuk, ha vannak
      const savedUser = localStorage.getItem("authUser");
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          dispatch(initializeAuth(user));
        } catch (e) {
          // Ha nincs érvényes user adat, csak a token alapján beállítjuk
          dispatch(
            initializeAuth({
              id: 1,
              name: "Felhasználó",
              email: "user@elte.hu",
              major: "Informatika",
            })
          );
        }
      } else {
        // Ha nincs mentett user adat, alapértelmezett user-t használunk
        dispatch(
          initializeAuth({
            id: 1,
            name: "Felhasználó",
            email: "user@elte.hu",
            major: "Informatika",
          })
        );
      }
    }
  }, [dispatch]);

  return (
    <Router>
      <Routes>
        {/* Nyilvános útvonalak */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Védett útvonal (csak bejelentkezett felhasználók) */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/forum/:groupId"
          element={isAuthenticated ? <Forum /> : <Navigate to="/login" />}
        />

        {/* Alapértelmezett útvonal */}
        <Route
          path="/"
          element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
