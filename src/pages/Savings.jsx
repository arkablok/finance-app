import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, PiggyBank, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle,
  AlertTriangle, X, Target, TrendingUp, Clock, CheckCircle2, Ban,
  ChevronLeft, ChevronRight, History
} from 'lucide-react';
import { savings as savingsApi, formatRupiah, formatTanggal } from '../api/api';

const PRIORITIES = [
  { value: 'high', label: 'Tinggi', color: '#dc2626' },
  { value: 'medium', label: 'Sedang', color: '#f59e0b' },
  { value: 'low', label: 'Rendah', color: '#64748b' },
];

const STATUSES = [
  { value: '', label: 'Semua' },
  { value: 'active', label: 'Aktif' },
  { value: 'achieved', label: 'Tercapai' },
  { value: 'cancelled', label: 'Dibatalkan' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function emptyGoalForm() {
  const now = new Date();
  return {
    goal_name: '',
    description: '',
    target_amount: '',
    start_date: now.toISOString().slice(0, 10),
    target_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10),
    priority: 'medium',
    icon: 'target',
  };
}

export default function Savings() {
  // Data
  const [goals, setGoals] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal goal form (create/edit)
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [goalForm, setGoalForm] = useState(emptyGoalForm());
  const [goalFormError, setGoalFormError] = useState('');

  // Modal deposit/withdrawal
  const [showTxModal, setShowTxModal] = useState(false);
  const [txGoal, setTxGoal] = useState(null); // goal object
  const [txForm, setTxForm] = useState({ type: 'deposit', amount: '', description: '', transaction_date: todayIso() });
  const [txError, setTxError] = useState('');

  // Modal history
  const [showHistory, setShowHistory] = useState(false);
  const [historyGoal, setHistoryGoal] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Konfirmasi hapus
  const [deletingGoal, setDeletingGoal] = useState(null);
  // Konfirmasi cancel
  const [cancellingGoal, setCancellingGoal] = useState(null);

  // ---------- Load goals ----------
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const params = {};
    if (filterStatus) params.status = filterStatus;
    const r = await savingsApi.goals.list(params);
    if (r.ok) setGoals(r.data);
    else setError(r.message || 'Gagal memuat goals');
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  // ---------- Derived ----------
  const summary = useMemo(() => {
    const totalTarget = goals.reduce((s, g) => s + (g.target_amount || 0), 0);
    const totalSaved = goals.reduce((s, g) => s + (g.current_amount || 0), 0);
    const achievedCount = goals.filter((g) => g.status === 'achieved').length;
    return { totalTarget, totalSaved, achievedCount, count: goals.length };
  }, [goals]);

  // ---------- Goal form handlers ----------
  function openCreateGoal() {
    setEditingGoalId(null);
    setGoalForm(emptyGoalForm());
    setGoalFormError('');
    setShowGoalForm(true);
  }

  function openEditGoal(g) {
    setEditingGoalId(g.goal_id);
    setGoalForm({
      goal_name: g.goal_name,
      description: g.description || '',
      target_amount: String(g.target_amount),
      start_date: g.start_date,
      target_date: g.target_date,
      priority: g.priority,
      icon: g.icon || 'target',
    });
    setGoalFormError('');
    setShowGoalForm(true);
  }

  async function submitGoal(e) {
    e.preventDefault();
    setGoalFormError('');

    const target = Number(goalForm.target_amount);
    if (!goalForm.goal_name.trim()) { setGoalFormError('Nama goal wajib diisi'); return; }
    if (!isFinite(target) || target <= 0) { setGoalFormError('Target harus angka > 0'); return; }
    if (!goalForm.start_date || !goalForm.target_date) { setGoalFormError('Tanggal wajib diisi'); return; }
    if (goalForm.target_date < goalForm.start_date) { setGoalFormError('Tanggal target tidak boleh sebelum tanggal mulai'); return; }

    const payload = {
      goal_name: goalForm.goal_name.trim(),
      description: goalForm.description.trim(),
      target_amount: target,
      start_date: goalForm.start_date,
      target_date: goalForm.target_date,
      priority: goalForm.priority,
      icon: goalForm.icon,
    };

    setSaving(true);
    const r = editingGoalId
      ? await savingsApi.goals.update({ goal_id: editingGoalId, ...payload })
      : await savingsApi.goals.create(payload);
    setSaving(false);

    if (r.ok) {
      setShowGoalForm(false);
      setNotice(editingGoalId ? 'Goal diperbarui' : 'Goal ditambahkan');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setGoalFormError(r.message || 'Gagal menyimpan');
    }
  }

  async function handleDeleteGoal() {
    if (!deletingGoal) return;
    setSaving(true);
    const r = await savingsApi.goals.remove({ goal_id: deletingGoal.goal_id });
    setSaving(false);
    setDeletingGoal(null);
    if (r.ok) {
      setNotice('Goal dihapus');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setError(r.message || 'Gagal menghapus');
    }
  }

  async function handleCancelGoal() {
    if (!cancellingGoal) return;
    setSaving(true);
    const r = await savingsApi.goals.update({ goal_id: cancellingGoal.goal_id, status: 'cancelled' });
    setSaving(false);
    setCancellingGoal(null);
    if (r.ok) {
      setNotice('Goal dibatalkan');
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setError(r.message || 'Gagal membatalkan');
    }
  }

  // ---------- Deposit/Withdrawal handlers ----------
  function openTxModal(g, type) {
    setTxGoal(g);
    setTxForm({ type, amount: '', description: '', transaction_date: todayIso() });
    setTxError('');
    setShowTxModal(true);
  }

  async function submitTx(e) {
    e.preventDefault();
    setTxError('');

    const amount = Number(txForm.amount);
    if (!isFinite(amount) || amount <= 0) { setTxError('Jumlah harus angka > 0'); return; }
    if (!txForm.transaction_date) { setTxError('Tanggal wajib diisi'); return; }

    setSaving(true);
    const r = await savingsApi.history.create({
      goal_id: txGoal.goal_id,
      type: txForm.type,
      amount,
      description: txForm.description.trim(),
      transaction_date: txForm.transaction_date,
    });
    setSaving(false);

    if (r.ok) {
      setShowTxModal(false);
      setNotice(`${txForm.type === 'deposit' ? 'Deposit' : 'Penarikan'} berhasil`);
      setTimeout(() => setNotice(''), 3000);
      load();
    } else {
      setTxError(r.message || 'Gagal menyimpan');
    }
  }

  // ---------- History handlers ----------
  async function openHistory(g, page = 1) {
    setHistoryGoal(g);
    setHistoryPage(page);
    setShowHistory(true);
    setHistoryLoading(true);
    const r = await savingsApi.history.list({ goal_id: g.goal_id, page, page_size: 20 });
    setHistoryLoading(false);
    if (r.ok) {
      setHistoryItems(r.data.items);
      setHistoryTotalPages(r.data.total_pages || 1);
    } else {
      setHistoryItems([]);
    }
  }

  async function changeHistoryPage(p) {
    if (!historyGoal) return;
    setHistoryPage(p);
    setHistoryLoading(true);
    const r = await savingsApi.history.list({ goal_id: historyGoal.goal_id, page: p, page_size: 20 });
    setHistoryLoading(false);
    if (r.ok) {
      setHistoryItems(r.data.items);
      setHistoryTotalPages(r.data.total_pages || 1);
    }
  }

  // ---------- Render helpers ----------
  const priorityBadge = (p) => {
    const pr = PRIORITIES.find((x) => x.value === p) || PRIORITIES[1];
    return (
      <span className="badge rounded-pill" style={{ background: `${pr.color}22`, color: pr.color, fontWeight: 600 }}>
        {pr.label}
      </span>
    );
  };

  const statusBadge = (s) => {
    if (s === 'achieved') {
      return <span className="badge rounded-pill bg-success-subtle text-success d-inline-flex align-items-center gap-1"><CheckCircle2 size={12} />Tercapai</span>;
    }
    if (s === 'cancelled') {
      return <span className="badge rounded-pill bg-secondary-subtle text-secondary d-inline-flex align-items-center gap-1"><Ban size={12} />Dibatalkan</span>;
    }
    return <span className="badge rounded-pill bg-primary-subtle text-primary d-inline-flex align-items-center gap-1"><Clock size={12} />Aktif</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Tabungan</h2>
          <p className="text-muted mb-0 small">
            {summary.count} goal · {summary.achievedCount} tercapai
          </p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={openCreateGoal}>
          <Plus size={16} /> Goal Baru
        </button>
      </div>

      {notice && <div className="alert alert-success py-2 small">{notice}</div>}
      {error && (
        <div className="alert alert-danger py-2 small d-flex align-items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Ringkasan + filter */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-6">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <PiggyBank size={16} className="text-primary" />
              <span className="label mb-0">Total Ditabung</span>
            </div>
            <div className="value">{formatRupiah(summary.totalSaved)}</div>
            <small className="text-muted">dari target {formatRupiah(summary.totalTarget)}</small>
          </div>
        </div>
        <div className="col-6 col-lg-6">
          <div className="card-stat">
            <label className="form-label small mb-1">Filter Status</label>
            <select
              className="form-select form-select-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Goals list */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0 small">Memuat goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="card-stat text-center py-5">
          <Target size={40} className="text-muted mb-3" />
          <p className="text-muted mb-3">Belum ada target tabungan</p>
          <button className="btn btn-primary btn-sm d-flex align-items-center gap-2 mx-auto" onClick={openCreateGoal}>
            <Plus size={14} /> Buat Goal Pertama
          </button>
        </div>
      ) : (
        <div className="row g-3">
          {goals.map((g) => {
            const isCancelled = g.status === 'cancelled';
            return (
              <div key={g.goal_id} className="col-12 col-md-6 col-lg-4">
                <div className="card-stat h-100 d-flex flex-column" style={{ opacity: isCancelled ? 0.65 : 1 }}>
                  <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <div className="min-w-0">
                      <h6 className="mb-1 text-truncate">{g.goal_name}</h6>
                      <div className="d-flex gap-1 flex-wrap">
                        {priorityBadge(g.priority)}
                        {statusBadge(g.status)}
                      </div>
                    </div>
                    <div className="d-flex gap-1 flex-shrink-0">
                      {!isCancelled && (
                        <>
                          <button className="btn btn-sm btn-light" title="Edit" onClick={() => openEditGoal(g)}>
                            <Pencil size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {g.description && (
                    <p className="small text-muted mb-2">{g.description}</p>
                  )}

                  <div className="mb-2">
                    <div className="d-flex justify-content-between small mb-1">
                      <span className="fw-medium">{formatRupiah(g.current_amount)}</span>
                      <span className="text-muted">{g.progress_percent}%</span>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                      <div
                        className="progress-bar"
                        style={{
                          width: `${g.progress_percent}%`,
                          backgroundColor: g.status === 'achieved' ? 'var(--color-success)' : 'var(--color-primary)',
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <div className="d-flex justify-content-between small text-muted mt-1">
                      <span>Target: {formatRupiah(g.target_amount)}</span>
                      <span>{formatTanggal(g.target_date)}</span>
                    </div>
                  </div>

                  <div className="mt-auto d-flex flex-column gap-1">
                    {!isCancelled && (
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-success flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => openTxModal(g, 'deposit')}
                        >
                          <ArrowDownCircle size={14} /> Deposit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                          onClick={() => openTxModal(g, 'withdrawal')}
                          disabled={g.current_amount <= 0}
                        >
                          <ArrowUpCircle size={14} /> Tarik
                        </button>
                      </div>
                    )}
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-light flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                        onClick={() => openHistory(g)}
                      >
                        <History size={13} /> Riwayat
                      </button>
                      {g.status === 'active' && (
                        <button
                          className="btn btn-sm btn-light text-warning"
                          title="Batalkan goal"
                          onClick={() => setCancellingGoal(g)}
                        >
                          <Ban size={13} />
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-light text-danger"
                        title="Hapus goal"
                        onClick={() => setDeletingGoal(g)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== MODAL: Goal Form ========== */}
      {showGoalForm && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingGoalId ? 'Edit Goal' : 'Goal Baru'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowGoalForm(false)} disabled={saving} />
              </div>
              <form onSubmit={submitGoal}>
                <div className="modal-body">
                  {goalFormError && <div className="alert alert-danger py-2 small">{goalFormError}</div>}

                  <div className="mb-3">
                    <label className="form-label small">Nama Goal</label>
                    <input
                      type="text"
                      className="form-control"
                      value={goalForm.goal_name}
                      onChange={(e) => setGoalForm((f) => ({ ...f, goal_name: e.target.value }))}
                      placeholder="Contoh: Dana Darurat"
                      maxLength={80}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Deskripsi</label>
                    <input
                      type="text"
                      className="form-control"
                      value={goalForm.description}
                      onChange={(e) => setGoalForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Opsional"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Target Jumlah</label>
                    <input
                      type="number"
                      className="form-control"
                      value={goalForm.target_amount}
                      onChange={(e) => setGoalForm((f) => ({ ...f, target_amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small">Tanggal Mulai</label>
                      <input
                        type="date"
                        className="form-control"
                        value={goalForm.start_date}
                        onChange={(e) => setGoalForm((f) => ({ ...f, start_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Target Tanggal</label>
                      <input
                        type="date"
                        className="form-control"
                        value={goalForm.target_date}
                        onChange={(e) => setGoalForm((f) => ({ ...f, target_date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Prioritas</label>
                    <select
                      className="form-select"
                      value={goalForm.priority}
                      onChange={(e) => setGoalForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowGoalForm(false)} disabled={saving}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2" />Menyimpan...</> : (editingGoalId ? 'Simpan Perubahan' : 'Simpan')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Deposit/Withdrawal ========== */}
      {showTxModal && txGoal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {txForm.type === 'deposit' ? 'Deposit' : 'Tarik Dana'}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowTxModal(false)} disabled={saving} />
              </div>
              <form onSubmit={submitTx}>
                <div className="modal-body">
                  {txError && <div className="alert alert-danger py-2 small">{txError}</div>}
                  <p className="small text-muted mb-3">
                    Goal: <strong>{txGoal.goal_name}</strong><br />
                    Saldo saat ini: <strong>{formatRupiah(txGoal.current_amount)}</strong>
                  </p>

                  <div className="mb-3">
                    <label className="form-label small">Jumlah</label>
                    <input
                      type="number"
                      className="form-control"
                      value={txForm.amount}
                      onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small">Keterangan</label>
                    <input
                      type="text"
                      className="form-control"
                      value={txForm.description}
                      onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Opsional"
                      maxLength={300}
                    />
                  </div>

                  <div className="mb-0">
                    <label className="form-label small">Tanggal</label>
                    <input
                      type="date"
                      className="form-control"
                      value={txForm.transaction_date}
                      onChange={(e) => setTxForm((f) => ({ ...f, transaction_date: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowTxModal(false)} disabled={saving}>
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`btn btn-sm ${txForm.type === 'deposit' ? 'btn-success' : 'btn-danger'}`}
                    disabled={saving}
                  >
                    {saving ? 'Memproses...' : (txForm.type === 'deposit' ? 'Deposit' : 'Tarik')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: History ========== */}
      {showHistory && historyGoal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title d-flex align-items-center gap-2">
                  <History size={18} /> Riwayat: {historyGoal.goal_name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowHistory(false)} />
              </div>
              <div className="modal-body">
                {historyLoading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" />
                  </div>
                ) : historyItems.length === 0 ? (
                  <p className="text-muted text-center py-4 mb-0 small">Belum ada riwayat</p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {historyItems.map((h) => {
                      const isDeposit = h.type === 'deposit';
                      return (
                        <div key={h.history_id} className="d-flex align-items-center gap-2 py-2 border-bottom">
                          <div
                            className="d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: isDeposit ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                              color: isDeposit ? 'var(--color-success)' : 'var(--color-danger)',
                            }}
                          >
                            {isDeposit ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                          </div>
                          <div className="flex-grow-1 min-w-0">
                            <div className="small fw-medium text-truncate">
                              {h.description || (isDeposit ? 'Deposit' : 'Penarikan')}
                            </div>
                            <small className="text-muted">{formatTanggal(h.transaction_date)}</small>
                          </div>
                          <div className={`fw-bold small flex-shrink-0 ${isDeposit ? 'text-success' : 'text-danger'}`}>
                            {isDeposit ? '+' : '-'} {formatRupiah(h.amount)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {historyTotalPages > 1 && (
                <div className="modal-footer justify-content-center">
                  <button className="btn btn-sm btn-outline-secondary" disabled={historyPage <= 1} onClick={() => changeHistoryPage(historyPage - 1)}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className="small text-muted">{historyPage} / {historyTotalPages}</span>
                  <button className="btn btn-sm btn-outline-secondary" disabled={historyPage >= historyTotalPages} onClick={() => changeHistoryPage(historyPage + 1)}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Konfirmasi Hapus ========== */}
      {deletingGoal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <Trash2 size={32} className="text-danger mb-3" />
                <p className="mb-1 fw-medium">Hapus goal ini?</p>
                <p className="text-muted small mb-0">{deletingGoal.goal_name}</p>
                <p className="text-muted small mb-0 mt-2">Goal dengan riwayat tidak bisa dihapus. Gunakan tombol Batalkan.</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setDeletingGoal(null)} disabled={saving}>Batal</button>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteGoal} disabled={saving}>
                  {saving ? 'Menghapus...' : 'Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODAL: Konfirmasi Cancel ========== */}
      {cancellingGoal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ background: 'rgba(15,23,42,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <Ban size={32} className="text-warning mb-3" />
                <p className="mb-1 fw-medium">Batalkan goal ini?</p>
                <p className="text-muted small mb-0">{cancellingGoal.goal_name}</p>
                <p className="text-muted small mb-0 mt-2">Goal yang dibatalkan tidak bisa diisi lagi, tapi riwayat tetap tersimpan.</p>
              </div>
              <div className="modal-footer justify-content-center">
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setCancellingGoal(null)} disabled={saving}>Batal</button>
                <button className="btn btn-warning btn-sm" onClick={handleCancelGoal} disabled={saving}>
                  {saving ? 'Memproses...' : 'Batalkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}