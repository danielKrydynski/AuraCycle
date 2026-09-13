/**
 * @file DailyLogModal.tsx
 * @description Modal dialog for recording daily menstrual flow, basal body temperature,
 * cervical fluid type, energy/stress ratings, physical symptoms, moods, sleep, and private notes.
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Droplets, Thermometer, Moon, Zap, Smile, Activity, Trash2, Check } from 'lucide-react';
import { DailyLog, FlowLevel, CervicalFluidType, LibidoLevel } from '../types';
import { formatDate } from '../utils/cycleCalculations';

interface DailyLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  existingLog?: DailyLog;
  onSaveLog: (log: DailyLog, isPeriodDay: boolean) => Promise<void>;
  onDeleteLog?: (date: string) => Promise<void>;
  tempUnit: 'F' | 'C';
}

const MOOD_OPTIONS = [
  { id: 'calm', label: 'Calm & Grounded' },
  { id: 'energized', label: 'Energized & Vibrant' },
  { id: 'focused', label: 'Sharp & Focused' },
  { id: 'sensitive', label: 'Emotionally Tender' },
  { id: 'anxious', label: 'Anxious / Restless' },
  { id: 'irritable', label: 'Irritable' },
  { id: 'sad', label: 'Low Mood / Sad' },
  { id: 'overwhelmed', label: 'Overwhelmed' },
];

const SYMPTOM_OPTIONS = [
  { id: 'cramps', label: 'Pelvic Cramps' },
  { id: 'breast_tenderness', label: 'Breast Tenderness' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'headache', label: 'Headache / Migraine' },
  { id: 'acne', label: 'Acne / Breakout' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'backache', label: 'Lower Backache' },
  { id: 'insomnia', label: 'Insomnia / Waking' },
  { id: 'nausea', label: 'Nausea' },
  { id: 'hot_flashes', label: 'Night Sweats / Flashes' },
  { id: 'brain_fog', label: 'Brain Fog' },
];

const CERVICAL_FLUID_OPTIONS: { id: CervicalFluidType; label: string; desc: string }[] = [
  { id: 'dry', label: 'Dry / None', desc: 'Typical early follicular or late luteal' },
  { id: 'sticky', label: 'Sticky / Tacky', desc: 'Low fertility post-period' },
  { id: 'creamy', label: 'Creamy / Lotion', desc: 'Fertility rising' },
  { id: 'watery', label: 'Watery / Wet', desc: 'High fertility' },
  { id: 'egg_white', label: 'Egg White / Stretchy', desc: 'Peak fertility (estrogen surge)' },
];

export const DailyLogModal: React.FC<DailyLogModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  existingLog,
  onSaveLog,
  onDeleteLog,
  tempUnit,
}) => {
  const [date, setDate] = useState(selectedDate || formatDate(new Date()));
  const [flow, setFlow] = useState<FlowLevel>('none');
  const [bbt, setBbt] = useState<string>('');
  const [cervicalFluid, setCervicalFluid] = useState<CervicalFluidType | undefined>(undefined);
  const [energy, setEnergy] = useState<number>(3);
  const [stressLevel, setStressLevel] = useState<number>(2);
  const [sleepHours, setSleepHours] = useState<string>('7.5');
  const [libido, setLibido] = useState<LibidoLevel | undefined>(undefined);
  const [moods, setMoods] = useState<string[]>([]);
  const [physicalSymptoms, setPhysicalSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (existingLog) {
      setFlow(existingLog.flow || 'none');
      setBbt(existingLog.bbt ? String(existingLog.bbt) : '');
      setCervicalFluid(existingLog.cervicalFluid);
      setEnergy(existingLog.energy || 3);
      setStressLevel(existingLog.stressLevel || 2);
      setSleepHours(existingLog.sleepHours !== undefined ? String(existingLog.sleepHours) : '7.5');
      setLibido(existingLog.libido);
      setMoods(existingLog.moods || []);
      setPhysicalSymptoms(existingLog.physicalSymptoms || []);
      setNotes(existingLog.notes || '');
    } else {
      // Reset form
      setFlow('none');
      setBbt('');
      setCervicalFluid(undefined);
      setEnergy(3);
      setStressLevel(2);
      setSleepHours('7.5');
      setLibido(undefined);
      setMoods([]);
      setPhysicalSymptoms([]);
      setNotes('');
    }
  }, [existingLog, date, isOpen]);

  if (!isOpen) return null;

  const toggleMood = (id: string) => {
    setMoods((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const toggleSymptom = (id: string) => {
    setPhysicalSymptoms((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const parsedBbt = bbt ? parseFloat(bbt) : undefined;
      const parsedSleep = sleepHours ? parseFloat(sleepHours) : undefined;

      const logData: DailyLog = {
        id: existingLog?.id || `log-${date}`,
        date,
        flow: flow === 'none' ? undefined : flow,
        bbt: parsedBbt && !isNaN(parsedBbt) ? parsedBbt : undefined,
        tempUnit,
        cervicalFluid,
        energy,
        stressLevel,
        sleepHours: parsedSleep && !isNaN(parsedSleep) ? parsedSleep : undefined,
        libido,
        moods,
        physicalSymptoms,
        notes: notes.trim() || undefined,
      };

      const isPeriodDay = flow !== 'none';
      await onSaveLog(logData, isPeriodDay);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteLog || !existingLog) return;
    if (confirm('Delete log for this day?')) {
      await onDeleteLog(date);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl text-stone-100 my-auto">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                Log Daily Symptoms & Biomarkers
              </h3>
              <p className="text-xs text-stone-400">
                Stored in encrypted local memory. Never sent off-device.
              </p>
            </div>
          </div>
          <button
            id="btn-close-log-modal"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Log Date
            </label>
            <input
              id="input-log-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-sm font-medium focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          {/* Menstrual Flow Level */}
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
            <div className="flex items-center gap-2 mb-3">
              <Droplets className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Menstrual Flow
              </label>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['none', 'spotting', 'light', 'medium', 'heavy'] as FlowLevel[]).map((level) => {
                const isSelected = flow === level;
                return (
                  <button
                    type="button"
                    key={level}
                    id={`flow-${level}`}
                    onClick={() => setFlow(level)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border capitalize transition-all ${
                      isSelected
                        ? level === 'none'
                          ? 'bg-stone-700 text-stone-100 border-stone-600'
                          : 'bg-amber-950 text-amber-200 border-amber-700 shadow-sm'
                        : 'bg-stone-800/80 text-stone-400 border-stone-700/60 hover:text-stone-200'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Biomarkers: BBT & Cervical Fluid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Basal Body Temperature */}
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-4 h-4 text-amber-400" />
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Basal Body Temp (°{tempUnit})
                </label>
              </div>
              <p className="text-[11px] text-stone-500 mb-2">
                Measured first thing before rising. Detects post-ovulatory progesterone rise.
              </p>
              <input
                id="input-bbt"
                type="number"
                step="0.01"
                min={tempUnit === 'F' ? '95.0' : '35.0'}
                max={tempUnit === 'F' ? '102.0' : '39.0'}
                placeholder={tempUnit === 'F' ? 'e.g. 97.45' : 'e.g. 36.35'}
                value={bbt}
                onChange={(e) => setBbt(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-mono text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Cervical Fluid */}
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center gap-2 mb-2">
                <Droplets className="w-4 h-4 text-emerald-400" />
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Cervical Fluid
                </label>
              </div>
              <p className="text-[11px] text-stone-500 mb-2">
                Tracks follicular estrogen rise and peak fertility.
              </p>
              <select
                id="select-cervical-fluid"
                value={cervicalFluid || ''}
                onChange={(e) => setCervicalFluid((e.target.value as CervicalFluidType) || undefined)}
                className="w-full px-3 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              >
                <option value="">Not observed / Unsure</option>
                {CERVICAL_FLUID_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Energy & Stress Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-300">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Energy Level</span>
                </div>
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {energy} / 5
                </span>
              </div>
              <input
                id="range-energy"
                type="range"
                min="1"
                max="5"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value, 10))}
                className="w-full accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1 font-mono">
                <span>Depleted</span>
                <span>Balanced</span>
                <span>Peak</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-300">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span>Stress Level</span>
                </div>
                <span className="text-xs font-mono font-semibold text-amber-400">
                  {stressLevel} / 5
                </span>
              </div>
              <input
                id="range-stress"
                type="range"
                min="1"
                max="5"
                value={stressLevel}
                onChange={(e) => setStressLevel(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-stone-500 mt-1 font-mono">
                <span>Serene</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>
          </div>

          {/* Sleep Hours & Libido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-slate-400" />
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Sleep Hours
                </label>
              </div>
              <input
                id="input-sleep-hours"
                type="number"
                step="0.5"
                min="0"
                max="24"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                placeholder="7.5"
                className="w-full px-3.5 py-2 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 font-mono text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-800">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                  Libido
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as LibidoLevel[]).map((level) => (
                  <button
                    type="button"
                    key={level}
                    onClick={() => setLibido(libido === level ? undefined : level)}
                    className={`py-2 px-2 rounded-xl text-xs font-medium border capitalize transition-all ${
                      libido === level
                        ? 'bg-emerald-950 text-emerald-200 border-emerald-700'
                        : 'bg-stone-800/80 text-stone-400 border-stone-700/60'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Physical & Hormonal Symptoms */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Physical & Hormonal Symptoms
            </label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_OPTIONS.map((sym) => {
                const isSelected = physicalSymptoms.includes(sym.id);
                return (
                  <button
                    type="button"
                    key={sym.id}
                    id={`symptom-tag-${sym.id}`}
                    onClick={() => toggleSymptom(sym.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-amber-950 text-amber-200 border-amber-700 shadow-sm'
                        : 'bg-stone-800/70 text-stone-400 border-stone-700/60 hover:text-stone-200'
                    }`}
                  >
                    {sym.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Smile className="w-4 h-4 text-emerald-400" />
              <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Emotional State & Mood
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {MOOD_OPTIONS.map((mood) => {
                const isSelected = moods.includes(mood.id);
                return (
                  <button
                    type="button"
                    key={mood.id}
                    id={`mood-tag-${mood.id}`}
                    onClick={() => toggleMood(mood.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-emerald-950 text-emerald-200 border-emerald-700 shadow-sm'
                        : 'bg-stone-800/70 text-stone-400 border-stone-700/60 hover:text-stone-200'
                    }`}
                  >
                    {mood.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes & Journal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              Private Notes & Observations (Encrypted)
            </label>
            <textarea
              id="input-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. specific food cravings, exercise reaction, doctor notes..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-stone-800 flex items-center justify-between gap-3">
            {existingLog && onDeleteLog ? (
              <button
                type="button"
                id="btn-delete-log"
                onClick={handleDelete}
                className="px-3 py-2 text-xs font-medium text-amber-500 hover:text-amber-400 hover:bg-stone-800 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Log</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-save-daily-log"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-medium bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{isSaving ? 'Encrypting...' : 'Save Encrypted Entry'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
