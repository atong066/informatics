import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/student/Dashboard';
import Profile from './pages/student/Profile';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/student/dashboard" replace />} />
        <Route
          path="/student/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/student/profile"
          element={(
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/login"
          element={(
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
          )}
        />
        <Route
          path="/register"
          element={(
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          )}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App
