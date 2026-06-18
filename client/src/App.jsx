import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PipelineBuilder from './pages/PipelineBuilder'
import ExecutionView from './pages/ExecutionView'
import Executions from './pages/Executions'
import Templates from './pages/Templates'
import Analytics from './pages/Analytics'
import AppLayout from './components/AppLayout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loader"><div className="loader"></div></div>;
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="pipeline/:id" element={<PipelineBuilder />} />
        <Route path="executions" element={<Executions />} />
        <Route path="execution/:id" element={<ExecutionView />} />
        <Route path="templates" element={<Templates />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
