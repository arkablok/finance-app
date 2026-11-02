import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, Target, ArrowRight,
  AlertTriangle, PiggyBank, Calendar, ChevronLeft, ChevronRight,
  Filter, X
} from 'lucide-react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler
} from 'chart.js';
import {
  transactions, budgets, savings, formatRupiah, namaBulan, categories as categoriesApi
} from '../api/api';
import { useAuth } from '../context/AuthContext';

ChartJS.register(
  ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, Filler
);

const BULAN_SINGKAT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const TAHUN_MIN = 2020;
const TAHUN_MAX = new Date().getFullYear() + 1;

function getDefaultPeriod() {
  const now = new Date();
  return { mode: 'monthly', month: now.getMonth() + 1, year: now.getFullYear() };
}

function periodRange(mode, month, year) {
  if (mode === 'yearly') {
    return { from_date: year + '-01-01', to_date: year + '-12-31' };
  }
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from_date: year + '-' + ('0' + month).slice(-2) + '-01',
    to_date: year + '-' + ('0' + month).slice(-2) + '-' + ('0' + lastDay).slice(-2),
  };
}

function trendMonths(mode, month, year) {
  const out = [];
  if (mode === 'yearly') {
    for (let m = 1; m <= 12; m++) out.push({ month: m, year: year, label: BULAN_SINGKAT[m - 1] });
  } else {
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      out.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: BULAN_SINGKAT[d.getMonth()] + ' ' + String(d.getFullYear()).slice(-2),
      });
    }
  }
  return out;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [period, setPeriod] = useState(getDefaultPeriod);
  const [showFilter, setShowFilter] = useState(false); // default tertutup
  const [summary, setSummary] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState(null);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trend, setTrend] = useState([]);

  const months = useMemo(
    () => trendMonths(period.mode, period.month, period.year),
    [period.mode, period.month, period.year]
  );

  const range = useMemo(
    () => periodRange(period.mode, period.month, period.year),
    [period.mode, period.month, period.year]
  );

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError('');

    try {
      const isMonthly = period.mode === 'monthly';

      const summaryReq = transactions.summary(range);
      const budgetReq = isMonthly
        ? budgets.status({ month: period.month, year: period.year })
        : Promise.resolve({ ok: true, data: null });
      const goalsReq = savings.goals.list({});
      const catsReq = categoriesApi.list({});
      const trendReqs = months.map((m) => transactions.summary({ month: m.month, year: m.year }));

      const [rSummary, rBudget, rGoals, rCats, ...rTrends] = await Promise.all([
        summaryReq, budgetReq, goalsReq, catsReq, ...trendReqs,
      ]);

      if (signal && signal.cancelled) return;

      if (!rSummary.ok) {
        setError(rSummary.message || 'Gagal memuat ringkasan');
        setLoading(false);
        return;
      }

      setSummary(rSummary.data);
      setBudgetStatus(rBudget.ok ? rBudget.data : null);
      setGoals(rGoals.ok ? rGoals.data.slice(0, 3) : []);
      setCategories(rCats.ok ? rCats.data : []);

      const trendData = months.map((m, i) => {
        const r = rTrends[i];
        return {
          label: m.label,
          income: r.ok ? r.data.income : 0,
          expense: r.ok ? r.data.expense : 0,
        };
      });
      setTrend(trendData);
      setLoading(false);
    } catch (err) {
      if (signal && signal.cancelled) return;
      console.error('Dashboard load error:', err);
      setError('Dashboard error: ' + (err?.message || String(err)));
      setLoading(false);
    }
  }, [period.mode, period.month, period.year, months, range]);

  useEffect(() => {
    const signal = { cancelled: false };
    load(signal);
    return () => { signal.cancelled = true; };
  }, [load]);

  // Derived
  const categoryMap = useMemo(() => {
    const map = {};
    categories.forEach((c) => { map[c.category_id] = c; });
    return map;
  }, [categories]);

  const doughnutData = useMemo(() => {
    if (!summary || !summary.by_category) return null;
    const expenseCats = summary.by_category
      .filter((c) => c.expense > 0)
      .map((c) => {
        const cat = categoryMap[c.category_id];
        return {
          name: cat ? cat.category_name : 'Lainnya',
          color: cat ? cat.color : '#94a3b8',
          value: c.expense,
        };
      })
      .sort((a, b) => b.value - a.value);

    if (expenseCats.length === 0) return null;

    return {
      labels: expenseCats.map((c) => c.name),
      datasets: [{
        data: expenseCats.map((c) => c.value),
        backgroundColor: expenseCats.map((c) => c.color),
        borderWidth: 0,
      }],
    };
  }, [summary, categoryMap]);

  const lineData = useMemo(() => {
    if (trend.length === 0) return null;
    return {
      labels: trend.map((t) => t.label),
      datasets: [
        {
          label: 'Pemasukan',
          data: trend.map((t) => t.income),
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22, 163, 74, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
        {
          label: 'Pengeluaran',
          data: trend.map((t) => t.expense),
          borderColor: '#dc2626',
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    };
  }, [trend]);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatRupiah(ctx.parsed.y)}` },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => formatRupiah(v).replace('Rp ', ''), font: { size: 10 } },
        grid: { color: 'rgba(15,23,42,0.05)' },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 }, padding: 12 } },
      tooltip: {
        callbacks: { label: (ctx) => `${ctx.label}: ${formatRupiah(ctx.parsed)}` },
      },
    },
  };

  function shiftPeriod(delta) {
    setPeriod((p) => {
      if (p.mode === 'yearly') return { ...p, year: p.year + delta };
      let m = p.month + delta;
      let y = p.year;
      if (m < 1) { m = 12; y -= 1; }
      if (m > 12) { m = 1; y += 1; }
      return { ...p, month: m, year: y };
    });
  }

  function resetToCurrent() {
    setPeriod(getDefaultPeriod());
  }

  function setMode(mode) {
    setPeriod((p) => ({ ...p, mode }));
  }

  const isCurrent = useMemo(() => {
    const now = new Date();
    if (period.mode === 'yearly') return period.year === now.getFullYear();
    return period.month === now.getMonth() + 1 && period.year === now.getFullYear();
  }, [period.mode, period.month, period.year]);

  const periodLabel = period.mode === 'yearly'
    ? `Tahun ${period.year}`
    : `${namaBulan(period.month)} ${period.year}`;

  // ---------- Render ----------
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Halo, {user?.nama || 'Pengguna'} 👋</h2>
          <p className="text-muted mb-0 small">
            Ringkasan {period.mode === 'yearly' ? 'tahunan' : 'bulanan'} · {periodLabel}
          </p>
        </div>
      </div>

      {/* Bar periode kompak + toggle filter */}
      <div className="period-bar mb-4">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <span className={`period-chip ${!isCurrent ? 'active' : ''}`}>
            <Calendar size={14} />
            {periodLabel}
            {!isCurrent && (
              <button
                className="btn-close btn-close-sm ms-1"
                aria-label="Reset ke periode berjalan"
                onClick={resetToCurrent}
                style={{ fontSize: '0.55rem' }}
              />
            )}
          </span>

          <button
            className={`btn btn-sm ${showFilter ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-1`}
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={14} />
            <span className="d-none d-sm-inline">Filter</span>
          </button>

          {!showFilter && !isCurrent && (
            <button className="btn btn-sm btn-link text-decoration-none p-0 small" onClick={resetToCurrent}>
              Reset
            </button>
          )}
        </div>

        {/* Panel filter, collapsed by default */}
        {showFilter && (
          <div className="period-panel mt-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-sm-6 col-md-3">
                <label className="form-label small mb-1">Mode</label>
                <div className="btn-group btn-group-sm w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${period.mode === 'monthly' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setMode('monthly')}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    className={`btn ${period.mode === 'yearly' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setMode('yearly')}
                  >
                    Tahunan
                  </button>
                </div>
              </div>

              {period.mode === 'monthly' && (
                <div className="col-6 col-sm-3 col-md-3">
                  <label className="form-label small mb-1">Bulan</label>
                  <select
                    className="form-select form-select-sm"
                    value={period.month}
                    onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{namaBulan(m)}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-6 col-sm-3 col-md-3">
                <label className="form-label small mb-1">Tahun</label>
                <select
                  className="form-select form-select-sm"
                  value={period.year}
                  onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))}
                >
                  {Array.from({ length: TAHUN_MAX - TAHUN_MIN + 1 }, (_, i) => TAHUN_MIN + i).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="col-12 col-sm-6 col-md-3">
                <div className="d-flex gap-1">
                  <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => shiftPeriod(-1)}>
                    <ChevronLeft size={14} />
                  </button>
                  <button className="btn btn-sm btn-outline-secondary flex-fill" onClick={() => shiftPeriod(1)}>
                    <ChevronRight size={14} />
                  </button>
                  <button className="btn btn-sm btn-outline-primary flex-fill" onClick={resetToCurrent}>
                    Sekarang
                  </button>
                </div>
              </div>
            </div>

            <div className="text-end mt-2">
              <button className="btn btn-sm btn-link text-decoration-none p-0 small" onClick={() => setShowFilter(false)}>
                <X size={12} /> Tutup
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Loading / error / normal */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="text-muted mt-3 mb-0">Memuat dashboard...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <AlertTriangle size={18} /> {error}
        </div>
      ) : (
        <DashboardContent
          summary={summary}
          budgetStatus={budgetStatus}
          goals={goals}
          period={period}
          periodLabel={periodLabel}
          doughnutData={doughnutData}
          doughnutOptions={doughnutOptions}
          lineData={lineData}
          lineOptions={lineOptions}
        />
      )}
    </div>
  );
}

