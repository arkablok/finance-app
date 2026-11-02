import { useEffect, useState, useMemo } from 'react';
import {
  Plus, Pencil, Trash2, AlertTriangle, Lock, Tags,
  ArrowDownCircle, ArrowUpCircle, Palette
} from 'lucide-react';
import { categories as catApi } from '../api/api';

const TYPE_TABS = [
  { value: 'expense', label: 'Pengeluaran', icon: ArrowDownCircle, color: '#dc2626' },
  { value: 'income', label: 'Pemasukan', icon: ArrowUpCircle, color: '#16a34a' },
];

const PRESET_COLORS = [
  '#dc2626', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#16a34a',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#64748b', '#0f172a',
];

function emptyForm(type) {
  return {
    category_name: '',
    type: type || 'expense',
    icon: 'circle',
    color: '#3b82f6',
  };
}

export default function Categories() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('expense');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingIsSystem, setEditingIsSystem] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');

  // Konfirmasi hapus
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // ---------- Load ----------
  async function load() {
    setLoading(true);
    setError('');
    const r = await catApi.list({});
    if (r.ok) setItems(r.data);
    else setError(r.message || 'Gagal memuat kategori');
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ---------- Derived ----------
  const filtered = useMemo(() => {
    return items
      .filter((c) => c.type === activeTab)
      .sort((a, b) => {
        // Sistem dulu, lalu alfabetis
        if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
        return a.category_name.localeCompare(b.category_name);
      });
  }, [items, activeTab]);

  const counts = useMemo(() => ({
    expense: items.filter((c) => c.type === 'expense').length,
    income: items.filter((c) => c.type === 'income').length,
  }), [items]);

  // ---------- Form handlers ----------
  function openCreate() {
    setEditingId(null);
    setEditingIsSystem(false);
    setForm(emptyForm(activeTab));
    setFormError('');
    setShowForm(true);
  }

  function openEdit(c) {
    if (c.is_system) return;
    setEditingId(c.category_id);
    setEditingIsSystem(false);
    setForm({
      category_name: c.category_name,
      type: c.type,
      icon: c.icon || 'circle',
      color: c.color || '#3b82f6',
    });
    setFormError('');
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const name = form.category_name.trim();
    if (!name || name.length < 2) { setFormError('Nama minimal 2 karakter'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) { setFormError('Warna tidak valid'); return; }

    setSaving(true);
    const r = editingId
      ? await catApi.update({
          category_id: editingId,
          category_name: name,
          type: form.type,
          icon: form.icon,
          color: form.color,
        })
      : await catApi.create({
          category_name: name,
          type: form.type,
          icon: form.icon,
          color: form.color,
        });
    setSaving(false);

    if (r.ok) {
      setShowForm(false);
      setNotice(editingId ? 'Kategori diperbarui' : 'Kategori ditambahkan');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setFormError(r.message || 'Gagal menyimpan');
    }
  }

  async function handleDelete() {
    if (!deletingItem) return;
    setDeleteError('');
    setSaving(true);
    const r = await catApi.remove({ category_id: deletingItem.category_id });
    setSaving(false);
    if (r.ok) {
      setDeletingItem(null);
      setNotice('Kategori dihapus');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setDeleteError(r.message || 'Gagal menghapus');
    }
  }

  // ---------- Render ----------
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Kategori</h2>
          <p className="text-muted mb-0 small">
            {counts.expense} pengeluaran · {counts.income} pemasukan
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreate}>
          <Plus size={16} /> Kategori Baru
        </button>
      </div>

      {notice && <div className="alert alert-success py-2 small">{notice}</div>}
      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="d-flex gap-2 mb-3">
        {TYPE_TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.value;
          return (
            <button
              key={t.value}
              className={`btn btn-sm d-flex align-items-center gap-2 ${isActive ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveTab(t.value)}
              style={isActive ? { backgroundColor: t.color, borderColor: t.color } : {}}
            >
              <Icon size={14} /> {t.label}
              <span className={`badge ${isActive ? 'bg-white text-dark' : 'bg-secondary'}`}>
                {counts[t.value]}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0 small">Memuat kategori...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-stat text-center py-5">
          <Tags size={40} className="text-muted mb-3" />
          <p className="text-muted mb-3">Belum ada kategori {activeTab === 'expense' ? 'pengeluaran' : 'pemasukan'}</p>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 mx-auto" onClick={openCreate}>
            <Plus size={14} /> Buat Kategori
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {filtered.map((c) => (
            <div key={c.category_id} className="col-12 col-sm-6 col-lg-4 col-xl-3">
              <div className="card-stat h-100 d-flex align-items-center gap-3 py-3">
                <div
                  className="d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${c.color}22`,
                    color: c.color,
                    position: 'relative',
                  }}
                >
                  <Tags size={20} />
                  {c.is_system && (
                    <div
                      className="position-absolute d-flex align-items-center justify-content-center"
                      style={{
                        bottom: -4, right: -4, width: 18, height: 18,
                        borderRadius: '50%', background: '#fff',
                        border: '1px solid var(--color-border)',
                        color: 'var(--color-muted)',
                      }}
                      title="Kategori sistem (tidak bisa diubah)"
                    >
                      <Lock size={10} />
                    </div>
                  )}
                </div>
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-medium text-truncate">{c.category_name}</div>
                  <small className="text-muted">
                    {c.is_system ? 'Sistem' : 'Kustom'}
                  </small>
                </div>
                {!c.is_system && (
                  <div className="d-flex gap-1 flex-shrink-0">
                    <button className="btn btn-sm btn-light" title="Edit" onClick={() => openEdit(c)}>
                      <Pencil size={13} />
                    </button>
                    <button
                      className="btn btn-sm btn-light text-danger"
                      title="Hapus"
                      onClick={() => { setDeletingItem(c); setDeleteError(''); }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="alert alert-light border small mt-4 d-flex gap-2">
        <Lock size={16} className="flex-shrink-0 mt-1" />
        <div>
          Kategori bertanda <strong>Lock</strong> adalah kategori sistem bawaan aplikasi.
          Kategori sistem tidak bisa diubah atau dihapus, tapi bisa dipakai untuk semua transaksi Anda.
          Kategori kustom yang masih dipakai transaksi juga tidak bisa dihapus.
        </div>
      </div>

      {/* ========== MODAL: Form ========== */}
      {showForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingId ? 'Edit Kategori' : 'Kategori Baru'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowForm(false)} disabled={saving} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && <div className="alert alert-danger py-2 small">{formError}</div>}

                  <div className="mb-3">
                    <label className="form-label small">Nama Kategori</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.category_name}
                      onChange={(e) => setForm((f) => ({ ...f, category_name: e.target.value }))}
                      placeholder="Contoh: Kopi"
                      maxLength={40}
                      required
                    />
                  </div>

                  {!editingId && (
                    <div className="mb-3">
                      <label className="form-label small">Tipe</label>
                      <div className="btn-group w-100" role="group">
                        {TYPE_TABS.map((t) => {
                          const Icon = t.icon;
                          return (
                            <button
                              key={t.value}
                              type="button"
                              className={`btn btn-sm d-flex align-items-center justify-content-center gap-1 ${form.type === t.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                              onClick={() => setForm((f) => ({ ...f, type: t.value }))}
                            >
                              <Icon size={14} /> {t.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  <div className="mb-3">
                    <label className="form-label small">Pratinjau</label>
                    <div className="d-flex align-items-center gap-3 p-3" style={{ background: 'var(--color-bg)', borderRadius: 10 }}>
                      <div
                        className="d-flex align-items-center justify-content-center"
                        style={{
                          width: 44, height: 44, borderRadius: 10,
                          background: `${form.color}22`,
                          color: form.color,
                        }}
                      >
                        <Tags size={20} />
                      </div>
                      <div>
                        <div className="fw-medium">{form.category_name || 'Nama Kategori'}</div>
                        <small className="text-muted">{form.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</small>
                      </div>
                    </div>
                  </div>

                  {/* Color picker */}
                  <div className="mb-0">
                    <label className="form-label small d-flex align-items-center gap-1">
                      <Palette size={12} /> Warna
                    </label>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="btn p-0"
                          onClick={() => setForm((f) => ({ ...f, color: c }))}
                          style={{
                            width: 28, height: 28, borderRadius: 6,
                            backgroundColor: c,
                            border: form.color.toLowerCase() === c.toLowerCase() ? '2px solid var(--color-text)' : '2px solid transparent',
                            boxShadow: '0 0 0 1px rgba(15,23,42,0.08)',
                          }}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        className="form-control form-control-color"
                        value={form.color}
                        onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                        title="Pilih warna kustom"
                        style={{ width: 40, height: 32 }}
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        value={form.color}
                        onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                        placeholder="#3b82f6"
                        maxLength={7}
                        style={{ maxWidth: 100 }}
                      />
                      <small className="text-muted">Hex</small>
                    </div>
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
                <p className="mb-1 fw-medium">Hapus kategori ini?</p>
                <p className="text-muted small mb-0">
                  {deletingItem.category_name}
                </p>
                {deleteError && (
                  <div className="alert alert-danger py-1 px-2 small mt-3 mb-0">
                    {deleteError}
                  </div>
                )}
                {!deleteError && (
                  <p className="text-muted small mb-0 mt-2">
                    Kategori yang masih dipakai transaksi tidak bisa dihapus.
                  </p>
                )}
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setDeletingItem(null)} disabled={saving}>
                  Batal
                </button>
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