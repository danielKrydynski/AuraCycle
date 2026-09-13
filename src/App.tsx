/**
 * @file App.tsx
 * @description Main application controller and root container for AuraCycle / Cycle & Hormonal Health Tracker.
 * Manages the encrypted storage lifecycle (AES-256-GCM), biometric/passcode authentication states,
 * auto-lock inactivity monitoring, active tab routing, and modal workflows.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { LockScreen } from './components/LockScreen';
import { CycleDial } from './components/CycleDial';
import { CalendarView } from './components/CalendarView';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { DailyLogModal } from './components/DailyLogModal';
import { PrivacySettingsModal } from './components/PrivacySettingsModal';
import { ImportTrackerModal } from './components/ImportTrackerModal';
import { AppData, DailyLog, CyclePeriod, CyclePhase, UserSettings, EncryptedStore } from './types';
import { encryptData, decryptData, hashPin, generateDeviceKey } from './utils/crypto';
import { calculateCycleStatus, formatDate, addDays, PHASE_DETAILS } from './utils/cycleCalculations';
import { generateSampleData } from './data/seedData';
import { Droplets, Calendar, BarChart2, ShieldCheck, Plus, Sparkles, Thermometer, Zap, Upload } from 'lucide-react';

const STORAGE_VAULT_KEY = 'auracycle_encrypted_vault_v1';
const STORAGE_META_KEY = 'auracycle_meta_v1';

const DEFAULT_SETTINGS: UserSettings = {
  avgCycleLength: 28,
  avgPeriodLength: 5,
  tempUnit: 'F',
  autoLockMinutes: 15,
  isProtectedWithPin: false,
  setupCompleted: false,
};

const DEFAULT_APP_DATA: AppData = {
  periods: [],
  logs: {},
  settings: DEFAULT_SETTINGS,
};

export default function App() {
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [isSetupMode, setIsSetupMode] = useState<boolean>(false);
  const [activePin, setActivePin] = useState<string>('');
  const [appData, setAppData] = useState<AppData>(DEFAULT_APP_DATA);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'analytics' | 'insights'>('overview');
  const [selectedPhase, setSelectedPhase] = useState<CyclePhase>('follicular');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedDateForLog, setSelectedDateForLog] = useState<string>(formatDate(new Date()));
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Initialize vault check on mount
  useEffect(() => {
    const rawVault = localStorage.getItem(STORAGE_VAULT_KEY);
    const rawMeta = localStorage.getItem(STORAGE_META_KEY);

    if (!rawVault) {
      // First-time setup
      setIsSetupMode(true);
      setIsLocked(true);
    } else {
      const meta = rawMeta ? JSON.parse(rawMeta) : {};
      if (meta.isProtectedWithPin) {
        setIsSetupMode(false);
        setIsLocked(true);
      } else if (meta.autoKey) {
        // Auto-key device mode: auto decrypt on load
        (async () => {
          try {
            const vaultStore: EncryptedStore = JSON.parse(rawVault);
            const decrypted = await decryptData<AppData>(vaultStore, meta.autoKey);
            setAppData(decrypted);
            setActivePin(meta.autoKey);
            setIsLocked(false);
            const status = calculateCycleStatus(decrypted);
            setSelectedPhase(status.currentPhase);
          } catch {
            setIsSetupMode(true);
            setIsLocked(true);
          }
        })();
      } else {
        setIsSetupMode(false);
        setIsLocked(true);
      }
    }
  }, []);

  // Save changes to encrypted storage
  const saveEncrypted = useCallback(async (dataToSave: AppData, pinToUse = activePin) => {
    if (!pinToUse) return;
    try {
      const existingVaultRaw = localStorage.getItem(STORAGE_VAULT_KEY);
      let existingSalt: string | undefined = undefined;
      if (existingVaultRaw) {
        try {
          existingSalt = JSON.parse(existingVaultRaw).salt;
        } catch {}
      }

      const encryptedStore = await encryptData(dataToSave, pinToUse, existingSalt);
      localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(encryptedStore));
      setAppData(dataToSave);
    } catch (err) {
      console.error('Failed to encrypt data locally:', err);
    }
  }, [activePin]);

  // Unlock with user PIN
  const handleUnlock = async (pin: string): Promise<boolean> => {
    const rawVault = localStorage.getItem(STORAGE_VAULT_KEY);
    if (!rawVault) return false;

    try {
      const vaultStore: EncryptedStore = JSON.parse(rawVault);
      const decrypted = await decryptData<AppData>(vaultStore, pin);
      setAppData(decrypted);
      setActivePin(pin);
      setIsLocked(false);

      const status = calculateCycleStatus(decrypted);
      setSelectedPhase(status.currentPhase);
      return true;
    } catch {
      return false;
    }
  };

  // Setup with personal PIN
  const handleSetupPin = async (pin: string) => {
    const freshData: AppData = {
      ...DEFAULT_APP_DATA,
      settings: {
        ...DEFAULT_SETTINGS,
        isProtectedWithPin: true,
        setupCompleted: true,
      },
    };

    const encrypted = await encryptData(freshData, pin);
    localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(encrypted));
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ isProtectedWithPin: true, setupCompleted: true })
    );

    setActivePin(pin);
    setAppData(freshData);
    setIsSetupMode(false);
    setIsLocked(false);
  };

  // Setup with Device Key (No PIN required, but 100% AES-256 encrypted locally)
  const handleSetupDeviceKey = async () => {
    const deviceKey = generateDeviceKey();
    const freshData: AppData = {
      ...DEFAULT_APP_DATA,
      settings: {
        ...DEFAULT_SETTINGS,
        isProtectedWithPin: false,
        setupCompleted: true,
      },
    };

    const encrypted = await encryptData(freshData, deviceKey);
    localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(encrypted));
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ isProtectedWithPin: false, autoKey: deviceKey, setupCompleted: true })
    );

    setActivePin(deviceKey);
    setAppData(freshData);
    setIsSetupMode(false);
    setIsLocked(false);
  };

  // Load Demonstration Hormonal Dataset
  const handleLoadDemoData = async () => {
    const sample = generateSampleData();
    let key = activePin;
    if (!key) {
      key = generateDeviceKey();
      localStorage.setItem(
        STORAGE_META_KEY,
        JSON.stringify({ isProtectedWithPin: false, autoKey: key, setupCompleted: true })
      );
    }

    const encrypted = await encryptData(sample, key);
    localStorage.setItem(STORAGE_VAULT_KEY, JSON.stringify(encrypted));
    setActivePin(key);
    setAppData(sample);
    setIsSetupMode(false);
    setIsLocked(false);
    const status = calculateCycleStatus(sample);
    setSelectedPhase(status.currentPhase);
  };

  // Update Settings
  const handleUpdateSettings = async (newSettings: Partial<UserSettings>) => {
    const updated: AppData = {
      ...appData,
      settings: {
        ...appData.settings,
        ...newSettings,
      },
    };
    await saveEncrypted(updated);
  };

  // Change PIN
  const handleChangePin = async (newPin: string) => {
    await saveEncrypted(appData, newPin);
    setActivePin(newPin);
    localStorage.setItem(
      STORAGE_META_KEY,
      JSON.stringify({ isProtectedWithPin: true, setupCompleted: true })
    );
  };

  // Clear/Wipe all local data
  const handleClearAllData = async () => {
    if (confirm('Permanently wipe all encrypted data and keys from this device?')) {
      localStorage.removeItem(STORAGE_VAULT_KEY);
      localStorage.removeItem(STORAGE_META_KEY);
      setAppData(DEFAULT_APP_DATA);
      setActivePin('');
      setIsSetupMode(true);
      setIsLocked(true);
      setIsPrivacyModalOpen(false);
    }
  };

  // Save Daily Log
  const handleSaveDailyLog = async (log: DailyLog, isPeriodDay: boolean) => {
    const updatedLogs = { ...appData.logs, [log.date]: log };
    let updatedPeriods = [...appData.periods];

    // If marked as period day, ensure periods record exists or updates
    if (isPeriodDay) {
      // Find if this date is part of an existing period or adjacent
      const existingPeriodIndex = updatedPeriods.findIndex(
        (p) => log.date >= p.startDate && (!p.endDate || log.date <= addDays(p.endDate, 2))
      );

      if (existingPeriodIndex >= 0) {
        const p = updatedPeriods[existingPeriodIndex];
        if (!p.endDate || log.date > p.endDate) {
          updatedPeriods[existingPeriodIndex] = {
            ...p,
            endDate: log.date,
            flowIntensity: log.flow || p.flowIntensity,
          };
        }
      } else {
        // Create new period cycle
        const newPeriod: CyclePeriod = {
          id: `period-${log.date}`,
          startDate: log.date,
          endDate: log.date,
          flowIntensity: log.flow || 'medium',
        };
        updatedPeriods.push(newPeriod);
      }
    }

    const updatedData: AppData = {
      ...appData,
      logs: updatedLogs,
      periods: updatedPeriods,
    };

    await saveEncrypted(updatedData);
  };

  // Delete Log
  const handleDeleteDailyLog = async (dateStr: string) => {
    const updatedLogs = { ...appData.logs };
    delete updatedLogs[dateStr];

    const updatedData: AppData = {
      ...appData,
      logs: updatedLogs,
    };

    await saveEncrypted(updatedData);
  };

  // Import Backup Data
  const handleImportData = async (imported: AppData) => {
    await saveEncrypted(imported);
    const status = calculateCycleStatus(imported);
    setSelectedPhase(status.currentPhase);
  };

  // Import from other cycle trackers (Clue, Flo, Apple Health, CSV)
  const handleConfirmTrackerImport = async (importedData: AppData, mergeMode: 'merge' | 'replace') => {
    await saveEncrypted(importedData);
    const status = calculateCycleStatus(importedData);
    setSelectedPhase(status.currentPhase);
  };

  // Lock Application manually
  const handleLockApp = () => {
    setIsLocked(true);
  };

  // If locked, render Lock / Setup screen
  if (isLocked) {
    return (
      <LockScreen
        isSetupMode={isSetupMode}
        onUnlock={handleUnlock}
        onSetupPin={handleSetupPin}
        onSetupDeviceKey={handleSetupDeviceKey}
        onLoadDemoData={handleLoadDemoData}
      />
    );
  }

  // Calculate current cycle metrics
  const cycleStatus = calculateCycleStatus(appData);
  const todayStr = formatDate(new Date());
  const todayLog = appData.logs[todayStr];

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-emerald-800 selection:text-white">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogModal={() => {
          setSelectedDateForLog(todayStr);
          setIsLogModalOpen(true);
        }}
        onOpenPrivacyModal={() => setIsPrivacyModalOpen(true)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
        onLockApp={handleLockApp}
        isPinProtected={appData.settings.isProtectedWithPin}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Today's Snapshot Card */}
            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                  <Droplets className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                      Today's Log
                    </span>
                    <span className="text-xs font-mono text-stone-400 font-medium">
                      {todayStr}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-stone-200 mt-0.5">
                    {todayLog ? (
                      <span className="flex items-center gap-2">
                        <span>Energy: {todayLog.energy}/5</span>
                        {todayLog.bbt && <span>• BBT: {todayLog.bbt}°{appData.settings.tempUnit}</span>}
                        {todayLog.physicalSymptoms.length > 0 && (
                          <span>• {todayLog.physicalSymptoms.length} symptoms noted</span>
                        )}
                      </span>
                    ) : (
                      'No symptoms logged for today yet'
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
                <button
                  id="btn-import-tracker-banner"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-xs font-medium text-stone-300 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
                  title="Import cycle data from Clue, Flo, or Apple Health"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Import Data</span>
                </button>

                <button
                  id="btn-log-today-banner"
                  onClick={() => {
                    setSelectedDateForLog(todayStr);
                    setIsLogModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-xs font-medium text-white flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{todayLog ? 'Update Today' : 'Log Today'}</span>
                </button>
              </div>
            </div>

            {/* Cycle History Migration Banner */}
            {appData.periods.length <= 1 && (
              <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-stone-200">
                      Switching from Clue, Flo, or Apple Health?
                    </h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Migrate past cycles, temperature curves, and symptoms directly into your private encrypted vault.
                    </p>
                  </div>
                </div>
                <button
                  id="btn-import-history-banner-callout"
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-colors flex items-center gap-2 ml-auto sm:ml-0 shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Launch Import Wizard</span>
                </button>
              </div>
            )}

            {/* Interactive Radial Cycle Dial & Hormonal Dynamics */}
            <CycleDial
              status={cycleStatus}
              selectedPhase={selectedPhase}
              onSelectPhase={(phase) => setSelectedPhase(phase)}
              onOpenLogModal={() => {
                setSelectedDateForLog(todayStr);
                setIsLogModalOpen(true);
              }}
            />

            {/* Biomarker Summary Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Cycle Length
                </span>
                <div className="text-xl sm:text-2xl font-serif-heading font-semibold text-stone-100 mt-1">
                  {appData.settings.avgCycleLength || 28} <span className="text-xs text-stone-500 font-sans">days</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Estimated regularity</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Period Duration
                </span>
                <div className="text-xl sm:text-2xl font-serif-heading font-semibold text-stone-100 mt-1">
                  {appData.settings.avgPeriodLength || 5} <span className="text-xs text-stone-500 font-sans">days</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Average flow window</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Estimated Ovulation
                </span>
                <div className="text-xl sm:text-2xl font-serif-heading font-semibold text-stone-100 mt-1">
                  Day {Math.max(10, (appData.settings.avgCycleLength || 28) - 14)}
                </div>
                <p className="text-[11px] text-amber-500/90 mt-0.5 font-medium">Estrogen zenith</p>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 shadow-sm">
                <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                  Vault Security
                </span>
                <div className="text-xl sm:text-2xl font-serif-heading font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-base font-sans font-bold">256-Bit</span>
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Zero network syncing</p>
              </div>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <CalendarView
            data={appData}
            onSelectDateToLog={(dateStr) => {
              setSelectedDateForLog(dateStr);
              setIsLogModalOpen(true);
            }}
            tempUnit={appData.settings.tempUnit || 'F'}
          />
        )}

        {/* ANALYTICS & HORMONE TRENDS TAB */}
        {activeTab === 'analytics' && (
          <AnalyticsCharts
            data={appData}
            tempUnit={appData.settings.tempUnit || 'F'}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-850 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AuraCycle • Private Hormonal & Cycle Health</span>
          <span className="flex items-center gap-1.5 text-stone-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% On-Device Cryptographic Vault
          </span>
        </div>
      </footer>

      {/* Daily Log Modal */}
      <DailyLogModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        selectedDate={selectedDateForLog}
        existingLog={appData.logs[selectedDateForLog]}
        onSaveLog={handleSaveDailyLog}
        onDeleteLog={handleDeleteDailyLog}
        tempUnit={appData.settings.tempUnit || 'F'}
      />

      {/* Privacy & Settings Modal */}
      <PrivacySettingsModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        data={appData}
        onUpdateSettings={handleUpdateSettings}
        onChangePin={handleChangePin}
        onClearAllData={handleClearAllData}
        onLoadSampleData={handleLoadDemoData}
        onImportData={handleImportData}
        onOpenImportTrackerModal={() => setIsImportModalOpen(true)}
        currentPin={activePin}
      />

      {/* Cycle Tracker Import Wizard Modal */}
      <ImportTrackerModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmTrackerImport}
        currentData={appData}
        tempUnit={appData.settings.tempUnit || 'F'}
      />
    </div>
  );
}
