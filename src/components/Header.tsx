/**
 * @file Header.tsx
 * @description Top navigation bar component providing tab switching (Overview, Calendar, Analytics,
 * Insights), quick action buttons for daily logging, cycle data import, privacy settings, and manual vault locking.
 */

import React from 'react';
import { Lock, ShieldCheck, Plus, BarChart2, Calendar, Settings, Upload } from 'lucide-react';

interface HeaderProps {
  activeTab: 'overview' | 'calendar' | 'analytics' | 'insights';
  setActiveTab: (tab: 'overview' | 'calendar' | 'analytics' | 'insights') => void;
  onOpenLogModal: () => void;
  onOpenPrivacyModal: () => void;
  onOpenImportModal: () => void;
  onLockApp: () => void;
  isPinProtected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenLogModal,
  onOpenPrivacyModal,
  onOpenImportModal,
  onLockApp,
  isPinProtected,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-stone-900 text-stone-100 border-b border-stone-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-700 to-amber-700 flex items-center justify-center text-white shadow-inner">
              <svg className="w-5 h-5 text-stone-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="#b87c22" strokeWidth="2.5" />
                <path d="M12 6a6 6 0 0 1 6 6" stroke="#2f6d54" strokeWidth="2.5" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="font-serif-heading text-lg font-semibold tracking-wide text-stone-100">
                AuraCycle
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                Hormonal Health
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-stone-800/80 p-1 rounded-xl border border-stone-700/60">
            <button
              id="nav-tab-overview"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-stone-700 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              Cycle Dashboard
            </button>
            <button
              id="nav-tab-calendar"
              onClick={() => setActiveTab('calendar')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'calendar'
                  ? 'bg-stone-700 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              id="nav-tab-analytics"
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics'
                  ? 'bg-stone-700 text-white shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              Hormone Trends & BBT
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Import Tracker Button */}
            <button
              id="btn-header-import-tracker"
              onClick={onOpenImportModal}
              title="Import past data from Clue, Flo, Apple Health, or CSV"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Import History</span>
            </button>

            {/* Encryption & Privacy Status Pill */}
            <button
              id="btn-privacy-badge"
              onClick={onOpenPrivacyModal}
              title="Click to inspect local on-device encryption"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800/90 text-stone-300 border border-stone-700 hover:border-emerald-700/60 hover:text-emerald-300 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>AES-256 Encrypted</span>
            </button>

            {/* Quick Log Button */}
            <button
              id="btn-quick-log"
              onClick={onOpenLogModal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Log Symptoms</span>
            </button>

            {/* Privacy & Settings */}
            <button
              id="btn-settings-toggle"
              onClick={onOpenPrivacyModal}
              title="Privacy & Backup Settings"
              className="p-2 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Lock Button */}
            {isPinProtected && (
              <button
                id="btn-lock-now"
                onClick={onLockApp}
                title="Lock Application Now"
                className="p-2 text-amber-400/90 hover:text-amber-300 hover:bg-stone-800 rounded-lg transition-colors"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-stone-800">
          <button
            onClick={() => setActiveTab('overview')}
            className={`text-xs py-1 px-2.5 rounded font-medium ${
              activeTab === 'overview' ? 'text-white bg-stone-800' : 'text-stone-400'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`text-xs py-1 px-2.5 rounded font-medium ${
              activeTab === 'calendar' ? 'text-white bg-stone-800' : 'text-stone-400'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`text-xs py-1 px-2.5 rounded font-medium ${
              activeTab === 'analytics' ? 'text-white bg-stone-800' : 'text-stone-400'
            }`}
          >
            Hormones & Charts
          </button>
        </div>
      </div>
    </header>
  );
};
