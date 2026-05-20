import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ShieldAlert,
  ArrowLeft,
  Wallet,
  Trash2,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Plus,
  Edit2,
  Target,
  Receipt,
  Tag,
} from 'lucide-react';
import { adminApi, AuthUser, api } from '../lib/api';
import { cn } from '../lib/utils';
import { formatCurrencyShort } from '../lib/types';
import { useApp } from '../context/AppContext';
import ConfirmDialog from '../components/ConfirmDialog';

interface AdminUser extends AuthUser {
  createdAt: string;
  _count: {
    wallets: number;
    journals: number;
    categories: number;
    goals?: number;
    assets?: number;
    debts?: number;
  };
}

export default function AdminView() {
  const { user: currentUser } = useApp();
  const [adminTab, setAdminTab] = useState<'users' | 'changelog'>('users');
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userData, setUserData] = useState<{ wallets: any[], journals: any[], categories: any[], goals: any[] } | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedJournalId, setExpandedJournalId] = useState<string | null>(null);
  const [txSearchQuery, setTxSearchQuery] = useState('');

  // Changelog State
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [editingLog, setEditingLog] = useState<any | null>(null);
  const [showLogForm, setShowLogForm] = useState(false);
  
  const [logForm, setLogForm] = useState({ version: '', title: '', content: '', isPublished: false });

  useEffect(() => {
    if (adminTab === 'users') {
      fetchUsers();
    } else if (adminTab === 'changelog') {
      fetchChangelogs();
    }
  }, [adminTab]);

  const fetchChangelogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await api.get('/changelog/all');
      setChangelogs(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSaveChangelog = async () => {
    try {
      if (editingLog) {
        await api.put(`/changelog/${editingLog.id}`, logForm);
      } else {
        await api.post('/changelog', logForm);
      }
      setShowLogForm(false);
      setEditingLog(null);
      setLogForm({ version: '', title: '', content: '', isPublished: false });
      fetchChangelogs();
    } catch (err: any) {
      alert('Failed to save changelog');
    }
  };

  const handleDeleteChangelog = async (id: string) => {
    if (!confirm('Are you sure you want to delete this changelog?')) return;
    try {
      await api.delete(`/changelog/${id}`);
      fetchChangelogs();
    } catch (err: any) {
      alert('Failed to delete changelog');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (user: AdminUser) => {
    setSelectedUser(user);
    try {
      setLoadingData(true);
      const data = await adminApi.getUserData(user.id);
      setUserData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteId) return;
    try {
      await adminApi.deleteUser(deleteId);
      setDeleteId(null);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete user: ' + (err.message || 'Server error'));
    }
  };

  if (!currentUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <ShieldAlert size={64} className="text-error mb-6" />
        <h2 className="font-display text-3xl font-bold text-on-surface mb-2">Access Denied</h2>
        <p className="text-on-surface/40 uppercase tracking-widest text-sm font-medium">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-10 relative"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tight uppercase">Admin Panel</h2>
          <p className="text-sm text-on-surface/40 mt-3 max-w-lg leading-relaxed uppercase tracking-widest font-medium">
            Full System Overview & User Control.
          </p>
        </div>
        <div className="flex bg-on-surface/5 p-1 rounded-2xl border border-on-surface/5">
          <button
            onClick={() => setAdminTab('users')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              adminTab === 'users' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface/40 hover:text-on-surface hover:bg-on-surface/5"
            )}
          >
            Users
          </button>
          <button
            onClick={() => setAdminTab('changelog')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              adminTab === 'changelog' ? "bg-primary text-on-primary shadow-lg" : "text-on-surface/40 hover:text-on-surface hover:bg-on-surface/5"
            )}
          >
            Changelogs
          </button>
        </div>
      </header>

      {/* Main View: Switching based on adminTab */}
      <AnimatePresence mode="wait">
        {adminTab === 'changelog' ? (
          <motion.div
            key="changelog"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="glass rounded-[32px] p-6 lg:p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center border border-secondary/30">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-on-surface uppercase">Patch Notes & Changelog</h3>
                    <p className="text-xs text-on-surface/40 uppercase tracking-widest font-medium mt-1">Manage what users see in "What's New"</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('https://api.github.com/repos/mfrs/Money-Management/commits?per_page=5');
                        if (!res.ok) throw new Error('Failed to fetch commits');
                        const commits = await res.json();
                        
                        let markdown = '### Recent Updates\\n\\n';
                        commits.forEach((c: any) => {
                          // Clean up commit messages
                          const msg = c.commit.message.split('\\n')[0];
                          markdown += `- ${msg}\\n`;
                        });
                        
                        const dateStr = new Date().toISOString().split('T')[0];
                        
                        setEditingLog(null);
                        setLogForm({ 
                          version: `v${dateStr.replace(/-/g, '')}`, 
                          title: `Update ${dateStr}`, 
                          content: markdown, 
                          isPublished: false 
                        });
                        setShowLogForm(true);
                      } catch (err) {
                        alert('Gagal mengambil data dari GitHub');
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-on-surface/5 text-on-surface rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-on-surface/10 transition-colors border border-on-surface/10"
                  >
                    Sync GitHub
                  </button>
                  <button
                    onClick={() => {
                      setEditingLog(null);
                      setLogForm({ version: '', title: '', content: '', isPublished: false });
                      setShowLogForm(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors"
                  >
                    <Plus size={16} /> New Draft
                  </button>
                </div>
              </div>

              {loadingLogs ? (
                <div className="text-center py-10 text-on-surface/40 uppercase tracking-widest text-sm">Loading changelogs...</div>
              ) : showLogForm ? (
                <div className="bg-on-surface/5 p-6 rounded-[24px] border border-on-surface/5 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-1">Version (e.g., v1.2.0)</label>
                      <input
                        type="text"
                        value={logForm.version}
                        onChange={e => setLogForm({ ...logForm, version: e.target.value })}
                        className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                      />
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-1">Title</label>
                      <input
                        type="text"
                        value={logForm.title}
                        onChange={e => setLogForm({ ...logForm, title: e.target.value })}
                        className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-1">Content (Markdown Supported)</label>
                    <textarea
                      value={logForm.content}
                      onChange={e => setLogForm({ ...logForm, content: e.target.value })}
                      rows={8}
                      className="w-full bg-on-surface/5 border border-on-surface/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:outline-none focus:border-primary/50 font-mono"
                      placeholder="### New Features&#10;- Added export to PDF&#10;- Bug fixes"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={logForm.isPublished}
                      onChange={e => setLogForm({ ...logForm, isPublished: e.target.checked })}
                      className="w-4 h-4 rounded text-primary bg-on-surface/10 border-on-surface/20"
                    />
                    <label htmlFor="isPublished" className="text-sm font-bold text-on-surface cursor-pointer">
                      Publish to Users (Visible in "What's New")
                    </label>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-on-surface/5">
                    <button
                      onClick={() => setShowLogForm(false)}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold text-on-surface/60 hover:bg-on-surface/10 uppercase tracking-widest transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveChangelog}
                      disabled={!logForm.title || !logForm.version || !logForm.content}
                      className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-on-primary uppercase tracking-widest disabled:opacity-50 transition-colors"
                    >
                      Save Changelog
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {changelogs.map(log => (
                    <div key={log.id} className="flex flex-col md:flex-row justify-between gap-4 p-5 bg-on-surface/5 rounded-2xl border border-on-surface/5 group">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            {log.version}
                          </span>
                          <h4 className="font-bold text-on-surface">{log.title}</h4>
                          {log.isPublished ? (
                            <span className="text-[9px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-500/20">Published</span>
                          ) : (
                            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest border border-amber-500/20">Draft</span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface/40 mt-2 line-clamp-2 max-w-2xl">{log.content}</p>
                        <p className="text-[9px] text-on-surface/30 uppercase tracking-widest mt-3">Created: {new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingLog(log);
                            setLogForm({ version: log.version, title: log.title, content: log.content, isPublished: log.isPublished });
                            setShowLogForm(true);
                          }}
                          className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteChangelog(log.id)}
                          className="w-10 h-10 rounded-xl bg-on-surface/5 flex items-center justify-center text-on-surface hover:bg-error hover:text-error-content transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {changelogs.length === 0 && (
                    <div className="text-center py-10 text-on-surface/30 text-xs uppercase tracking-widest border border-dashed border-on-surface/10 rounded-2xl">
                      No changelogs found. Create a draft or push to Github.
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ) : !selectedUser ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="glass rounded-[24px] lg:rounded-[32px] p-6 lg:p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                  <Users size={24} />
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-on-surface uppercase">Registered Users</h3>
                  <p className="text-xs text-on-surface/40 uppercase tracking-widest font-medium mt-1">Total {users.length} accounts</p>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-10 text-on-surface/40 uppercase tracking-widest text-sm">Loading users...</div>
              ) : error ? (
                <div className="text-center py-10 text-error uppercase tracking-widest text-sm">{error}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-on-surface/5 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em]">
                        <th className="py-4 px-4">User</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 text-center">Level</th>
                        <th className="py-4 px-4 text-center">Wallets</th>
                        <th className="py-4 px-4 text-center">Journals</th>
                        <th className="py-4 px-4 text-right">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-on-surface/5">
                      {users.map((user) => {
                        const xp = (user._count.journals * 100) + ((user._count.goals || 0) * 150) + (user._count.categories * 50);
                        const level = Math.floor(Math.sqrt(xp / 100)) + 1;
                        return (
                        <tr 
                          key={user.id} 
                          onClick={() => handleUserClick(user)}
                          className="hover:bg-on-surface/[0.04] transition-colors cursor-pointer group"
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-on-surface/10 flex items-center justify-center font-display font-bold text-sm text-on-surface border border-on-surface/5 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-on-surface">{user.name}</p>
                                <p className="text-[10px] text-on-surface/40">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {user.isAdmin ? (
                              <span className="text-[9px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest border border-primary/20">Admin</span>
                            ) : (
                              <span className="text-[9px] font-bold text-on-surface/40 bg-on-surface/5 px-3 py-1 rounded-full uppercase tracking-widest border border-on-surface/5">User</span>
                            )}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className="text-[10px] font-bold text-secondary bg-secondary/10 px-2.5 py-1 rounded-full uppercase tracking-wider border border-secondary/20">
                              Lvl {level}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center text-sm font-bold text-on-surface tabular-nums">{user._count.wallets}</td>
                          <td className="py-4 px-4 text-center text-sm font-bold text-on-surface tabular-nums">{user._count.journals}</td>
                          <td className="py-4 px-4 text-right text-xs font-bold text-on-surface/40 uppercase tracking-widest whitespace-nowrap">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => { setSelectedUser(null); setUserData(null); }}
                  className="w-12 h-12 rounded-full glass-dark flex items-center justify-center text-on-surface hover:bg-on-surface/10 transition-colors border border-on-surface/10"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="font-display text-2xl font-bold text-on-surface">Data Overview: {selectedUser.name}</h3>
                  <p className="text-xs text-on-surface/40 uppercase tracking-widest font-medium mt-1">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setDeleteId(selectedUser.id)}
                className="flex items-center gap-3 px-6 py-3 bg-error/10 text-error rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-error/20 transition-all border border-error/20"
              >
                <Trash2 size={16} /> Delete User
              </button>
            </div>

            {loadingData ? (
              <div className="glass rounded-[32px] p-20 text-center text-on-surface/40 uppercase tracking-widest text-sm">
                Scanning Database...
              </div>
            ) : userData && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Stats, Wallets, Goals */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Wallets */}
                  <div className="glass rounded-[32px] p-6 border border-on-surface/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                        <Wallet size={20} />
                      </div>
                      <span className="text-sm font-bold text-on-surface uppercase tracking-widest">Wallets</span>
                    </div>
                    <div className="space-y-4">
                      {userData.wallets.map(w => (
                        <div key={w.id} className="flex justify-between items-center p-4 bg-on-surface/5 rounded-2xl">
                          <div>
                            <p className="text-sm font-bold text-on-surface uppercase tracking-wider">{w.name}</p>
                            <p className="text-[10px] text-on-surface/40 uppercase mt-1">{w.type}</p>
                          </div>
                          <p className="font-display text-lg font-bold text-primary">{formatCurrencyShort(w.balance)}</p>
                        </div>
                      ))}
                      {userData.wallets.length === 0 && <p className="text-xs text-on-surface/30">No wallets found</p>}
                    </div>
                  </div>

                  {/* Goals */}
                  <div className="glass rounded-[32px] p-6 border border-on-surface/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Target size={20} />
                      </div>
                      <span className="text-sm font-bold text-on-surface uppercase tracking-widest font-display">Financial Goals</span>
                    </div>
                    <div className="space-y-4">
                      {userData.goals?.map(g => {
                        const progress = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) || 0;
                        return (
                          <div key={g.id} className="p-4 bg-on-surface/5 rounded-2xl space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-on-surface uppercase tracking-wider">{g.name}</p>
                                {g.deadline && (
                                  <p className="text-[9px] text-on-surface/40 mt-0.5">Deadline: {new Date(g.deadline).toLocaleDateString()}</p>
                                )}
                              </div>
                              <span className="text-xs font-bold" style={{ color: g.color }}>
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-on-surface/5 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: g.color }} />
                            </div>
                            <div className="flex justify-between text-[9px] text-on-surface/40 font-medium">
                              <span>{formatCurrencyShort(g.currentAmount)}</span>
                              <span>/ {formatCurrencyShort(g.targetAmount)}</span>
                            </div>
                          </div>
                        );
                      })}
                      {(!userData.goals || userData.goals.length === 0) && <p className="text-xs text-on-surface/30">No goals found</p>}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="glass rounded-[32px] p-6 border border-on-surface/5">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                        <Tag size={20} />
                      </div>
                      <span className="text-sm font-bold text-on-surface uppercase tracking-widest">Categories</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {userData.categories.map(c => (
                        <span key={c.id} className="text-[10px] font-bold text-on-surface bg-on-surface/10 px-3 py-1.5 rounded-full border border-on-surface/5">
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Detailed Journals */}
                <div className="lg:col-span-2 glass rounded-[32px] p-8 border border-on-surface/5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-tertiary/20 text-tertiary flex items-center justify-center border border-tertiary/30">
                        <Receipt size={24} />
                      </div>
                      <span className="font-display text-xl font-bold text-on-surface uppercase">User Transactions & Ledger Details</span>
                    </div>

                    {/* Search Bar for Transactions */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search by ID or Description..."
                        value={txSearchQuery}
                        onChange={(e) => setTxSearchQuery(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 text-xs bg-on-surface/5 border border-on-surface/5 rounded-xl text-on-surface focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-on-surface/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {userData.journals
                      .filter(j => {
                        if (!txSearchQuery.trim()) return true;
                        const query = txSearchQuery.toLowerCase();
                        return j.id.toLowerCase().includes(query) || 
                               String(j.seqId || '').includes(query) ||
                               j.description.toLowerCase().includes(query);
                      })
                      .map(j => {
                        const debit = j.lines.filter((l: any) => l.type === 'DEBIT').reduce((s: number, l: any) => s + l.amount, 0);
                        const isExpanded = expandedJournalId === j.id;
                        const isReversed = j.isReversed;
                        const isReversal = j.description.startsWith('[REVERSAL]');
                        
                        return (
                          <div 
                            key={j.id} 
                            className={cn(
                              "rounded-[20px] border overflow-hidden transition-all duration-300",
                              isReversed 
                                ? "bg-amber-500/[0.02] border-amber-500/10 text-amber-500/80" 
                                : isReversal 
                                  ? "bg-sky-500/[0.02] border-sky-500/10 text-sky-500/80" 
                                  : "bg-on-surface/5 border-on-surface/5 text-on-surface"
                            )}
                          >
                            {/* Collapsed Header */}
                            <div 
                              onClick={() => setExpandedJournalId(isExpanded ? null : j.id)}
                              className="p-5 flex justify-between items-center cursor-pointer hover:bg-on-surface/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-on-surface/30">
                                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn(
                                      "text-sm font-bold",
                                      isReversed ? "line-through text-on-surface/40" : "text-on-surface"
                                    )}>
                                      {j.description}
                                    </span>
                                    {isReversed && (
                                      <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                                        Reversed
                                      </span>
                                    )}
                                    {isReversal && (
                                      <span className="text-[8px] font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 uppercase tracking-wider">
                                        Reversal
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <span className="text-[9px] font-bold text-on-surface/20 uppercase tracking-widest font-mono">
                                      ID: TX-{j.seqId || 'N/A'}
                                    </span>
                                    <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest">
                                      {new Date(j.date).toLocaleDateString()} • {j.lines.length} Ledger Lines
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-display text-base font-bold text-on-surface tabular-nums">{formatCurrencyShort(debit)}</p>
                                <p className="text-[9px] font-bold text-on-surface/30 uppercase mt-1 tracking-[0.2em]">Balanced</p>
                              </div>
                            </div>

                            {/* Expanded Ledger Details */}
                            {isExpanded && (
                              <div className="px-5 pb-5 pt-1 bg-black/10 border-t border-on-surface/5 space-y-3">
                                <div className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest mb-1">Double-Entry Ledger Lines</div>
                                <div className="space-y-2">
                                  {j.lines.map((line: any) => (
                                    <div key={line.id} className="flex justify-between items-center px-4 py-3 bg-on-surface/[0.02] rounded-xl border border-on-surface/5">
                                      <div className="flex items-center gap-3">
                                        <span className={cn(
                                          "px-2.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider",
                                          line.type === 'DEBIT' 
                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                        )}>
                                          {line.type}
                                        </span>
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-on-surface">
                                            {line.wallet ? `Wallet: ${line.wallet.name}` : `Category: ${line.category?.name || 'Uncategorized'}`}
                                          </span>
                                          <span className="text-[9px] text-on-surface/40 uppercase tracking-wide">
                                            {line.wallet ? `Type: ${line.wallet.type}` : `Type: Budget Category`}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="text-xs font-bold text-on-surface tabular-nums">
                                        {formatCurrencyShort(line.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {userData.journals.length === 0 && (
                      <div className="text-center py-10 text-on-surface/30 text-xs uppercase tracking-widest">
                        No transactions recorded
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteId}
        title="Delete User Account"
        message="Are you absolutely sure you want to permanently delete this user? All their wallets, journals, and categories will be erased from the database. This action CANNOT be undone."
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteId(null)}
      />
    </motion.div>
  );
}
