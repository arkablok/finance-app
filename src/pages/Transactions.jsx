import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Filter, X, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, ChevronLeft, ChevronRight, Wallet
} from 'lucide-react';
import {
  transactions as txApi, categories as catApi, formatRupiah
} from '../api/api';

const PAYMENT_METHODS = ['cash', 'transfer', 'debit', 'credit', 'e-wallet', 'lainnya'];

function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    type: 'expense',
    amount: '',
    category_id: '',
    description: '',
    payment_method: 'cash',
    transaction_date: todayIso(),
  };
}

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [deletingItem, setDeletingItem] = useState(null);

  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.category_id] = c;
    });
    return map;
  }, [categories]);

  const categoriesForForm = useMemo(() => {
    return categories.filter((c) => c.type === form.type);
  }, [categories, form.type]);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      try {
        const r = await catApi.list({});
        if (mounted && r.ok) {
          setCategories(Array.isArray(r.data) ? r.data : []);
        }
      } catch (err) {
        console.error('CATEGORY API ERROR:', err);
      }
    }

    loadCategories();

    return () => {
      mounted = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const params = {
      page,
      page_size: 20,
    };

    if (filterType) params.type = filterType;
    if (filterCategory) params.category_id = filterCategory;
    if (fromDate) params.from_date = fromDate;
    if (toDate) params.to_date = toDate;

    try {
      const r = await txApi.list(params);

      if (r.ok) {
        const data = r.data || {};

        const transactionItems = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
            ? data
            : [];

        setItems(transactionItems);
        setTotalPages(Number(data.total_pages) || 1);
        setTotal(Number(data.total) || transactionItems.length);
      } else {
        setItems([]);
        setTotal(0);
        setTotalPages(1);
        setError(r.message || 'Gagal memuat transaksi');
      }
    } catch (err) {
      console.error('TRANSACTION LOAD ERROR:', err);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setError(err.message || 'Terjadi kesalahan saat mengambil transaksi');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterCategory, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filterType, filterCategory, fromDate, toDate]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setFormError('');
    setShowForm(true);
  }

  function openEdit(tx) {
    setEditingId(tx.transaction_id);
    setForm({
      type: tx.type,
      amount: String(tx.amount),
      category_id: String(tx.category_id),
      description: tx.description || '',
      payment_method: tx.payment_method || 'cash',
      transaction_date: String(tx.transaction_date).slice(0, 10),
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const amount = Number(form.amount);

    if (!isFinite(amount) || amount <= 0) {
      setFormError('Jumlah harus angka lebih dari 0');
      return;
    }

    if (!form.category_id) {
      setFormError('Pilih kategori');
      return;
    }

    if (!form.transaction_date) {
      setFormError('Tanggal wajib diisi');
      return;
    }

    const payload = {
      type: form.type,
      amount,
      category_id: form.category_id,
      description: form.description.trim(),
      payment_method: form.payment_method,
      transaction_date: form.transaction_date,
    };

    setSaving(true);

    try {
      const r = editingId
        ? await txApi.update({
            transaction_id: editingId,
            ...payload,
          })
        : await txApi.create(payload);

      if (r.ok) {
        setShowForm(false);
        setNotice(editingId ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
        setTimeout(() => setNotice(''), 3000);

        if (page !== 1) {
          setPage(1);
        } else {
          await load();
        }
      } else {
        setFormError(r.message || 'Gagal menyimpan transaksi');
      }
    } catch (err) {
      setFormError(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingItem) return;

    setSaving(true);

    try {
      const r = await txApi.remove({
        transaction_id: deletingItem.transaction_id,
      });

      if (r.ok) {
        setDeletingItem(null);
        setNotice('Transaksi berhasil dihapus');
        setTimeout(() => setNotice(''), 3000);
        await load();
      } else {
        setError(r.message || 'Gagal menghapus transaksi');
        setDeletingItem(null);
      }
    } catch (err) {
      setError(err.message || 'Terjadi kesalahan saat menghapus');
      setDeletingItem(null);
    } finally {
      setSaving(false);
    }
  }

  function resetFilters() {
    setFilterType('');
    setFilterCategory('');
    setFromDate('');
    setToDate('');
  }

  const activeFilterCount = [
    filterType,
    filterCategory,
    fromDate,
    toDate,
  ].filter(Boolean).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Transaksi</h2>
          <p className="text-muted mb-0 small">
            {total} transaksi ditemukan
          </p>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={16} />
            <span className="d-none d-sm-inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="badge bg-primary rounded-pill">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            className="btn btn-primary d-flex align-items-center gap-2"
            onClick={openCreate}
          >
            <Plus size={16} />
            <span className="d-none d-sm-inline">Tambah</span>
          </button>
        </div>
      </div>

      {notice && (
        <div className="alert alert-success py-2 small">
          {notice}
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {showFilter && (
        <div className="card-stat mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-6 col-md-3">
              <label className="form-label small mb-1">Tipe</label>
              <select
                className="form-select form-select-sm"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">Semua</option>
                <option value="income">Pemasukan</option>
                <option value="expense">Pengeluaran</option>
              </select>
            </div>

            <div className="col-6 col-md-3">
              <label className="form-label small mb-1">Kategori</label>
              <select
                className="form-select form-select-sm"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Semua</option>
                {categories
                  .filter((c) => !filterType || c.type === filterType)
                  .map((c) => (
                    <option
                      key={c.category_id}
                      value={c.category_id}
                    >
                      {c.category_name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Dari</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-6 col-md-2">
              <label className="form-label small mb-1">Sampai</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-12 col-md-2">
              <button
                className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-1"
                onClick={resetFilters}
              >
                <X size={14} />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0 small">
            Memuat transaksi...
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="card-stat text-center py-5">
          <Wallet size={40} className="text-muted mb-3" />
          <p className="text-muted mb-3">
            {error ? 'Transaksi gagal dimuat' : 'Belum ada transaksi'}
          </p>
          {!error && (
            <button
              className="btn btn-primary btn-sm d-flex align-items-center gap-2 mx-auto"
              onClick={openCreate}
            >
              <Plus size={14} />
              Tambah Transaksi Pertama
            </button>
          )}
          {error && (
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={load}
            >
              Coba Lagi
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="d-flex flex-column gap-2">
            {items.map((tx) => {
              const cat = categoryMap[tx.category_id];
              const isIncome = tx.type === 'income';

              return (
                <div key={tx.transaction_id} className="card-stat py-2 px-3">
                  {/* Baris atas: ikon + deskripsi + nominal */}
                  <div className="d-flex align-items-start gap-2">
                    <div
                      className="d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: cat?.color ? `${cat.color}22` : '#f1f5f9',
                        color: cat?.color || '#64748b',
                      }}
                    >
                      {isIncome ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div
                        className="fw-medium text-truncate"
                        style={{ fontSize: '0.92rem', lineHeight: 1.3 }}
                        title={tx.description || cat?.category_name || '(tanpa deskripsi)'}
                      >
                        {tx.description || cat?.category_name || '(tanpa deskripsi)'}
                      </div>
                      <small className="text-muted text-truncate d-block">
                        {cat?.category_name || '-'}
                      </small>
                    </div>

                    <div
                      className={`fw-bold flex-shrink-0 text-end ${isIncome ? 'text-success' : 'text-danger'}`}
                      style={{
                        fontSize: '0.92rem',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.3,
                      }}
                    >
                      {isIncome ? '+' : '-'} {formatRupiah(tx.amount)}
                    </div>
                  </div>

                  {/* Baris bawah: tanggal + aksi */}
                  <div className="d-flex align-items-center justify-content-between mt-2 pt-2 border-top">
                    <small className="text-muted">{tx.transaction_date}</small>

                    <div className="d-flex gap-1">
                      <button
                        className="btn btn-sm btn-light py-1 px-2"
                        title="Edit"
                        onClick={() => openEdit(tx)}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        className="btn btn-sm btn-light text-danger py-1 px-2"
                        title="Hapus"
                        onClick={() => setDeletingItem(tx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>

              <span className="small text-muted">
                Halaman {page} dari {totalPages}
              </span>

              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(15,23,42,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingId ? 'Edit Transaksi' : 'Tambah Transaksi'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeForm}
                  disabled={saving}
                />
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {formError && (
                    <div className="alert alert-danger py-2 small">
                      {formError}
                    </div>
                  )}

                  <div className="btn-group w-100 mb-3" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="transaction-type"
                      id="type-expense"
                      checked={form.type === 'expense'}
                      onChange={() => setForm((f) => ({
                        ...f,
                        type: 'expense',
                        category_id: '',
                      }))}
                    />
                    <label
                      className="btn btn-outline-danger"
                      htmlFor="type-expense"
                    >
                      Pengeluaran
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      name="transaction-type"
                      id="type-income"
                      checked={form.type === 'income'}
                      onChange={() => setForm((f) => ({
                        ...f,
                        type: 'income',
                        category_id: '',
                      }))}
                    />
                    <label
                      className="btn btn-outline-success"
                      htmlFor="type-income"
                    >
                      Pemasukan
                    </label>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Jumlah</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        amount: e.target.value,
                      }))}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Kategori</label>
                    <select
                      className="form-select"
                      value={form.category_id}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        category_id: e.target.value,
                      }))}
                      required
                    >
                      <option value="">Pilih kategori</option>
                      {categoriesForForm.map((c) => (
                        <option
                          key={c.category_id}
                          value={c.category_id}
                        >
                          {c.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Deskripsi</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        description: e.target.value,
                      }))}
                      placeholder="Opsional"
                      maxLength={300}
                    />
                  </div>

                  <div className="row g-2">
                    <div className="col-6">
                      <label className="form-label small">Metode</label>
                      <select
                        className="form-select"
                        value={form.payment_method}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          payment_method: e.target.value,
                        }))}
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-6">
                      <label className="form-label small">Tanggal</label>
                      <input
                        type="date"
                        className="form-control"
                        value={form.transaction_date}
                        onChange={(e) => setForm((f) => ({
                          ...f,
                          transaction_date: e.target.value,
                        }))}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={closeForm}
                    disabled={saving}
                  >
                    Batal
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" />
                        Menyimpan...
                      </>
                    ) : (
                      editingId ? 'Simpan Perubahan' : 'Simpan'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {deletingItem && (
        <div
          className="modal fade show d-block"
          tabIndex="-1"
          style={{ background: 'rgba(15,23,42,0.5)' }}
        >
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <Trash2 size={32} className="text-danger mb-3" />
                <p className="mb-1 fw-medium">
                  Hapus transaksi ini?
                </p>
                <p className="text-muted small mb-0">
                  {deletingItem.description || '(tanpa deskripsi)'} — {formatRupiah(deletingItem.amount)}
                </p>
              </div>

              <div className="modal-footer justify-content-center">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setDeletingItem(null)}
                  disabled={saving}
                >
                  Batal
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                  disabled={saving}
                >
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