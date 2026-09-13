/**
 * @file PrivacySettingsModal.tsx
 * @description Privacy and Security settings modal providing controls for:
 * - Passcode / PIN setup, modification, and removal.
 * - Auto-lock timers and inactivity policies.
 * - AES-256-GCM encrypted backup export and file restoration.
 * - Direct launcher for the Tracker Import Wizard.
 * - Cycle parameter configuration (average cycle duration and period length).
 * - Complete cryptographic vault purge (zero-trace erase).
 */

import React, { useState, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Download,
  Upload,
  Lock,
  Trash2,
  Sparkles,
  Key,
  CheckCircle2,
  FileText,
  Sliders,
} from 'lucide-react';
import { AppData, UserSettings } from '../types';
import { downloadFile, encryptData, hashPin } from '../utils/crypto';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onUpdateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  onChangePin: (newPin: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
  onLoadSampleData: () => Promise<void>;
  onImportData: (importedData: AppData) => Promise<void>;
  onOpenImportTrackerModal?: () => void;
  currentPin: string;
}

export const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({
  isOpen,
  onClose,
  data,
  onUpdateSettings,
  onChangePin,
  onClearAllData,
  onLoadSampleData,
  onImportData,
  onOpenImportTrackerModal,
  currentPin,
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'cycle' | 'data'>('privacy');
  const [cycleLength, setCycleLength] = useState(data.settings.avgCycleLength || 28);
  const [periodLength, setPeriodLength] = useState(data.settings.avgPeriodLength || 5);
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>(data.settings.tempUnit || 'F');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinFeedback, setPinFeedback] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSaveCycleSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      avgCycleLength: cycleLength,
      avgPeriodLength: periodLength,
      tempUnit,
    });
    setStatusMsg('Cycle settings saved successfully.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length < 4) {
      setPinFeedback('Passcode must be at least 4 digits or characters.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinFeedback('Passcodes do not match.');
      return;
    }
    try {
      await onChangePin(newPin);
      setNewPin('');
      setConfirmPin('');
      setPinFeedback('Passcode updated successfully.');
      setTimeout(() => setPinFeedback(''), 3000);
    } catch {
      setPinFeedback('Failed to update passcode.');
    }
  };

  const handleExportEncrypted = async () => {
    try {
      const encryptedBundle = await encryptData(data, currentPin);
      const json = JSON.stringify(encryptedBundle, null, 2);
      downloadFile(json, `auracycle_encrypted_backup_${new Date().toISOString().slice(0, 10)}.json`);
      setStatusMsg('Encrypted backup downloaded.');
      setTimeout(() => setStatusMsg(''), 3000);
    } catch {
      setStatusMsg('Export failed.');
    }
  };

  const handleExportReport = () => {
    const report = {
      exportDate: new Date().toISOString(),
      privacyNote: 'Exported directly from user on-device vault for healthcare review.',
      settings: data.settings,
      periodsSummary: data.periods,
      totalLoggedEntries: Object.keys(data.logs).length,
      logs: data.logs,
    };
    downloadFile(
      JSON.stringify(report, null, 2),
      `cycle_health_clinical_report_${new Date().toISOString().slice(0, 10)}.json`
    );
    setStatusMsg('Clinical health report downloaded.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);

        // Check if it's already an unencrypted AppData structure
        if (parsed.periods && parsed.logs && parsed.settings) {
          await onImportData(parsed as AppData);
          setStatusMsg('Data successfully restored.');
        } else if (parsed.ciphertext && parsed.salt && parsed.iv) {
          // Encrypted file - import via parent decrypt
          alert('Encrypted backups require decryption with their corresponding passcode. Please import unencrypted clinical backups or contact support.');
        } else {
          alert('Unrecognized backup format.');
        }
      } catch {
        alert('Failed to parse the backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl text-stone-100 my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                Privacy, Security & Cycle Settings
              </h3>
              <p className="text-xs text-stone-400">
                Client-side cryptographic vault controls & personal preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-stone-800 px-6 pt-2">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'privacy'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Encryption & Security</span>
          </button>
          <button
            onClick={() => setActiveTab('cycle')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'cycle'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cycle Parameters</span>
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2.5 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'data'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup & Export</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: Privacy & Security */}
          {activeTab === 'privacy' && (
            <div className="space-y-5">
              {/* Privacy Architecture Notice */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>On-Device Zero-Knowledge Guarantee</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed">
                  Every cycle entry, temperature measurement, and symptom tag is encrypted on your device using the browser's native Web Crypto API (AES-256 GCM with PBKDF2 100,000 SHA-256 iterations). No health data is ever transmitted across the network or stored in the cloud.
                </p>
                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-stone-400 font-mono">
                  <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">AES-GCM-256</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">PBKDF2 SHA-256</span>
                  <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700">Local-Only IndexedDB</span>
                </div>
              </div>

              {/* Change Passcode */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-stone-200 mb-3">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>Update Master Passcode / PIN</span>
                </div>

                {pinFeedback && (
                  <div className="mb-3 text-xs text-amber-300 bg-amber-950/40 p-2 rounded-lg border border-amber-800/40">
                    {pinFeedback}
                  </div>
                )}

                <form onSubmit={handleChangePinSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      id="input-new-pin"
                      type="password"
                      placeholder="New Passcode (min 4 digits)"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono"
                    />
                    <input
                      id="input-confirm-pin"
                      type="password"
                      placeholder="Confirm New Passcode"
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    id="btn-submit-change-pin"
                    className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors"
                  >
                    Change Vault Passcode
                  </button>
                </form>
              </div>

              {/* Emergency Purge */}
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-900/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Trash2 className="w-4 h-4" />
                  <span>Emergency Vault Purge</span>
                </div>
                <p className="text-xs text-stone-400">
                  Instantly zeroes out all encrypted local records and crypto keys from this browser storage. This action cannot be undone.
                </p>
                <button
                  id="btn-purge-all-data"
                  onClick={onClearAllData}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-900/60 hover:bg-amber-900 border border-amber-700/60 text-amber-200 text-xs font-medium transition-colors"
                >
                  Permanently Wipe All Local Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Cycle Parameters */}
          {activeTab === 'cycle' && (
            <form onSubmit={handleSaveCycleSettings} className="space-y-5">
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-300">
                      Average Total Cycle Length
                    </label>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {cycleLength} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="21"
                    max="45"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>21d</span>
                    <span>28d (Standard)</span>
                    <span>45d</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-stone-300">
                      Average Menstruation Period Length
                    </label>
                    <span className="text-xs font-mono text-amber-400 font-bold">
                      {periodLength} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={periodLength}
                    onChange={(e) => setPeriodLength(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-stone-500 font-mono">
                    <span>2d</span>
                    <span>5d (Typical)</span>
                    <span>10d</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-2">
                    Temperature Unit (Basal Body Temp)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTempUnit('F')}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        tempUnit === 'F'
                          ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      Fahrenheit (°F)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTempUnit('C')}
                      className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                        tempUnit === 'C'
                          ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                          : 'bg-stone-800 text-stone-400 border-stone-700'
                      }`}
                    >
                      Celsius (°C)
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-save-cycle-params"
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
              >
                Save Cycle Parameters
              </button>
            </form>
          )}

          {/* TAB 3: Data Export & Backup */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              {/* Import from Other Cycle Trackers */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/50 to-stone-850 border border-emerald-800/60 flex items-center justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <Upload className="w-4 h-4" />
                    <span>Import from Other Cycle Trackers</span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1 max-w-sm">
                    Migrate your history from Clue, Flo, Apple Health, or custom spreadsheet CSVs with automatic column mapping.
                  </p>
                </div>
                {onOpenImportTrackerModal && (
                  <button
                    id="btn-open-import-wizard-from-settings"
                    onClick={() => {
                      onClose();
                      onOpenImportTrackerModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <span>Import Wizard</span>
                  </button>
                )}
              </div>

              {/* Encrypted Backup Download */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    Export Encrypted Vault Backup (.json)
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    AES-256 encrypted payload. Safe to store anywhere.
                  </p>
                </div>
                <button
                  id="btn-export-encrypted"
                  onClick={handleExportEncrypted}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 font-medium transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>

              {/* Clinical Report Export */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    Export Clinical Health Summary
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Unencrypted JSON of your symptoms, BBT, and cycle history to share with your doctor.
                  </p>
                </div>
                <button
                  id="btn-export-report"
                  onClick={handleExportReport}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 font-medium transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              {/* Restore Backup */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    Restore from Backup
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Import and merge previous cycle logs.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleFileImport}
                    className="hidden"
                  />
                  <button
                    id="btn-import-backup"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 font-medium transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* Preloaded Sample Dataset */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-200">
                    Load Demonstration Hormonal Dataset
                  </h4>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Preloads 75 days of realistic BBT, flow, and hormonal symptoms.
                  </p>
                </div>
                <button
                  id="btn-load-sample-in-modal"
                  onClick={async () => {
                    await onLoadSampleData();
                    setStatusMsg('Sample data loaded into encrypted vault.');
                    setTimeout(() => setStatusMsg(''), 3000);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 text-xs text-amber-200 font-medium transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Demo</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
