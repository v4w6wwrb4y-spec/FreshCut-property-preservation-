import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "manager" ? "/manager" : "/employee");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (mail) => {
    setEmail(mail);
    setPassword("password123");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">🌿</div>
          <h1>Fresh Cut</h1>
          <p>Property Preservation Management</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@freshcut.com"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div className="demo-accounts">
          <p className="demo-title">Demo accounts — click to fill</p>
          <div className="demo-btns">
            <button onClick={() => quickFill("manager@freshcut.com")} className="demo-btn">
              👔 Manager
            </button>
            <button onClick={() => quickFill("mike@freshcut.com")} className="demo-btn">
              🔧 Employee
            </button>
          </div>
          <p className="demo-hint">Password for all accounts: password123</p>
        </div>
      </div>
    </div>
  );
}
