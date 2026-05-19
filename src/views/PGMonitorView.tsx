import React, { useEffect, useState, useCallback } from 'react';
import { 
  Database, 
  Activity, 
  RefreshCw, 
  Clock, 
  HardDrive, 
  Table, 
  ShieldAlert, 
  CheckCircle2, 
  Server, 
  Play,
  Terminal,
  AlertCircle
} from 'lucide-react';
import { adminApi } from '../lib/api';
import { useApp } from '../context/AppContext';

interface DBStats {
  database: {
    db_name: string;
    db_size: string;
    db_size_bytes: number;
    pg_version: string;
  };
  connections: {
    active: number;
    total: number;
    max: number;
  };
  cacheHitRatio: number;
  indexHitRatio: number;
  tables: Array<{
    table_name: string;
    row_count: number;
    total_size: string;
    table_size: string;
    index_size: string;
    total_size_bytes: string;
  }>;
  activeQueries: Array<{
    pid: number;
    username: string;
    state: string;
    application_name: string;
    duration_seconds: number;
    query: string;
  }>;
  uptime: {
    start_time: string;
    duration: {
      days?: number;
      hours?: number;
      minutes?: number;
      seconds?: number;
    } | string;
  };
}

export default function PGMonitorView() {
  const { user } = useApp();
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds default
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminApi.getPGMonitorStats();
      setStats(data);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to load PostgreSQL stats');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchStats(true);
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchStats]);

  if (!user || !user.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center border border-error/20 mb-4 animate-bounce">
          <ShieldAlert className="text-error" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-2">Access Denied</h2>
        <p className="text-on-surface-variant max-w-md">
          Only administrators can access the database monitoring dashboard.
        </p>
      </div>
    );
  }

  const formatUptime = (uptimeObj: any) => {
    if (!uptimeObj || !uptimeObj.duration) return 'Unknown';
    if (typeof uptimeObj.duration === 'string') {
      return uptimeObj.duration;
    }
    const d = uptimeObj.duration;
    const parts = [];
    if (d.days) parts.push(`${d.days}d`);
    if (d.hours) parts.push(`${d.hours}h`);
    if (d.minutes) parts.push(`${d.minutes}m`);
    if (d.seconds) parts.push(`${Math.round(d.seconds)}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  };

  const getRatioColor = (ratio: number) => {
    if (ratio >= 99) return 'text-success border-success/20 bg-success/5';
    if (ratio >= 95) return 'text-amber-500 border-amber-500/20 bg-amber-500/5';
    return 'text-error border-error/20 bg-error/5';
  };

  return (
    <div className="space-y-8 pb-12 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Database className="text-primary" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">PGMonitor</h1>
              <p className="text-xs text-on-surface-variant">PostgreSQL Database Monitoring & Performance Metrics</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center gap-2 bg-surface-container border border-th-divider px-3 py-2 rounded-xl text-xs">
            <span className="font-medium text-on-surface-variant">Auto-Refresh:</span>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)} 
              className="accent-primary w-4 h-4 cursor-pointer"
            />
            {autoRefresh && (
              <select 
                value={refreshInterval} 
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent border-0 text-on-surface font-bold focus:ring-0 cursor-pointer p-0 ml-1"
              >
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
              </select>
            )}
          </div>

          <button
            onClick={() => fetchStats()}
            disabled={loading}
            className="flex items-center gap-2 bg-surface-container hover:bg-surface-container-high border border-th-divider text-on-surface px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-start gap-3">
          <AlertCircle className="text-error shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-bold text-error">Failed to Load Monitor Data</h4>
            <p className="text-xs text-error/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {loading && !stats ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">Gathering metrics...</p>
        </div>
      ) : stats ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Database Size Card */}
            <div className="glass border border-th-divider p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Database Size</span>
                  <h3 className="text-2xl font-display font-black text-on-surface">{stats.database.db_size || '0 B'}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                  <HardDrive className="text-indigo-500" size={18} />
                </div>
              </div>
              <div className="pt-2 border-t border-th-divider flex justify-between items-center text-[10px]">
                <span className="text-on-surface-variant">Name: <span className="font-bold text-on-surface">{stats.database.db_name}</span></span>
                <span className="text-on-surface-variant font-bold">PG v{stats.database.pg_version ? stats.database.pg_version.split(' ')[1] : ''}</span>
              </div>
            </div>

            {/* Cache Hit Ratio Card */}
            <div className="glass border border-th-divider p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Cache Hit Ratio</span>
                  <h3 className="text-2xl font-display font-black text-on-surface">{stats.cacheHitRatio.toFixed(2)}%</h3>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getRatioColor(stats.cacheHitRatio)}`}>
                  {stats.cacheHitRatio >= 99 ? 'Excellent' : stats.cacheHitRatio >= 95 ? 'Good' : 'Critical'}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-on-surface/5 h-1.5 rounded-full overflow-hidden border border-on-surface/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.cacheHitRatio >= 99 ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      stats.cacheHitRatio >= 95 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`}
                    style={{ width: `${stats.cacheHitRatio}%` }}
                  />
                </div>
                <p className="text-[9px] text-on-surface-variant leading-normal">Percentage of reads served from shared buffers.</p>
              </div>
            </div>

            {/* Index Hit Ratio Card */}
            <div className="glass border border-th-divider p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Index Hit Ratio</span>
                  <h3 className="text-2xl font-display font-black text-on-surface">{stats.indexHitRatio.toFixed(2)}%</h3>
                </div>
                <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${getRatioColor(stats.indexHitRatio)}`}>
                  {stats.indexHitRatio >= 99 ? 'Excellent' : stats.indexHitRatio >= 95 ? 'Good' : 'Critical'}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="w-full bg-on-surface/5 h-1.5 rounded-full overflow-hidden border border-on-surface/5">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.indexHitRatio >= 99 ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                      stats.indexHitRatio >= 95 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-error shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`}
                    style={{ width: `${stats.indexHitRatio}%` }}
                  />
                </div>
                <p className="text-[9px] text-on-surface-variant leading-normal">Percentage of index scans served from buffers.</p>
              </div>
            </div>

            {/* Connections Card */}
            <div className="glass border border-th-divider p-6 rounded-3xl space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Connections</span>
                  <h3 className="text-2xl font-display font-black text-on-surface">
                    {stats.connections.total} <span className="text-sm font-normal text-on-surface-variant">/ {stats.connections.max || 100}</span>
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Activity className="text-amber-500 animate-pulse" size={18} />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-on-surface-variant">Active Connection Threads:</span>
                  <span className="font-bold text-success flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success animate-ping inline-block" />
                    {stats.connections.active} Active
                  </span>
                </div>
                <div className="w-full bg-on-surface/5 h-1.5 rounded-full overflow-hidden border border-on-surface/5">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${(stats.connections.total / (stats.connections.max || 100)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Queries & Table Sizes Details */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Active Queries Section */}
            <div className="glass border border-th-divider rounded-3xl p-6 flex flex-col min-h-[500px]">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <Terminal className="text-primary" size={18} />
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Active Queries</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  {stats.activeQueries.length} running
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[550px] [scrollbar-width:thin]">
                {stats.activeQueries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12 text-on-surface-variant">
                    <CheckCircle2 className="text-success mb-2" size={24} />
                    <p className="text-xs font-bold">No other active queries running</p>
                    <p className="text-[10px] mt-1">Database is idle and healthy</p>
                  </div>
                ) : (
                  stats.activeQueries.map((q) => (
                    <div key={q.pid} className="p-4 rounded-2xl bg-surface-container border border-th-divider space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-on-surface-variant border-b border-th-divider pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">PID: {q.pid}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
                          <span>User: <strong className="text-on-surface">{q.username || 'n/a'}</strong></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-on-surface/20" />
                          <span>App: <strong className="text-on-surface">{q.application_name || 'n/a'}</strong></span>
                        </div>
                        <div className={`px-2 py-0.5 rounded font-bold font-sans ${
                          q.duration_seconds > 5.0 ? 'bg-error/10 text-error border border-error/20' :
                          q.duration_seconds > 1.0 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-success/10 text-success border border-success/20'
                        }`}>
                          {q.duration_seconds.toFixed(2)}s
                        </div>
                      </div>
                      <pre className="text-xs font-mono bg-surface p-3 rounded-xl overflow-x-auto text-on-surface max-h-[150px] [scrollbar-width:thin]">
                        {q.query}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Table Stats Section */}
            <div className="glass border border-th-divider rounded-3xl p-6 flex flex-col min-h-[500px]">
              <div className="flex items-center gap-2 mb-4 shrink-0">
                <Table className="text-primary" size={18} />
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">User Table Statistics</h3>
              </div>

              <div className="flex-1 overflow-x-auto [scrollbar-width:thin]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-th-divider text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                      <th className="pb-3 pr-2">Table Name</th>
                      <th className="pb-3 px-2 text-right">Rows</th>
                      <th className="pb-3 px-2 text-right">Table Size</th>
                      <th className="pb-3 px-2 text-right">Index Size</th>
                      <th className="pb-3 pl-2 text-right">Total Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-th-divider/50 text-xs">
                    {stats.tables.map((t) => (
                      <tr key={t.table_name} className="hover:bg-on-surface/5 transition-colors">
                        <td className="py-3 pr-2 font-bold font-mono text-on-surface">{t.table_name}</td>
                        <td className="py-3 px-2 text-right font-mono text-on-surface-variant">{t.row_count.toLocaleString('id-ID')}</td>
                        <td className="py-3 px-2 text-right font-mono text-on-surface-variant">{t.table_size}</td>
                        <td className="py-3 px-2 text-right font-mono text-on-surface-variant">{t.index_size}</td>
                        <td className="py-3 pl-2 text-right font-bold font-mono text-primary">{t.total_size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Uptime details footer */}
          <div className="glass border border-th-divider p-6 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <Server className="text-on-surface-variant" size={16} />
              <div>
                <p className="text-on-surface-variant">
                  Server Startup Time: <span className="font-bold text-on-surface">{new Date(stats.uptime.start_time).toLocaleString()}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-on-surface-variant" size={16} />
              <p className="text-on-surface-variant">
                Server Uptime: <span className="font-bold text-primary">{formatUptime(stats)}</span>
              </p>
            </div>

            <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">
              Last Refreshed: {lastRefreshed.toLocaleTimeString()}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
