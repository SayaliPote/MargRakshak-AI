import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { 
  Settings, 
  Bell, 
  Mail, 
  MessageSquare, 
  Map, 
  Users, 
  KeyRound, 
  Check,
  Shield
} from 'lucide-react';

import { useLanguage } from '../../context/LanguageContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { language, setLanguage, languages } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  const [systemName, setSystemName] = useState('MargRakshak AI - Accident Detection System');
  const [dateRange, setDateRange] = useState('2022 - 2026');
  const [riskLevel, setRiskLevel] = useState('All Risk Levels');
  const [distanceUnit, setDistanceUnit] = useState('Kilometers (km)');
  const [voiceAlerts, setVoiceAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  const tabs = [
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'alerts', label: 'Alert Settings', icon: Bell },
    { id: 'email', label: 'Email Notifications', icon: Mail },
    { id: 'sms', label: 'SMS Notifications', icon: MessageSquare },
    { id: 'map', label: 'Map Settings', icon: Map },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'password', label: 'Change Password', icon: KeyRound },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="System Settings" maxWidth="max-w-3xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Tabs */}
        <div className="md:col-span-4 space-y-1 border-r border-gray-100 dark:border-gray-800 pr-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left ${
                  isActive
                    ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Tab Content */}
        <div className="md:col-span-8">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  System Name
                </label>
                <input
                  type="text"
                  value={systemName}
                  onChange={(e) => setSystemName(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Default Date Range
                  </label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  >
                    <option value="2022 - 2026">2022 - 2026</option>
                    <option value="2024 - 2026">2024 - 2026</option>
                    <option value="Last 30 Days">Last 30 Days</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Default Risk Level
                  </label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  >
                    <option value="All Risk Levels">All Risk Levels</option>
                    <option value="Critical Only">Critical Only</option>
                    <option value="High & Critical">High & Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Distance Unit
                  </label>
                  <select
                    value={distanceUnit}
                    onChange={(e) => setDistanceUnit(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  >
                    <option value="Kilometers (km)">Kilometers (km)</option>
                    <option value="Miles (mi)">Miles (mi)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <Button variant="secondary" size="sm" onClick={onClose}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  {saved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          )}

          {activeTab !== 'general' && (
            <div className="py-10 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
                Preferences for this section are managed via system environment config and local browser persistence.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setActiveTab('general')}>
                Back to General
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
