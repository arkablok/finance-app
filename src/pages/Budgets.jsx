import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Target, Pencil, Trash2, AlertTriangle, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, CheckCircle2
} from 'lucide-react';
import {
  budgets as budgetApi, categories as catApi, formatRupiah, namaBulan
} from '../api/api';

function currentPeriod() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function emptyForm(period) {
  return {
    category_id: '',
    month: period.month,
    year: period.year,
    limit_amount: '',
  };
}

export default function Budgets() {
  const [period, setPeriod] = useState(currentPeriod());
  const [status, setStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm(period));
  const [formError, setFormError] = useState('');

  // Konfirmasi hapus
  const [deletingItem, setDeletingItem] = useState(null);

  // ---------- Load categories (sekali) ----------
  useEffect(() => {
    (async () => {
      const r = await catApi.list({ type: 'expense' });
      if (r.ok) setCategories(r.data);
    })();
  }, []);

  // ---------- Load status ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const r = await budgetApi.status({ month: period.month, year: period.year });
    if (r.ok) setStatus(r.data);
    else setError(r.message || 'Gagal memuat budget');
    setLoading(false);
  }, [period.month, period.year]);

  useEffect(() => { load(); }, [load]);

  // ---------- Period navigation ----------
  function prevMonth() {
    setPeriod((p) => {
      const m = p.month - 1;
      return m < 1 ? { month: 12, year: p.year - 1 } : { month: m, year: p.year };
    });
  }
  function nextMonth() {
    setPeriod((p) => {
      const m = p.month + 1;
      return m > 12 ? { month: 1, year: p.year + 1 } : { month: m, year: p.year };
    });
  }

  // ---------- Derived ----------
  const usedCategories = useMemo(() => {
    if (!status) return new Set();
    return new Set(status.items.map((b) => b.category_id));
  }, [status]);

  const availableCategories = useMemo(() => {
    if (editingId) return categories; // saat edit, semua kategori boleh muncul
    return categories.filter((c) => !usedCategories.has(c.category_id));
  }, [categories, usedCategories, editingId]);

  // ---------- Form handlers ----------
  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(period));
    setFormError('');
    setShowForm(true);
  }

  function openEdit(b) {
    setEditingId(b.budget_id);
    setForm({
      category_id: b.category_id,
      month: b.month,
      year: b.year,
      limit_amount: String(b.limit_amount),
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const limit = Number(form.limit_amount);
    if (!form.category_id) { setFormError('Pilih kategori'); return; }
    if (!isFinite(limit) || limit <= 0) { setFormError('Limit harus angka > 0'); return; }

    setSaving(true);
    let r;
    if (editingId) {
      // Update: hanya limit_amount
      r = await budgetApi.update({ budget_id: editingId, limit_amount: limit });
    } else {
      r = await budgetApi.create({
        category_id: form.category_id,
        month: Number(form.month),
        year: Number(form.year),
        limit_amount: limit,
      });
    }
    setSaving(false);

    if (r.ok) {
      setShowForm(false);
      setNotice(editingId ? 'Budget diperbarui' : 'Budget ditambahkan');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setFormError(r.message || 'Gagal menyimpan');
    }
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setSaving(true);
    const r = await budgetApi.remove({ budget_id: deletingItem.budget_id });
    setSaving(false);
    setDeletingItem(null);
    if (r.ok) {
      setNotice('Budget dihapus');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setError(r.message || 'Gagal menghapus');
    }
  }

  // ---------- Render ----------
  const summary = status?.summary || { total_limit: 0, total_spent: 0, total_remaining: 0, budget_count: 0, over_budget_count: 0 };
  const items = status?.items || [];

  function progressColor(percent, over) {
    if (over) return 'var(--color-danger)';
    if (percent >= 80) return '#f59e0b';
    return 'var(--color-primary)';
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Budget</h2>
          <p className="text-muted mb-0 small">{summary.budget_count} budget · {summary.over_budget_count} terlampaui</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Budget Baru
        </button>
      </div>

      {notice && <div className="alert alert-success py-2 small">{notice}</div>}
      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Period navigator */}
      <div className="card-stat mb-4 py-3">
        <div className="d-flex align-items-center justify-content-between">
          <button className="btn btn-sm btn-light" onClick={prevMonth}>
            <ChevronLeft size={16} />
          </button>
          <div className="text-center">
            <div className="fw-bold">{namaBulan(period.month)} {period.year}</div>
            <small className="text-muted">Periode budget</small>
          </div>
          <button className="btn btn-sm btn-light" onClick={nextMonth}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Target size={16} className="text-primary" />
              <span className="label mb-0">Total Limit</span>
            </div>
            <div className="value" style={{ fontSize: '1.1rem' }}>{formatRupiah(summary.total_limit)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat expense">
            <div className="d-flex align-items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-danger" />
              <span className="label mb-0">Terpakai</span>
            </div>
            <div className="value" style={{ fontSize: '1.1rem' }}>{formatRupiah(summary.total_spent)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Wallet size={16} className="text-success" />
              <span className="label mb-0">Sisa</span>
            </div>
            <div className="value" style={{ fontSize: '1.1rem', color: summary.total_remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatRupiah(summary.total_remaining)}
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <AlertTriangle size={16} className={summary.over_budget_count > 0 ? 'text-danger' : 'text-muted'} />
              <span className="label mb-0">Terlampaui</span>
            </div>
            <div className="value" style={{ fontSize: '1.1rem', color: summary.over_budget_count > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
              {summary.over_budget_count} kategori
            </div>
          </div>
        </div>
      </div>

      {/* List budget */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0 small">Memuat budget...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card-stat text-center py-5">
          <Target size={40} className="text-muted mb-3" />
          <p className="text-muted mb-3">Belum ada budget untuk {namaBulan(period.month)} {period.year}</p>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 mx-auto" onClick={openCreate}>
            <Plus size={14} /> Buat Budget Pertama
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {items.map((b) => (
            <div key={b.budget_id} className="col-12 col-md-6 col-lg-4">
              <div className="card-stat h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                  <div className="d-flex align-items-center gap-2 min-w-0">
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `${b.category_color}22`,
                        color: b.category_color,
                      }}
                    >
                      <Target size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="fw-medium text-truncate">{b.category_name}</div>
                      <small className="text-muted">{b.percent_used}% terpakai</small>
                    </div>
                  </div>
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn btn-sm btn-light" title="Edit" onClick={() => openEdit(b)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn btn-sm btn-light text-danger" title="Hapus" onClick={() => setDeletingItem(b)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                    <div
                      className="progress-bar"
                      style={{
                        width: `${Math.min(100, b.percent_used)}%`,
                        backgroundColor: progressColor(b.percent_used, b.over_budget),
                        borderRadius: 4,
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">Terpakai</span>
                  <span className="fw-medium">{formatRupiah(b.spent)}</span>
                </div>
                <div className="d-flex justify-content-between small mb-1">
                  <span className="text-muted">Limit</span>
                  <span className="fw-medium">{formatRupiah(b.limit_amount)}</span>
                </div>
                <div className="d-flex justify-content-between small mt-auto pt-2 border-top">
                  <span className="text-muted">{b.over_budget ? 'Kelebihan' : 'Sisa'}</span>
                  <span className={`fw-bold ${b.over_budget ? 'text-danger' : 'text-success'}`}>
                    {formatRupiah(Math.abs(b.remaining))}
                  </span>
                </div>

                {b.over_budget && (
                  <div className="alert alert-danger py-1 px-2 small mt-2 mb-0 d-flex align-items-center gap-1">
                    <AlertTriangle size={12} /> Melebihi budget!
                  </div>
                )}
                {!b.over_budget && b.percent_used >= 80 && (
                  <div className="alert alert-warning py-1 px-2 small mt-2 mb-0 d-flex align-items-center gap-1">
                    <AlertTriangle size={12} /> Mendekati limit
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== MODAL: Form ========== */}
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Edit Budget' : 'Budget Baru'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)} disabled={saving} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}

                  {!editingId ? (
                    <>
                      <div className="mb-3">
                        <label className="form-label small">Kategori (Pengeluaran)</label>
                        <select
                          className="form-select"
                          value={form.category_id}
                          onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                          required
                        >
                          <option value="">Pilih kategori</option>
                          {availableCategories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                          ))}
                        </select>
                        {availableCategories.length === 0 && (
                          <small className="text-warning d-block mt-1">
                            Semua kategori pengeluaran sudah punya budget di periode ini.
                          </small>
                        )}
                      </div>

                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <label className="form-label small">Bulan</label>
                          <select
                            className="form-select"
                            value={form.month}
                            onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>{namaBulan(m)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label small">Tahun</label>
                          <input
                            type="number"
                            className="form-control"
                            value={form.year}
                            onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
                            min="2000"
                            max="2100"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="alert alert-info py-2 small">
                      Kategori dan periode tidak bisa diubah. Hapus dan buat baru jika perlu.
                    </div>
                  )}

                  <div className="mb-0">
                    <label className="form-label small">Limit Budget</label>
                    <input
                      type="number"
                      className="form-control"
                      value={form.limit_amount}
                      onChange={(e) => setForm((f) => ({ ...f, limit_amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowForm(false)} disabled={saving}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</> : (editingId ? 'Simpan Perubahan' : 'Simpan')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Konfirmasi Hapus ========== */}
      {deletingItem && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <Trash2 size={32} className="text-danger mb-3" />
                <p className="mb-1 fw-medium">Hapus budget ini?</p>
                <p className="text-muted small mb-0">{deletingItem.category_name} · {formatRupiah(deletingItem.limit_amount)}</p>
                <p className="text-muted small mb-0 mt-2">Riwayat transaksi tidak akan terhapus, hanya budget-nya.</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setDeletingItem(null)} disabled={saving}>Batal</button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}