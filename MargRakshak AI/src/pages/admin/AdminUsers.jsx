import React, { useState, useEffect, useCallback } from 'react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import NotificationToast from '../../components/common/NotificationToast';
import Modal from '../../components/common/Modal';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  UserCheck, 
  UserX,
  Phone, 
  Mail, 
  Calendar, 
  Volume2, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  Shield,
  Car,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { getUsers, toggleUserStatus, updateUserRole } from '../../services/api';

const FIXED_ADMIN_EMAIL = 'admin@margrakshak.in';

export default function AdminUsers() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // User Management Action Confirmation Modal
  const [modalAction, setModalAction] = useState(null); // { type: 'STATUS' | 'ROLE', user, targetStatus?, targetRole? }
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [selectedNewRole, setSelectedNewRole] = useState('user');

  /**
   * Fetch registered users from backend API
   */
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await getUsers({ limit: 100 });
      const items = Array.isArray(response?.items)
        ? response.items
        : (Array.isArray(response) ? response : []);

      setUsers(items);
    } catch (err) {
      console.error('Failed to load users from backend:', err);
      setFetchError(err.message || 'Unable to connect to backend server at http://localhost:8000');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * Execute status or role update with graceful failure if endpoint is not implemented
   */
  const handleConfirmAction = async () => {
    if (!modalAction || !modalAction.user) return;
    setIsSubmittingAction(true);
    const targetUser = modalAction.user;

    try {
      if (modalAction.type === 'STATUS') {
        const nextStatus = modalAction.targetStatus;
        await toggleUserStatus(targetUser.id, nextStatus);

        // Optimistically update users list
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: nextStatus } : u))
        );
        setToastMessage(
          nextStatus
            ? t('adminUsers.toastActivated', { name: targetUser.full_name || targetUser.email })
            : t('adminUsers.toastDeactivated', { name: targetUser.full_name || targetUser.email })
        );
        setToastType('success');
      } else if (modalAction.type === 'ROLE') {
        const nextRole = selectedNewRole;
        await updateUserRole(targetUser.id, nextRole);

        // Optimistically update users list
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u))
        );
        setToastMessage(
          t('adminUsers.toastRoleUpdated', {
            name: targetUser.full_name || targetUser.email,
            role: nextRole.toUpperCase(),
          })
        );
        setToastType('success');
      }
    } catch (err) {
      console.warn(`User management action ${modalAction.type} failed:`, err);
      const isNotImplemented =
        err?.status === 404 ||
        err?.status === 405 ||
        err?.message?.includes('404') ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError');

      const actionLabel = modalAction.type === 'STATUS' ? 'status' : 'role';
      const endpointPath =
        modalAction.type === 'STATUS'
          ? `/api/v1/users/${targetUser.id}/status`
          : `/api/v1/users/${targetUser.id}/role`;

      setToastMessage(
        isNotImplemented
          ? t('adminUsers.toastEndpointMissing', { endpoint: endpointPath, action: actionLabel })
          : (err?.message || t('adminUsers.toastUpdateFailed', { action: actionLabel }))
      );
      setToastType('error');
    } finally {
      setIsSubmittingAction(false);
      setModalAction(null);
    }
  };

  // Client-side search and role filtering
  const filteredUsers = users.filter((u) => {
    const nameMatch = (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const mobileMatch = (u.mobile || '').includes(searchQuery);
    const matchesSearch = nameMatch || emailMatch || mobileMatch;

    const userRole = (u.role || '').toLowerCase();
    let matchesRole = true;
    if (roleFilter === 'ADMIN') {
      matchesRole = userRole === 'admin' || (u.email || '').toLowerCase() === FIXED_ADMIN_EMAIL;
    } else if (roleFilter === 'DRIVER') {
      matchesRole = userRole === 'user' || userRole === 'driver';
    } else if (roleFilter === 'AUTHORITY') {
      matchesRole = userRole === 'authority';
    }

    return matchesSearch && matchesRole;
  });

  // KPI calculations
  const totalCount = users.length;
  const adminCount = users.filter(u => u.role === 'admin' || (u.email || '').toLowerCase() === FIXED_ADMIN_EMAIL).length;
  const driverCount = users.filter(u => u.role === 'user' || u.role === 'driver').length;
  const activeCount = users.filter(u => u.is_active).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <NotificationToast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-uber-mutedDark">
              {t('adminUsers.cityGovernance')}
            </span>
            <span className="text-gray-300 dark:text-uber-borderDark">•</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              {t('adminUsers.liveFeed')}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-uber-text dark:text-white tracking-tight">
            {t('adminUsers.title')}
          </h1>
          <p className="text-sm text-uber-muted dark:text-uber-mutedDark mt-1">
            {t('adminUsers.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            disabled={isLoading}
            onClick={fetchUsers}
          >
            {isLoading ? t('adminUsers.syncing') : t('adminUsers.syncData')}
          </Button>

          <Badge variant="neutral">
            <Users className="w-3.5 h-3.5 mr-1" />
            {totalCount} {totalCount === 1 ? t('adminUsers.userRegistered') : t('adminUsers.usersRegistered')}
          </Badge>
        </div>
      </div>

      {/* Connection Error Banner with Retry */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
                {t('adminUsers.fetchErrorTitle')}
              </h4>
              <p className="text-xs text-red-700 dark:text-red-400 font-mono mt-0.5">
                {fetchError}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="xs"
            pill
            icon={RefreshCw}
            onClick={fetchUsers}
            className="shrink-0"
          >
            {t('adminUsers.retryConnection')}
          </Button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="p-4 sm:p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {t('adminUsers.kpiTotal')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-uber-dark flex items-center justify-center text-uber-text dark:text-white">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-uber-text dark:text-white mt-2">
            {totalCount}
          </div>
          <div className="text-xs text-uber-muted dark:text-uber-mutedDark mt-1">
            {t('adminUsers.kpiTotalSub')}
          </div>
        </Card>

        <Card padding="p-4 sm:p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {t('adminUsers.kpiDrivers')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {driverCount}
          </div>
          <div className="text-xs text-uber-muted dark:text-uber-mutedDark mt-1">
            {t('adminUsers.kpiDriversSub')}
          </div>
        </Card>

        <Card padding="p-4 sm:p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {t('adminUsers.kpiAdmins')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">
            {adminCount}
          </div>
          <div className="text-xs text-uber-muted dark:text-uber-mutedDark mt-1 truncate" title={`Root: ${FIXED_ADMIN_EMAIL}`}>
            {t('adminUsers.kpiAdminsSub', { email: FIXED_ADMIN_EMAIL })}
          </div>
        </Card>

        <Card padding="p-4 sm:p-5" hover>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-uber-muted dark:text-uber-mutedDark">
              {t('adminUsers.kpiActive')}
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {activeCount}
          </div>
          <div className="text-xs text-uber-muted dark:text-uber-mutedDark mt-1">
            {t('adminUsers.kpiActiveSub')}
          </div>
        </Card>
      </div>

      {/* Filters & Search Card */}
      <Card padding="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-uber-muted dark:text-uber-mutedDark" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('adminUsers.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 dark:bg-uber-dark border border-gray-200 dark:border-uber-borderDark rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white text-uber-text dark:text-white"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: t('adminUsers.filterAll') },
              { id: 'ADMIN', label: t('adminUsers.filterAdmins') },
              { id: 'DRIVER', label: t('adminUsers.filterDrivers') },
              { id: 'AUTHORITY', label: t('adminUsers.filterAuthorities') }
            ].map((rf) => (
              <button
                key={rf.id}
                onClick={() => setRoleFilter(rf.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  roleFilter === rf.id
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'bg-gray-100 dark:bg-uber-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
                }`}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card
        title={t('adminUsers.tableTitle')}
        subtitle={t('adminUsers.tableSubtitle')}
        action={
          <Badge variant="neutral" size="sm">
            {t('adminUsers.shownCount', { count: filteredUsers.length })}
          </Badge>
        }
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-black dark:text-white" />
            <p className="text-sm font-semibold text-uber-text dark:text-white">
              {t('adminUsers.loadingTitle')}
            </p>
            <p className="text-xs text-uber-muted dark:text-uber-mutedDark">
              {t('adminUsers.loadingSubtitle')}
            </p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 dark:bg-uber-dark flex items-center justify-center text-uber-muted">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-uber-text dark:text-white">
              {t('adminUsers.emptyTitle')}
            </h3>
            <p className="text-xs text-uber-muted dark:text-uber-mutedDark max-w-sm mx-auto">
              {searchQuery || roleFilter !== 'ALL'
                ? t('adminUsers.emptySearch')
                : t('adminUsers.emptyNone')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 -my-4" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="min-w-[700px] w-full divide-y divide-gray-100 dark:divide-uber-borderDark">
              <thead className="bg-gray-50/70 dark:bg-uber-dark/60 text-uber-muted dark:text-uber-mutedDark font-semibold text-xs text-left uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">{t('adminUsers.colUserDetails')}</th>
                  <th className="px-6 py-3.5">{t('adminUsers.colRoleAccess')}</th>
                  <th className="px-6 py-3.5">{t('adminUsers.colContact')}</th>
                  <th className="px-6 py-3.5">{t('adminUsers.colAlertPrefs')}</th>
                  <th className="px-6 py-3.5">{t('adminUsers.colStatus')}</th>
                  <th className="px-6 py-3.5">{t('adminUsers.colRegistered')}</th>
                  <th className="px-6 py-3.5 text-right">{t('adminUsers.colActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-uber-borderDark text-sm">
                {filteredUsers.map((userRow) => {
                  const isRootAdmin = (userRow.email || '').toLowerCase() === FIXED_ADMIN_EMAIL;
                  const isAdminRole = (userRow.role || '').toLowerCase() === 'admin' || isRootAdmin;
                  const isAuthority = (userRow.role || '').toLowerCase() === 'authority';

                  return (
                    <tr 
                      key={userRow.id}
                      className="hover:bg-gray-50/60 dark:hover:bg-uber-dark/40 transition-colors"
                    >
                      {/* Name & Avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isAdminRole
                              ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                          }`}>
                            {(userRow.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-uber-text dark:text-white truncate">
                                {userRow.full_name || t('adminUsers.unnamedUser')}
                              </span>
                              {isRootAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                  {t('adminUsers.badgeMaster')}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-uber-muted dark:text-uber-mutedDark font-mono truncate">
                              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                              <span>{userRow.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role & Access */}
                      <td className="px-6 py-4">
                        {isAdminRole ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-purple-600 dark:text-purple-400" />
                              {t('adminUsers.roleAdmin')}
                            </span>
                            {isRootAdmin ? (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                {t('adminUsers.fixedRootAccess')}
                              </p>
                            ) : (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                                {t('adminUsers.designatedAdmin')}
                              </p>
                            )}
                          </div>
                        ) : isAuthority ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                            <Shield className="w-3.5 h-3.5 mr-1 text-blue-600 dark:text-blue-400" />
                            {t('adminUsers.roleAuthority')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                            <Car className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                            {t('adminUsers.roleDriver')}
                          </span>
                        )}
                      </td>

                      {/* Contact & Language */}
                      <td className="px-6 py-4 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-uber-text dark:text-gray-300">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span>{userRow.mobile || '—'}</span>
                        </div>
                        <div className="text-uber-muted dark:text-uber-mutedDark">
                          {t('adminUsers.langLabel')}{' '}
                          <span className="uppercase font-semibold">{userRow.preferred_language || 'EN'}</span>
                        </div>
                      </td>

                      {/* Alert Preferences */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {userRow.voice_alerts && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-uber-dark text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Volume2 className="w-3 h-3 text-emerald-500" /> {t('adminUsers.prefVoice')}
                            </span>
                          )}
                          {userRow.sound_alerts && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-uber-dark text-gray-700 dark:text-gray-300">
                              {t('adminUsers.prefSound')}
                            </span>
                          )}
                          {userRow.vibration_alerts && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-uber-dark text-gray-700 dark:text-gray-300">
                              {t('adminUsers.prefVibrate')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {userRow.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {t('adminUsers.statusActive')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {t('adminUsers.statusInactive')}
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="px-6 py-4 text-xs text-uber-muted dark:text-uber-mutedDark font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>
                            {userRow.created_at
                              ? new Date(userRow.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })
                              : '—'}
                          </span>
                        </div>
                      </td>

                      {/* Management Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        {isRootAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 dark:bg-uber-dark text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-uber-borderDark select-none">
                            <Lock className="w-3 h-3" />
                            {t('adminUsers.rootProtected')}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {/* Change Role Selector */}
                            <select
                              value={userRow.role || 'user'}
                              onChange={(e) => {
                                const nextRole = e.target.value;
                                if (nextRole !== (userRow.role || 'user')) {
                                  setSelectedNewRole(nextRole);
                                  setModalAction({
                                    type: 'ROLE',
                                    user: userRow,
                                    targetRole: nextRole,
                                  });
                                }
                              }}
                              className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-50 dark:bg-uber-dark border border-gray-200 dark:border-uber-borderDark text-uber-text dark:text-white focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition cursor-pointer"
                              title={t('adminUsers.changeRoleTitle')}
                            >
                              <option value="user">{t('adminUsers.roleOptionDriver')}</option>
                              <option value="authority">{t('adminUsers.roleOptionAuthority')}</option>
                              <option value="admin">{t('adminUsers.roleOptionAdmin')}</option>
                            </select>

                            {/* Activate / Deactivate Toggle Button */}
                            {userRow.is_active ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalAction({
                                    type: 'STATUS',
                                    user: userRow,
                                    targetStatus: false,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/50 transition cursor-pointer"
                                title={t('adminUsers.deactivateTitle')}
                              >
                                <UserX className="w-3.5 h-3.5" />
                                {t('adminUsers.btnDeactivate')}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setModalAction({
                                    type: 'STATUS',
                                    user: userRow,
                                    targetStatus: true,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/50 transition cursor-pointer"
                                title={t('adminUsers.activateTitle')}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                {t('adminUsers.btnActivate')}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* User Management Confirmation Modal */}
      <Modal
        isOpen={Boolean(modalAction)}
        onClose={() => {
          if (!isSubmittingAction) setModalAction(null);
        }}
        title={
          modalAction?.type === 'STATUS'
            ? modalAction.targetStatus
              ? t('adminUsers.modalActivateTitle')
              : t('adminUsers.modalDeactivateTitle')
            : t('adminUsers.modalRoleTitle')
        }
        maxWidth="max-w-md"
      >
        {modalAction && (
          <div className="space-y-4">
            {/* Target User Summary Card */}
            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-uber-dark border border-gray-100 dark:border-uber-borderDark flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40 shrink-0">
                {(modalAction.user.full_name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-uber-text dark:text-white truncate">
                  {modalAction.user.full_name || t('adminUsers.unnamedUser')}
                </h4>
                <p className="text-xs text-uber-muted dark:text-uber-mutedDark truncate font-mono">
                  {modalAction.user.email}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold uppercase bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                {modalAction.user.role || 'user'}
              </span>
            </div>

            {/* Modal Body for STATUS */}
            {modalAction.type === 'STATUS' && (
              <div className="space-y-3">
                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 ${
                    modalAction.targetStatus
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/40'
                  }`}
                >
                  {modalAction.targetStatus ? (
                    <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold mb-1">
                      {modalAction.targetStatus
                        ? t('adminUsers.modalActivateHeading')
                        : t('adminUsers.modalDeactivateHeading')}
                    </p>
                    <p>
                      {modalAction.targetStatus
                        ? t('adminUsers.modalActivateDesc', {
                            name: modalAction.user.full_name || modalAction.user.email,
                          })
                        : t('adminUsers.modalDeactivateDesc', {
                            name: modalAction.user.full_name || modalAction.user.email,
                          })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs px-1 text-uber-muted dark:text-uber-mutedDark">
                  <span>
                    {t('adminUsers.current')}{' '}
                    <strong className="text-uber-text dark:text-white">
                      {modalAction.user.is_active ? t('adminUsers.statusActive') : t('adminUsers.statusInactive')}
                    </strong>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>
                    {t('adminUsers.target')}{' '}
                    <strong className="text-uber-text dark:text-white">
                      {modalAction.targetStatus ? t('adminUsers.statusActive') : t('adminUsers.statusInactive')}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Modal Body for ROLE */}
            {modalAction.type === 'ROLE' && (
              <div className="space-y-3">
                <p className="text-xs text-uber-muted dark:text-uber-mutedDark">
                  {t('adminUsers.modalRoleSelectPrompt')}
                </p>

                <div className="space-y-2">
                  {[
                    {
                      id: 'user',
                      label: t('adminUsers.modalRoleDriverLabel'),
                      desc: t('adminUsers.modalRoleDriverDesc'),
                      icon: Car,
                    },
                    {
                      id: 'authority',
                      label: t('adminUsers.modalRoleAuthLabel'),
                      desc: t('adminUsers.modalRoleAuthDesc'),
                      icon: Shield,
                    },
                    {
                      id: 'admin',
                      label: t('adminUsers.modalRoleAdminLabel'),
                      desc: t('adminUsers.modalRoleAdminDesc'),
                      icon: ShieldCheck,
                    },
                  ].map((roleOption) => {
                    const IconComp = roleOption.icon;
                    const isSelected = selectedNewRole === roleOption.id;
                    return (
                      <label
                        key={roleOption.id}
                        onClick={() => setSelectedNewRole(roleOption.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-black dark:border-white bg-gray-50 dark:bg-uber-dark'
                            : 'border-gray-200 dark:border-uber-borderDark hover:bg-gray-50/60 dark:hover:bg-uber-dark/40'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selected_role"
                          checked={isSelected}
                          onChange={() => setSelectedNewRole(roleOption.id)}
                          className="mt-1 text-black dark:text-white focus:ring-black dark:focus:ring-white"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-uber-text dark:text-white">
                            <IconComp className="w-3.5 h-3.5 text-gray-500" />
                            <span>{roleOption.label}</span>
                            {modalAction.user.role === roleOption.id && (
                              <span className="text-[10px] text-gray-400 font-normal">
                                {t('adminUsers.currentTag')}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-uber-muted dark:text-uber-mutedDark mt-0.5">
                            {roleOption.desc}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <Button
                variant="secondary"
                size="sm"
                pill
                type="button"
                disabled={isSubmittingAction}
                onClick={() => setModalAction(null)}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                pill
                type="button"
                disabled={isSubmittingAction}
                onClick={handleConfirmAction}
                className="flex-1"
              >
                {isSubmittingAction ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('adminUsers.updating')}
                  </span>
                ) : modalAction.type === 'STATUS' ? (
                  modalAction.targetStatus ? t('adminUsers.confirmActivate') : t('adminUsers.confirmDeactivate')
                ) : (
                  t('adminUsers.confirmRoleChange')
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
