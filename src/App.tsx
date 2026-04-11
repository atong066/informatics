import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { GuestOnlyRoute, ProtectedRoute } from './components/RouteGuards';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <Dashboard />
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
