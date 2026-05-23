import React, { useState } from 'react';
import {
  User,
  Bell,
  Lock,
  ShieldCheck,
  CreditCard,
  ChevronRight,
  Database,
  Smartphone,
  RotateCcw,
  Check,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Download,
  Download,
  Upload,
  Target,
  Diamond,
  Handshake,
  Award,
  ArrowLeftRight,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import CategoriesView from './CategoriesView';
import AssetTypesView from './AssetTypesView';
import { cn } from '../lib/utils';
import { useApp } from '../context/AppContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { authApi } from '../lib/api';

export default function SettingsView() {
  const { resetAllData, addToast, user, updateProfile, changePassword, theme, toggleTheme, language, setLanguage, t, appName, setAppName, appLogo, setAppLogo, setCurrentView } = useApp();
  const [activeTab, setActiveTab] = useState('profile');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [backupExporting, setBackupExporting] = useState(false);
  const [restoreImporting, setRestoreImporting] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);

  const handleExportBackup = async () => {
    setBackupExporting(true);
    try {
      await authApi.downloadUserBackup();
      addToast('Backup exported successfully', 'success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to export backup: ' + err.message, 'error');
    } finally {
      setBackupExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json || !json.data || typeof json.data !== 'object') {
          addToast('Invalid backup file structure', 'error');
          return;
        }
        setPendingBackupData(json);
        setShowRestoreConfirm(true);
      } catch (err) {
        addToast('Failed to parse backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackupData) return;
    setRestoreImporting(true);
    setShowRestoreConfirm(false);
    try {
      await authApi.restoreUserBackup(pendingBackupData);
      addToast('Data restored successfully! Reloading...', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      addToast('Failed to restore data: ' + err.message, 'error');
    } finally {
      setRestoreImporting(false);
      setPendingBackupData(null);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      addToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword.length < 6) return setPasswordError('New password must be at least 6 characters');
    if (newPassword !== confirmNewPassword) return setPasswordError('Passwords do not match');

    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'security', label: t('settings.security'), icon: Lock },
    { id: 'categories', label: 'Categories', icon: Database },
    { id: 'assetTypes', label: 'Asset Types', icon: Diamond },
    { id: 'appearance', label: t('settings.preferences'), icon: Sun },
    { id: 'backup', label: 'Backup & Restore', icon: RotateCcw },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10 pb-10"
    >
      <header className="px-2">
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-on-surface tracking-tighter uppercase">{t('settings.title')}</h2>
        <p className="text-on-surface-variant mt-3 text-sm uppercase tracking-widest font-medium">Manage your account preferences and application settings.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
        {/* Tabs */}
        <aside className="w-full lg:w-72 shrink-0">
          <nav className="flex flex-col gap-2 p-2 glass rounded-[24px] lg:rounded-[32px]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-4 lg:gap-5 px-5 lg:px-6 py-3.5 lg:py-4 rounded-xl lg:rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                  activeTab === tab.id
                    ? "bg-on-surface text-surface shadow-xl"
                    : "text-on-surface/30 hover:text-on-surface hover:bg-surface-container"
                )}
              >
                <tab.icon size={16} className={cn(activeTab === tab.id ? "text-surface" : "text-on-surface/20")} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {/* CATEGORIES TAB */}
          {activeTab === 'categories' ? (
            <CategoriesView />

          /* ASSET TYPES TAB */
          ) : activeTab === 'assetTypes' ? (
            <AssetTypesView />

          /* PROFILE TAB */
          ) : activeTab === 'profile' ? (
            <div className="glass rounded-[28px] lg:rounded-[40px] p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface mb-8 lg:mb-10 tracking-tight uppercase">Profile Settings</h3>

              <div className="space-y-6">
                {/* Avatar card */}
                <div className="flex items-center gap-6 p-6 lg:p-7 rounded-[20px] lg:rounded-[28px] glass-dark mb-8">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
                    <span className="font-display text-2xl lg:text-3xl font-bold text-primary">
                      {(user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-base lg:text-lg text-on-surface">{user?.name}</p>
                    <p className="text-xs text-on-surface-variant mt-1">{user?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                    />
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-8 border-t border-th-divider">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-4">Danger Zone</h4>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="flex items-center gap-3 px-6 py-3.5 rounded-xl border border-error/20 text-error text-xs font-bold uppercase tracking-widest hover:bg-error/5 transition-all"
                  >
                    <RotateCcw size={16} />
                    Reset All Data
                  </button>
                  <p className="text-[10px] text-on-surface/20 mt-3 ml-1">This will delete all your wallets, transactions, categories, and budget data.</p>
                </div>
              </div>

              {/* Save button */}
              <div className="mt-10 lg:mt-12 pt-8 lg:pt-10 border-t border-th-divider flex justify-end gap-4">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className={cn(
                    "px-8 lg:px-10 py-3.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all active:scale-95 duration-200 flex items-center gap-3",
                    saved ? "bg-green-500 text-on-surface" : "bg-on-surface text-surface hover:opacity-90"
                  )}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
                </button>
              </div>
            </div>

          /* SECURITY TAB */
          ) : activeTab === 'security' ? (
            <div className="glass rounded-[28px] lg:rounded-[40px] p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface mb-8 lg:mb-10 tracking-tight uppercase">Security Settings</h3>

              <form onSubmit={handleChangePassword} className="space-y-6 max-w-lg">
                <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">Change Password</h4>

                {passwordError && (
                  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-error/10 border border-error/20">
                    <AlertCircle size={16} className="text-error shrink-0" />
                    <p className="text-xs text-error font-bold uppercase tracking-widest">{passwordError}</p>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                    <Check size={16} className="text-green-500 shrink-0" />
                    <p className="text-xs text-green-500 font-bold uppercase tracking-widest">Password changed successfully!</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface/20 hover:text-on-surface transition-colors"
                    >
                      {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">Confirm New Password</label>
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-8 py-3.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl transition-all active:scale-95 duration-200 flex items-center gap-3 bg-on-surface text-surface hover:opacity-90 disabled:opacity-50"
                >
                  {passwordSaving ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
                  Update Password
                </button>
              </form>
            </div>

          /* APPEARANCE TAB */
          ) : activeTab === 'appearance' ? (
            <div className="glass rounded-[28px] lg:rounded-[40px] p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface mb-8 lg:mb-10 tracking-tight uppercase">{t('settings.preferences')}</h3>

              <div className="space-y-6 max-w-lg">
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed">Choose your preferred visual mode. Your selection is saved to your account and synced across devices.</p>

                <div className="grid grid-cols-2 gap-4">
                  {/* Dark Mode Card */}
                  <button
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                    className={cn(
                      "relative p-6 rounded-[24px] border-2 transition-all duration-300 group text-left",
                      theme === 'dark'
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-th-divider hover:border-on-surface/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#0a0c10] flex items-center justify-center mb-4 border border-on-surface/10">
                      <Moon size={20} className="text-indigo-400" />
                    </div>
                    <p className="font-bold text-sm text-on-surface uppercase tracking-widest mb-1">Dark</p>
                    <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">Reduced eye strain in low-light environments.</p>
                    {theme === 'dark' && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-on-surface" />
                      </div>
                    )}
                  </button>

                  {/* Light Mode Card */}
                  <button
                    onClick={() => { if (theme !== 'light') toggleTheme(); }}
                    className={cn(
                      "relative p-6 rounded-[24px] border-2 transition-all duration-300 group text-left",
                      theme === 'light'
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-th-divider hover:border-on-surface/20"
                    )}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#f5f7fa] flex items-center justify-center mb-4 border border-black/10">
                      <Sun size={20} className="text-amber-500" />
                    </div>
                    <p className="font-bold text-sm text-on-surface uppercase tracking-widest mb-1">Light</p>
                    <p className="text-[10px] text-on-surface-variant font-medium leading-relaxed">Maximum visibility in bright environments.</p>
                    {theme === 'light' && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={14} className="text-on-surface" />
                      </div>
                    )}
                  </button>
                </div>

                <div className="pt-8 mt-8 border-t border-th-divider">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-4">{t('settings.language')}</h4>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setLanguage('en')}
                      className={cn("px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all", language === 'en' ? "border-primary bg-primary/10 text-primary" : "border-th-divider text-on-surface/50 hover:text-on-surface")}
                    >
                      {t('settings.english')}
                    </button>
                    <button
                      onClick={() => setLanguage('id')}
                      className={cn("px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all", language === 'id' ? "border-primary bg-primary/10 text-primary" : "border-th-divider text-on-surface/50 hover:text-on-surface")}
                    >
                      {t('settings.indonesian')}
                    </button>
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-th-divider">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-4">{t('settings.identity')}</h4>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('settings.appName')}</label>
                      <input
                        type="text"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        placeholder="e.g. Wealth"
                        className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.2em] ml-1">{t('settings.appLogo')}</label>
                      <input
                        type="text"
                        value={appLogo}
                        onChange={(e) => setAppLogo(e.target.value)}
                        placeholder="e.g. 💰 or https://..."
                        className="w-full px-5 py-4 bg-th-input border border-th-input rounded-2xl text-sm font-bold text-on-surface focus:outline-none focus:border-th-input-focus transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          /* BACKUP TAB */
          ) : activeTab === 'backup' ? (
            <div className="glass rounded-[28px] lg:rounded-[40px] p-8 lg:p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
              <h3 className="font-display text-xl lg:text-2xl font-bold text-on-surface mb-8 lg:mb-10 tracking-tight uppercase">Backup & Restore</h3>

              <div className="space-y-8 divide-y divide-th-divider/50">
                {/* Export Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">Backup Data</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
                    Download a complete copy of your financial data, including wallets, transactions, categories, budgets, assets, and debts. This file is saved in JSON format and can be used to restore your account data at any time.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    disabled={backupExporting}
                    className="flex items-center gap-3 px-6 py-3.5 rounded-xl bg-on-surface text-surface hover:opacity-90 text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {backupExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    Export Backup (JSON)
                  </button>
                </div>

                {/* Import Section */}
                <div className="space-y-4 pt-8">
                  <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest">Restore Data</h4>
                  <p className="text-xs text-on-surface-variant leading-relaxed max-w-xl">
                    Upload a previously exported JSON backup file to restore your account state. <strong className="text-error font-bold">Warning:</strong> This will completely overwrite and replace all your current wallets, categories, transactions, goals, assets, and debts.
                  </p>
                  
                  <div className="relative">
                    <input
                      type="file"
                      id="backup-upload"
                      accept=".json"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={restoreImporting}
                    />
                    <label
                      htmlFor="backup-upload"
                      className={cn(
                        "flex items-center gap-3 px-6 py-3.5 rounded-xl border border-dashed border-th-divider hover:border-primary/50 text-on-surface hover:bg-primary/5 text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer active:scale-95 w-fit",
                        restoreImporting && "opacity-50 pointer-events-none"
                      )}
                    >
                      {restoreImporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {restoreImporting ? 'Restoring data...' : 'Upload Backup File'}
                    </label>
                  </div>
                </div>
              </div>
            </div>

          /* FALLBACK */
          ) : null}
        </main>
      </div>

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset All Data"
        message="This will permanently delete all your wallets, journals, categories, and budget data. This cannot be undone."
        confirmLabel="Reset Everything"
        onConfirm={() => { resetAllData(); setShowResetConfirm(false); }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Restore Data from Backup"
        message="This will permanently overwrite all your current wallets, categories, transactions, goals, assets, and debts with the backup data. This action cannot be undone."
        confirmLabel="Overwrite and Restore"
        onConfirm={handleConfirmRestore}
        onCancel={() => { setShowRestoreConfirm(false); setPendingBackupData(null); }}
      />
    </motion.div>
  );
}
