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
import "./App.css";

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, initialized } = useSelector((state) => state.auth);

  // Inicializálás: localStorage-ből visszaállítjuk a bejelentkezési állapotot
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("authUser");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        dispatch(initializeAuth(user));
      } catch (error) {
        // Ha a user adatok hibásak, töröljük őket
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        dispatch(initializeAuth(null));
      }
    } else {
      // Ha nincs token, akkor is jelöljük, hogy inicializálva van
      dispatch(initializeAuth(null));
    }
  }, [dispatch]);

  // Várunk az inicializálásra, mielőtt bármit renderelünk
  if (!initialized) {
    return null; // vagy egy loading spinner
  }

  return (
    <>
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

          {/* Alapértelmezett útvonal */}
          <Route
            path="/"
            element={
              <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />
            }
          />
        </Routes>
      </Router>
    </>
  );
}

export default App;
