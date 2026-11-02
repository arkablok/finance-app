import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email dan password wajib diisi');
      return;
    }

    setLoading(true);
    const r = await login(email.trim(), password);
    setLoading(false);

    if (r.ok) {
      navigate(from, { replace: true });
    } else {
      setError(r.message || 'Login gagal');
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Masuk</h1>
        <p className="subtitle">Kelola keuangan pribadi Anda</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="mb-4">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm" />
                Memproses...
              </>
            ) : (
              <>
                <LogIn size={16} /> Masuk
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0 small text-muted">
          Belum punya akun? <Link to="/register">Daftar</Link>
        </p>
      </div>
    </div>
  );
}