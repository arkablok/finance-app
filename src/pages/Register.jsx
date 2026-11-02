import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (nama.trim().length < 2) {
      setError('Nama minimal 2 karakter');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Email tidak valid');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter');
      return;
    }
    if (password !== konfirmasi) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    const r = await register(nama.trim(), email.trim().toLowerCase(), password);
    setLoading(false);

    if (r.ok) {
      navigate('/', { replace: true });
    } else {
      setError(r.message || 'Pendaftaran gagal');
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Daftar</h1>
        <p className="subtitle">Buat akun baru</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Nama</label>
            <input
              type="text"
              className="form-control"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
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
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <small className="text-muted">Minimal 8 karakter</small>
          </div>
          <div className="mb-4">
            <label className="form-label">Konfirmasi Password</label>
            <input
              type="password"
              className="form-control"
              value={konfirmasi}
              onChange={(e) => setKonfirmasi(e.target.value)}
              autoComplete="new-password"
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
                <UserPlus size={16} /> Daftar
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-4 mb-0 small text-muted">
          Sudah punya akun? <Link to="/login">Masuk</Link>
        </p>
      </div>
    </div>
  );
}