/** Konten dashboard (dipisah supaya logika filter tidak berantakan). */
function DashboardContent({
  summary, budgetStatus, goals, period, periodLabel,
  doughnutData, doughnutOptions, lineData, lineOptions
}) {
  const income = summary?.income || 0;
  const expense = summary?.expense || 0;
  const balance = summary?.balance || 0;
  const budgetRemaining = budgetStatus?.summary?.total_remaining || 0;
  const overBudgetCount = budgetStatus?.summary?.over_budget_count || 0;

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3">
          <div className="card-stat income">
            <div className="d-flex align-items-center gap-2 mb-1">
              <TrendingUp size={16} className="text-success" />
              <span className="label mb-0">Pemasukan</span>
            </div>
            <div className="value">{formatRupiah(income)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat expense">
            <div className="d-flex align-items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-danger" />
              <span className="label mb-0">Pengeluaran</span>
            </div>
            <div className="value">{formatRupiah(expense)}</div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Wallet size={16} className="text-primary" />
              <span className="label mb-0">Saldo</span>
            </div>
            <div className="value" style={{ color: balance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {formatRupiah(balance)}
            </div>
          </div>
        </div>
        <div className="col-6 col-lg-3">
          <div className="card-stat">
            <div className="d-flex align-items-center gap-2 mb-1">
              <Target size={16} className="text-warning" />
              <span className="label mb-0">
                {period.mode === 'yearly' ? 'Budget' : 'Sisa Budget'}
              </span>
            </div>
            {period.mode === 'yearly' ? (
              <div className="value" style={{ fontSize: '0.95rem', color: 'var(--color-muted)' }}>
                Mode bulanan
              </div>
            ) : (
              <>
                <div className="value" style={{ color: budgetRemaining >= 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>
                  {formatRupiah(budgetRemaining)}
                </div>
                {overBudgetCount > 0 && (
                  <small className="text-danger d-flex align-items-center gap-1 mt-1">
                    <AlertTriangle size={12} /> {overBudgetCount} budget terlampaui
                  </small>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-lg-5">
          <div className="card-stat h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold">Pengeluaran per Kategori</h6>
              <Calendar size={16} className="text-muted" />
            </div>
            {doughnutData ? (
              <div style={{ height: 260 }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            ) : (
              <p className="text-muted text-center py-4 mb-0 small">
                Belum ada pengeluaran di periode ini
              </p>
            )}
          </div>
        </div>
        <div className="col-12 col-lg-7">
          <div className="card-stat h-100">
            <h6 className="mb-3 fw-bold">
              {period.mode === 'yearly' ? 'Tren 12 Bulan ' + period.year : 'Tren 6 Bulan Terakhir'}
            </h6>
            {lineData ? (
              <div style={{ height: 260 }}>
                <Line data={lineData} options={lineOptions} />
              </div>
            ) : (
              <p className="text-muted text-center py-4 mb-0 small">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card-stat h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <Target size={16} /> Budget {period.mode === 'yearly' ? '(bulanan)' : 'Bulan Ini'}
              </h6>
              <Link to="/budgets" className="small text-decoration-none d-flex align-items-center gap-1">
                Lihat <ArrowRight size={12} />
              </Link>
            </div>
            {period.mode === 'yearly' ? (
              <p className="text-muted small mb-0">
                Budget bersifat bulanan. Ganti ke mode bulanan untuk melihat detail.
              </p>
            ) : budgetStatus && budgetStatus.items.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {budgetStatus.items.slice(0, 4).map((b) => (
                  <div key={b.budget_id}>
                    <div className="d-flex justify-content-between align-items-center mb-1 small">
                      <span className="fw-medium">{b.category_name}</span>
                      <span className={b.over_budget ? 'text-danger fw-bold' : 'text-muted'}>
                        {formatRupiah(b.spent)} / {formatRupiah(b.limit_amount)}
                      </span>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${Math.min(100, b.percent_used)}%`,
                          backgroundColor: b.over_budget ? 'var(--color-danger)' : b.percent_used >= 80 ? '#f59e0b' : 'var(--color-primary)',
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted small mb-0">Belum ada budget. <Link to="/budgets">Buat sekarang</Link></p>
            )}
          </div>
        </div>

        <div className="col-12 col-lg-6">
          <div className="card-stat h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0 fw-bold d-flex align-items-center gap-2">
                <PiggyBank size={16} /> Target Tabungan
              </h6>
              <Link to="/savings" className="small text-decoration-none d-flex align-items-center gap-1">
                Lihat <ArrowRight size={12} />
              </Link>
            </div>
            {goals.length > 0 ? (
              <div className="d-flex flex-column gap-3">
                {goals.map((g) => (
                  <div key={g.goal_id}>
                    <div className="d-flex justify-content-between align-items-center mb-1 small">
                      <span className="fw-medium">{g.goal_name}</span>
                      <span className="text-muted">{g.progress_percent}%</span>
                    </div>
                    <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{
                          width: `${g.progress_percent}%`,
                          backgroundColor: g.status === 'achieved' ? 'var(--color-success)' : 'var(--color-primary)',
                          borderRadius: 4,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <small className="text-muted">
                      {formatRupiah(g.current_amount)} / {formatRupiah(g.target_amount)}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted small mb-0">Belum ada target. <Link to="/savings">Buat sekarang</Link></p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}