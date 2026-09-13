/**
 * @file ImportTrackerModal.tsx
 * @description Ingestion dialog allowing users to import historical cycle and symptom data from
 * external trackers (Clue, Flo, Apple Health, custom CSV/spreadsheets, and JSON backups).
 * Features real-time format detection, pre-import data verification preview, sample CSV template download,
 * and flexible merge vs replace strategies.
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Calendar,
  Thermometer,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Database,
  ArrowRight,
} from 'lucide-react';
import { AppData, DailyLog } from '../types';
import {
  parseTrackerData,
  ImportPreview,
  TrackerSource,
  generateSampleCsvTemplate,
} from '../utils/importers';
import { downloadFile } from '../utils/crypto';

interface ImportTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (importedData: AppData, mergeMode: 'merge' | 'replace') => Promise<void>;
  currentData: AppData;
  tempUnit: 'F' | 'C';
}

const SUPPORTED_TRACKERS: { id: TrackerSource; name: string; desc: string; tip: string }[] = [
  {
    id: 'clue',
    name: 'Clue',
    desc: 'CSV or JSON archive',
    tip: 'In Clue: More > Settings > Data & Privacy > Export data.',
  },
  {
    id: 'flo',
    name: 'Flo',
    desc: 'CSV export',
    tip: 'In Flo: Profile > Settings > Data Export / Request data.',
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    desc: 'Cycle tracking CSV/XML',
    tip: 'In Health app: Profile > Export All Health Data, or use a health CSV exporter tool.',
  },
  {
    id: 'generic_csv',
    name: 'Custom CSV / Excel',
    desc: 'Spreadsheet format',
    tip: 'Columns: Date, Flow, Temperature, Symptoms, Mood, Notes.',
  },
  {
    id: 'json',
    name: 'AuraCycle / JSON',
    desc: 'Direct backup',
    tip: 'Standard JSON structure with periods and symptom logs.',
  },
];

export const ImportTrackerModal: React.FC<ImportTrackerModalProps> = ({
  isOpen,
  onClose,
  onConfirmImport,
  currentData,
  tempUnit,
}) => {
  const [selectedSource, setSelectedSource] = useState<TrackerSource>('auto');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [mergeMode, setMergeMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessRaw = (content: string, name = 'Pasted Data') => {
    setErrorMsg('');
    setPreview(null);
    try {
      const parsed = parseTrackerData(content, tempUnit);
      setPreview(parsed);
      setFileContent(content);
      setFileName(name);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse file. Please verify format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      handleProcessRaw(text, file.name);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  const handleApplyPasted = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste CSV or JSON data first.');
      return;
    }
    handleProcessRaw(pastedText, 'Pasted Text Data');
  };

  const handleDownloadSample = () => {
    const sample = generateSampleCsvTemplate();
    downloadFile(sample, 'cycle_tracker_import_template.csv', 'text/csv');
  };

  const handleFinalImport = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      let finalLogs = { ...preview.logs };
      let finalPeriods = [...preview.periods];

      if (mergeMode === 'merge') {
        // Merge with existing logs
        finalLogs = {
          ...preview.logs,
          ...currentData.logs, // existing logs take precedence or vice-versa
        };

        // Combine periods and deduplicate by startDate
        const seenStarts = new Set(currentData.periods.map((p) => p.startDate));
        const newPeriodsToAdd = preview.periods.filter((p) => !seenStarts.has(p.startDate));
        finalPeriods = [...currentData.periods, ...newPeriodsToAdd].sort((a, b) =>
          b.startDate.localeCompare(a.startDate)
        );
      }

      const importedAppData: AppData = {
        periods: finalPeriods,
        logs: finalLogs,
        settings: {
          ...currentData.settings,
          setupCompleted: true,
        },
      };

      await onConfirmImport(importedAppData, mergeMode);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete encrypted import.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-stone-100 my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                Import from Other Cycle Trackers
              </h3>
              <p className="text-xs text-stone-400">
                Seamlessly migrate your history from Clue, Flo, Apple Health, or CSV.
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

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Privacy Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-xs text-stone-300 leading-normal">
              <span className="font-semibold text-emerald-300">100% Client-Side Processing:</span>{' '}
              Your uploaded files never touch a cloud server. Parsing and encryption happen entirely inside your browser.
            </p>
          </div>

          {!preview ? (
            <div className="space-y-6">
              {/* Tracker Source Cards */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2.5">
                  Supported Trackers & Sources
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SUPPORTED_TRACKERS.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-stone-850 border border-stone-800 text-left hover:border-stone-700 transition-colors"
                    >
                      <div className="text-xs font-semibold text-stone-200">{t.name}</div>
                      <div className="text-[11px] text-stone-400 mt-0.5">{t.desc}</div>
                      <div className="text-[10px] text-stone-500 mt-1.5 leading-tight">{t.tip}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload or Paste Tab Switcher */}
              <div className="flex border-b border-stone-800">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File (.csv / .json)</span>
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className={`py-2 px-4 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Paste Raw Text / CSV</span>
                </button>
              </div>

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.json,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-2xl border-2 border-dashed border-stone-700 hover:border-emerald-600/70 bg-stone-850/50 hover:bg-stone-850 cursor-pointer text-center transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-stone-800 group-hover:bg-emerald-950/80 border border-stone-700 group-hover:border-emerald-700 flex items-center justify-center text-stone-300 group-hover:text-emerald-400 mx-auto mb-3 transition-colors">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-stone-200">
                      Click or drop your exported file here
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      Supports .csv exports from Clue, Flo, Apple Health, or JSON
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-stone-500">Need a spreadsheet template?</span>
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV Template</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Paste Tab */}
              {activeTab === 'paste' && (
                <div className="space-y-3">
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Date,Flow,Temperature,Symptoms,Mood,Notes&#10;2026-08-10,heavy,97.2,cramps,calm&#10;2026-08-11,medium,97.3,cramps,calm..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 text-xs font-mono focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleDownloadSample}
                      className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sample CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyPasted}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors"
                    >
                      Parse Pasted Content
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          ) : (
            /* PREVIEW STEP */
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                    File Parsed Successfully
                  </span>
                  <h4 className="text-base font-serif-heading font-semibold text-stone-100">
                    {fileName}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-xs text-stone-400 hover:text-stone-200 underline"
                >
                  Choose Different File
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Days Logged</div>
                  <div className="text-lg font-bold text-stone-100 mt-0.5">{preview.totalDays}</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Period Cycles</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">{preview.totalPeriods}</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">BBT Readings</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">{preview.bbtCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[10px] text-stone-400 uppercase tracking-wider">Symptoms</div>
                  <div className="text-lg font-bold text-stone-200 mt-0.5">{preview.symptomCount}</div>
                </div>
              </div>

              {/* Date Span */}
              <div className="p-3 rounded-xl bg-stone-850 border border-stone-800 flex items-center justify-between text-xs">
                <span className="text-stone-400">Chronological Span:</span>
                <span className="font-mono text-stone-200 font-medium">
                  {preview.dateRange.start} → {preview.dateRange.end}
                </span>
              </div>

              {/* Sample Parsed Rows Table */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
                  Sample Data Preview (First 4 Days)
                </label>
                <div className="border border-stone-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-850 text-stone-400 border-b border-stone-800">
                      <tr>
                        <th className="p-2 font-medium">Date</th>
                        <th className="p-2 font-medium">Flow</th>
                        <th className="p-2 font-medium">BBT</th>
                        <th className="p-2 font-medium">Symptoms</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-850 bg-stone-900">
                      {(Object.values(preview.logs) as DailyLog[])
                        .slice(0, 4)
                        .map((l: DailyLog) => (
                          <tr key={l.date} className="hover:bg-stone-850/50">
                            <td className="p-2 font-mono text-stone-300">{l.date}</td>
                            <td className="p-2 capitalize text-amber-300">{l.flow || 'None'}</td>
                            <td className="p-2 font-mono text-emerald-400">
                              {l.bbt ? `${l.bbt}°${l.tempUnit}` : '-'}
                            </td>
                            <td className="p-2 text-stone-400 truncate max-w-[150px]">
                              {l.physicalSymptoms.length > 0 ? l.physicalSymptoms.join(', ') : '-'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Merge or Replace Strategy */}
              <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800 space-y-2">
                <label className="block text-xs font-semibold text-stone-300">
                  Integration Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMergeMode('merge')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      mergeMode === 'merge'
                        ? 'bg-emerald-950/60 border-emerald-600 text-emerald-200'
                        : 'bg-stone-800/80 border-stone-700 text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-semibold">Merge with Existing</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Combines new cycle history with your current logs.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMergeMode('replace')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      mergeMode === 'replace'
                        ? 'bg-amber-950/60 border-amber-600 text-amber-200'
                        : 'bg-stone-800/80 border-stone-700 text-stone-400'
                    }`}
                  >
                    <div className="text-xs font-semibold">Replace Vault Data</div>
                    <div className="text-[11px] opacity-80 mt-0.5">
                      Overwrites existing records with this imported file.
                    </div>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-stone-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl"
          >
            Cancel
          </button>

          {preview && (
            <button
              type="button"
              id="btn-confirm-import-data"
              disabled={isProcessing}
              onClick={handleFinalImport}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isProcessing ? 'Encrypting & Importing...' : 'Encrypt & Import to Vault'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
