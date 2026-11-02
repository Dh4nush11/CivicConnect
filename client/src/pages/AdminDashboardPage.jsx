import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  BarChart3, Table2, FolderKanban, Users, CheckCircle2, TrendingUp,
  CircleDashed, LoaderCircle, CircleX, CopyX, RotateCw, ArrowUpRight, MapPin,
  LayoutDashboard, ListFilter, ChevronRight
} from 'lucide-react';
import { getAnalytics } from '../services/adminService';
import { getIssues } from '../services/issueService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { StatusBadge, PriorityBadge, CategoryBadge, RoleBadge, DotBadge, Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SegmentedControl } from '../components/ui/Misc';
import { Avatar } from '../components/ui/Skeleton';
import { timeAgo } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

const STATUS_CHART = {
  submitted: '#2563eb',
  reported: '#2563eb',
  in_progress: '#d97706',
  'in-progress': '#d97706',
  resolved: '#059669',
};

const CATEGORY_CHART = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#b91c1c',
  '#475569',
];

const VIEW_OPTIONS = [
  { value: 'overview', label: 'Overview', icon: LayoutDashboard },
  { value: 'table', label: 'All Issues', icon: Table2 },
];

function hexToRgb(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('overview');
  const [issues, setIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [filters, setFilters] = useState({ category: 'all', status: 'all', priority: 'all', spamStatus: 'all', area: '' });
  const { user } = useAuth();
  const { showError } = useToast();
  const navigate = useNavigate();

  const fetchAll = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAnalytics();
      if (res.success) setAnalytics(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchIssues = async () => {
    try {
      setIssuesLoading(true);
      const res = await getIssues({
        category: filters.category,
        status: filters.status,
        spamStatus: filters.spamStatus === 'all' ? undefined : filters.spamStatus,
        area: filters.area || undefined,
        limit: 50,
        page: 1,
      });
      if (res.success) setIssues(res.data.issues);
    } catch (err) {
      showError(err.message);
    } finally {
      setIssuesLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (view === 'table') fetchIssues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filters.category, filters.status, filters.priority, filters.spamStatus, filters.area]);

  const textColor = '#334155';
  const textColorMuted = '#94a3b8';
  const gridColor = 'rgba(148, 163, 184, 0.12)';
  const baseTooltip = {
    backgroundColor: '#ffffff',
    titleColor: '#0f172a',
    bodyColor: '#334155',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    titleFont: { family: 'Inter', weight: '600', size: 12 },
    bodyFont: { family: 'Inter', size: 12 },
    boxPadding: 6,
    usePointStyle: true,
    pointStyle: 'circle',
  };

  const doughnutOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 9,
          boxHeight: 9,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          color: textColor,
          font: { family: 'Inter', size: 11, weight: 500 },
        },
      },
      tooltip: baseTooltip,
    },
  }), []);

  const barOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: baseTooltip,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColorMuted, font: { family: 'Inter', size: 10 }, },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: textColorMuted, font: { family: 'Inter', size: 10 }, precision: 0 },
        border: { display: false },
      },
    },
  }), []);

  const lineOpts = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        align: 'start',
        labels: {
          boxWidth: 9,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 14,
          color: textColor,
          font: { family: 'Inter', size: 11, weight: 500 },
        },
      },
      tooltip: baseTooltip,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColorMuted, font: { family: 'Inter', size: 10 }, maxTicksLimit: 8 },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: gridColor, drawBorder: false },
        ticks: { color: textColorMuted, font: { family: 'Inter', size: 10 }, precision: 0 },
        border: { display: false },
      },
    },
    elements: {
      point: { radius: 3, hoverRadius: 5, hitRadius: 20 },
      line: { borderWidth: 2 },
    },
  }), []);

  if (loading) return <Loader />;
  if (error) return <ErrorMessage message={error} onRetry={fetchAll} />;
  if (!analytics) return null;

  const statusLabels = Object.keys(analytics.byStatus || {});
  const statusValues = Object.values(analytics.byStatus || {});
  const statusData = {
    labels: statusLabels.map((l) => {
      if (l === 'in-progress' || l === 'in_progress') return 'In Progress';
      if (l === 'submitted' || l === 'reported') return 'Submitted';
      return l.charAt(0).toUpperCase() + l.slice(1);
    }),
    datasets: [{
      data: statusValues,
      backgroundColor: statusLabels.map((l) => STATUS_CHART[l] || '#64748b'),
      borderWidth: 0,
      hoverOffset: 6,
      spacing: 2,
    }],
  };

  const categoryLabels = Object.keys(analytics.byCategory || {});
  const categoryValues = Object.values(analytics.byCategory || {});
  const categoryData = {
    labels: categoryLabels.map((l) => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{
      label: 'Issues',
      data: categoryValues,
      backgroundColor: categoryLabels.map((_, i) => CATEGORY_CHART[i % CATEGORY_CHART.length]),
      borderRadius: 6,
      borderSkipped: false,
      borderWidth: 0,
      maxBarThickness: 28,
    }],
  };

  const trendData = analytics.trend || [];
  const lineData = {
    labels: trendData.map((d) => d.date.slice(5)),
    datasets: [{
      label: 'Issues reported',
      data: trendData.map((d) => d.count),
      fill: true,
      borderColor: '#1e3a8a',
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return hexToRgb('#1e3a8a', 0.08);
        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, hexToRgb('#1e3a8a', 0.22));
        gradient.addColorStop(1, hexToRgb('#1e3a8a', 0));
        return gradient;
      },
      tension: 0.4,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#1e3a8a',
      pointBorderWidth: 2,
    }],
  };

  const resolutionRate = analytics.totalIssues
    ? Math.round(((analytics.byStatus?.resolved || 0) / analytics.totalIssues) * 100)
    : 0;

  const filteredIssues = issues.filter(
    (i) => filters.priority === 'all' || i.priority === filters.priority
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex items-center justify-center h-11 w-11 rounded-xl bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <DotBadge tone="bg-accent-500" />
                <h1 className="text-2xl sm:text-3xl font-bold font-display text-brand-900 dark:text-paper-100">
                  Municipal Operations
                </h1>
                <RoleBadge role={user?.role} size="sm" />
              </div>
              <p className="text-paper-600 dark:text-paper-400 mt-1 text-sm">
                Manage issues, track status, and monitor city-wide reporting.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/spam"><Button variant="secondary" size="sm">Spam queue</Button></Link>
            {user?.role === 'admin' && <Link to="/admin/users"><Button variant="secondary" size="sm">Users & audit</Button></Link>}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAll}
              iconOnly
              aria-label="Refresh dashboard"
              title="Refresh"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          size="md"
        />
      </div>

      {view === 'overview' ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Issues"
              value={analytics.totalIssues || 0}
              icon={<FolderKanban className="h-4 w-4" />}
              color="brand"
              className="!py-3 !p-4"
            />
            <StatCard
              label="Citizens"
              value={analytics.totalCitizens || 0}
              icon={<Users className="h-4 w-4" />}
              color="violet"
              className="!py-3 !p-4"
            />
            <StatCard
              label="Resolved this Month"
              value={analytics.resolvedThisMonth || 0}
              icon={<CheckCircle2 className="h-4 w-4" />}
              color="emerald"
              className="!py-3 !p-4"
            />
            <StatCard
              label="Resolution Rate"
              value={`${resolutionRate || 0}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              color="blue"
              trend={resolutionRate >= 50 ? 'up' : 'flat'}
              hint="vs last month"
              className="!py-3 !p-4"
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle eyebrow="01">By Status</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                <Doughnut data={statusData} options={doughnutOpts} />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle eyebrow="02">By Category</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                  <Bar data={categoryData} options={barOpts} />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle eyebrow="03">30-Day Trend</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="h-72">
                  <Line data={lineData} options={lineOpts} />
                </div>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                      04
                    </span>
                  </div>
                  <h3 className="font-semibold font-display text-base text-brand-900 dark:text-paper-100">
                      Recently Reported
                    </h3>
                </div>
                <button
                  onClick={() => setView('table')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 dark:text-brand-300 hover:text-brand-800 dark:hover:text-brand-200 transition-colors"
                >
                  View all
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardHeader>
            <CardBody className="!p-0">
              {analytics.recentIssues?.length === 0 || !analytics.recentIssues ? (
                <div className="p-8">
                <EmptyState
                  iconKey="inbox"
                  title="No recent issues"
                  description="Issues will appear here as citizens report them."
                  compact
                />
                </div>
              ) : (
                <ul className="divide-y divide-paper-100 dark:divide-brand-800">
                  {analytics.recentIssues.map((issue) => (
                  <li key={issue._id}>
                    <Link
                      to={`/admin/issues/${issue._id}`}
                      className="block px-5 py-3.5 hover:bg-paper-50 dark:hover:bg-brand-900/30 transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                            <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} size="sm" />
                            <StatusBadge status={issue.status} size="sm" />
                            <PriorityBadge priority={issue.priority} size="sm" />
                          </div>
                          <div className="font-medium text-brand-900 dark:text-paper-100 truncate group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                            {issue.title}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] text-paper-500 dark:text-paper-400">
                            <span className="inline-flex items-center gap-1">
                              <Avatar name={issue.reportedByName || 'Citizen'} size="xs" tone="soft" />
                              by {issue.reportedByName || 'Unknown'}
                            </span>
                            <span>·</span>
                            <span className="tabular">{timeAgo(issue.createdAt)}</span>
                            {issue.assignedToName && (
                              <>
                                <span>·</span>
                                <span>assigned to {issue.assignedToName}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-paper-300 dark:text-brand-700 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors shrink-0 mt-1" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </>
    ) : (
      <div className="space-y-4">
        <Card>
          <CardBody>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <FilterSelect
              label="Category"
              icon={ListFilter}
              value={filters.category}
              onChange={(v) => setFilters({ ...filters, category: v })}
              options={{ all: 'All Categories', pothole: 'Pothole', garbage: 'Garbage', streetlight: 'Streetlight', water: 'Water', sewage: 'Sewage', other: 'Other' }}
            />
            <FilterSelect
              label="Status"
              icon={CircleDashed}
              value={filters.status}
              onChange={(v) => setFilters({ ...filters, status: v })}
              options={{ all: 'All Statuses', submitted: 'Submitted', in_progress: 'In Progress', resolved: 'Resolved' }}
            />
            <FilterSelect
              label="Priority"
              icon={LoaderCircle}
              value={filters.priority}
              onChange={(v) => setFilters({ ...filters, priority: v })}
              options={{ all: 'All Priorities', low: 'Low', medium: 'Medium', high: 'High' }}
            />
            <FilterSelect
              label="Spam status"
              icon={CircleDashed}
              value={filters.spamStatus}
              onChange={(v) => setFilters({ ...filters, spamStatus: v })}
              options={{ all: 'All', none: 'No signal', suspected: 'Suspected', confirmed: 'Confirmed', cleared: 'Cleared' }}
            />
            <label className="label">Area
              <input className="input-base block w-full mt-1.5" value={filters.area} onChange={(event) => setFilters({ ...filters, area: event.target.value })} placeholder="Filter by address" />
            </label>
          </div>
        </CardBody>
      </Card>

          {issuesLoading ? (
        <Loader />
          ) : filteredIssues.length === 0 ? (
        <EmptyState
          iconKey="search"
          title="No issues match these filters"
          description="Adjust the filters or wait for new reports."
          compact={false}
        />
      ) : (
        <div className="surface rounded-md-plus overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-paper-50 dark:bg-brand-900/40 border-b border-paper-100 dark:border-brand-800 sticky top-0 z-[1]">
                <tr>
              {['Issue', 'Category', 'Status', 'Priority', 'Reported By', 'Assigned', 'Actions'].map((h) => (
                <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-paper-500 dark:text-paper-400 px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-100 dark:divide-brand-800">
            {filteredIssues.map((issue) => (
              <tr key={issue._id} className="hover:bg-paper-50/70 dark:hover:bg-brand-900/30 transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-brand-900 dark:text-paper-100 line-clamp-1">
                    {issue.title}
                  </div>
                  {issue.location?.address && (
                    <div className="flex items-center gap-1 text-xs text-paper-500 dark:text-paper-400 mt-0.5 line-clamp-1">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{issue.location.address}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <CategoryBadge category={issue.category} categoryDetails={issue.categoryDetails} />
                </td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={issue.reportedByName || '-'} size="xs" tone="soft" />
                    <span className="text-paper-700 dark:text-paper-300 truncate max-w-[120px]">
                      {issue.reportedByName || '-'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {issue.assignedToName ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={issue.assignedToName} size="xs" tone="brand" />
                      <span className="text-paper-700 dark:text-paper-300 truncate max-w-[120px]">
                        {issue.assignedToName}
                      </span>
                    </div>
                  ) : (
                    <Badge tone="bg-paper-50 dark:bg-brand-800 text-paper-500 dark:text-paper-400 border-paper-200 dark:border-brand-700 text-[11px] italic">
                      Unassigned
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    to={`/admin/issues/${issue._id}`}
                  >
                    <Button variant="primary" size="sm">
                      Manage
                      <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      )}
      </div>
    )}
    </div>
  );
}

function FilterSelect({ label, icon: Icon, value, onChange, options }) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-paper-400" />}
      {label}
    </label>
      <div className="relative mt-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base w-full appearance-none bg-white dark:bg-brand-900 pr-9"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-paper-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
    </div>
  </div>
  );
}
