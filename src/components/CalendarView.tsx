/**
 * @file CalendarView.tsx
 * @description Monthly calendar grid component displaying cycle day indices, phase highlights,
 * period flow dots, fertile windows, basal body temperature pips, and daily inspection details.
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplets, Sparkles, Thermometer, Calendar as CalIcon, Edit3, Plus } from 'lucide-react';
import { AppData, DailyLog, CyclePhase } from '../types';
import {
  formatDate,
  parseDate,
  daysBetween,
  addDays,
  getCycleDayForDate,
  getPhaseForCycleDay,
  PHASE_DETAILS,
} from '../utils/cycleCalculations';

interface CalendarViewProps {
  data: AppData;
  onSelectDateToLog: (date: string) => void;
  tempUnit: 'F' | 'C';
}

export const CalendarView: React.FC<CalendarViewProps> = ({ data, onSelectDateToLog, tempUnit }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(formatDate(new Date()));

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Days in month calculation
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Compute status for any date
  const avgCycle = data.settings.avgCycleLength || 28;
  const avgPeriod = data.settings.avgPeriodLength || 5;

  const getDateInfo = (dateStr: string) => {
    const log = data.logs[dateStr];
    const cycleDay = getCycleDayForDate(dateStr, data.periods);
    const phase: CyclePhase = getPhaseForCycleDay(cycleDay, avgCycle, avgPeriod);

    // Is it a period day in records or logged as flow?
    const hasFlow = log && log.flow && log.flow !== 'none';
    const isPeriodRange = data.periods.some((p) => {
      if (dateStr >= p.startDate) {
        if (p.endDate) return dateStr <= p.endDate;
        return daysBetween(parseDate(p.startDate), parseDate(dateStr)) < avgPeriod;
      }
      return false;
    });

    const isMenstruating = hasFlow || isPeriodRange;

    // Ovulation day check
    const ovulationDay = Math.max(10, avgCycle - 14);
    const isOvulationDay = cycleDay === ovulationDay;
    const isFertile = cycleDay >= ovulationDay - 5 && cycleDay <= ovulationDay + 1;

    return {
      log,
      cycleDay,
      phase,
      isMenstruating,
      isOvulationDay,
      isFertile,
    };
  };

  const selectedDayInfo = getDateInfo(selectedDateStr);
  const selectedPhaseDetails = PHASE_DETAILS[selectedDayInfo.phase];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 8 cols: Interactive Calendar Grid */}
      <div className="lg:col-span-8 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        {/* Month Header & Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-stone-700 flex items-center justify-center text-stone-200">
              <CalIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif-heading font-semibold text-stone-100">{monthName}</h2>
              <p className="text-xs text-stone-400">Click any date to inspect biomarkers or log</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-prev-month"
              onClick={handlePrevMonth}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl border border-stone-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="btn-next-month"
              onClick={handleNextMonth}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl border border-stone-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Day of week headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-stone-500 uppercase tracking-wider mb-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Previous month padding cells */}
          {Array.from({ length: firstDayIndex }).map((_, i) => {
            const dayNum = daysInPrevMonth - firstDayIndex + i + 1;
            return (
              <div
                key={`prev-${i}`}
                className="h-14 sm:h-18 p-1.5 rounded-xl border border-transparent text-stone-700 text-xs select-none opacity-40"
              >
                {dayNum}
              </div>
            );
          })}

          {/* Current month day cells */}
          {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const info = getDateInfo(dateStr);
            const isSelected = selectedDateStr === dateStr;
            const isToday = dateStr === formatDate(new Date());

            return (
              <button
                key={dateStr}
                id={`cal-day-${dateStr}`}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-14 sm:h-18 p-1.5 sm:p-2 rounded-xl border transition-all text-left flex flex-col justify-between relative group ${
                  isSelected
                    ? 'border-emerald-500 bg-stone-800/90 shadow-md ring-1 ring-emerald-500'
                    : info.isMenstruating
                    ? 'border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/30'
                    : info.isFertile
                    ? 'border-amber-900/40 bg-amber-950/10 hover:bg-stone-800/50'
                    : 'border-stone-800/80 bg-stone-850/40 hover:bg-stone-800/70'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-medium ${
                      isToday
                        ? 'w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold'
                        : isSelected
                        ? 'text-emerald-300 font-semibold'
                        : 'text-stone-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {/* Cycle Day tag on larger screens */}
                  <span className="hidden sm:inline-block text-[9px] text-stone-500 font-mono">
                    d{info.cycleDay}
                  </span>
                </div>

                {/* Day status indicators */}
                <div className="flex items-center gap-1 mt-auto">
                  {info.isMenstruating && (
                    <span className="w-2 h-2 rounded-full bg-[#9a4430]" title="Menstruation" />
                  )}
                  {info.isOvulationDay && (
                    <span className="w-2 h-2 rounded-full bg-[#b87c22] ring-1 ring-amber-300" title="Ovulation" />
                  )}
                  {info.isFertile && !info.isOvulationDay && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#c4801f]/70" title="Fertile Window" />
                  )}
                  {info.log && info.log.bbt && (
                    <span className="hidden sm:inline-block text-[9px] text-stone-400 font-mono">
                      {info.log.bbt}°
                    </span>
                  )}
                  {info.log && info.log.physicalSymptoms.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" title="Symptoms Logged" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 mt-6 pt-4 border-t border-stone-800">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#9a4430]" />
            <span>Menstrual Flow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#b87c22] ring-1 ring-amber-400" />
            <span>Estimated Ovulation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#c4801f]" />
            <span>Fertile Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            <span>Logged Symptoms</span>
          </div>
        </div>
      </div>

      {/* Right 4 cols: Selected Date Details & Action Panel */}
      <div className="lg:col-span-4 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Selected Date
              </span>
              <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                {selectedDateStr}
              </h3>
            </div>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full border"
              style={{
                color: selectedPhaseDetails.color.accent,
                borderColor: `${selectedPhaseDetails.color.accent}60`,
                backgroundColor: `${selectedPhaseDetails.color.accent}20`,
              }}
            >
              Day {selectedDayInfo.cycleDay} • {selectedPhaseDetails.displayName}
            </span>
          </div>

          {/* Log Details or Empty State */}
          {selectedDayInfo.log ? (
            <div className="space-y-4">
              {/* Flow */}
              {selectedDayInfo.log.flow && selectedDayInfo.log.flow !== 'none' && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/40 border border-amber-900/50">
                  <div className="flex items-center gap-2 text-xs text-amber-200">
                    <Droplets className="w-4 h-4 text-amber-400" />
                    <span className="font-medium capitalize">Flow Intensity</span>
                  </div>
                  <span className="text-xs font-semibold capitalize text-amber-300">
                    {selectedDayInfo.log.flow}
                  </span>
                </div>
              )}

              {/* Biomarkers: BBT & Cervical Fluid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[11px] text-stone-400 mb-1 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Morning BBT</span>
                  </div>
                  <div className="text-sm font-semibold font-mono text-stone-100">
                    {selectedDayInfo.log.bbt ? `${selectedDayInfo.log.bbt}°${tempUnit}` : 'Not recorded'}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800">
                  <div className="text-[11px] text-stone-400 mb-1">Cervical Fluid</div>
                  <div className="text-xs font-medium capitalize text-stone-200 truncate">
                    {selectedDayInfo.log.cervicalFluid ? selectedDayInfo.log.cervicalFluid.replace('_', ' ') : 'Not recorded'}
                  </div>
                </div>
              </div>

              {/* Energy & Stress */}
              <div className="p-3 rounded-xl bg-stone-850 border border-stone-800 flex justify-between text-xs">
                <div>
                  <span className="text-stone-400">Energy: </span>
                  <span className="font-semibold text-emerald-400">{selectedDayInfo.log.energy}/5</span>
                </div>
                <div>
                  <span className="text-stone-400">Stress: </span>
                  <span className="font-semibold text-amber-400">{selectedDayInfo.log.stressLevel}/5</span>
                </div>
                <div>
                  <span className="text-stone-400">Sleep: </span>
                  <span className="font-semibold text-stone-200">{selectedDayInfo.log.sleepHours || '-'}h</span>
                </div>
              </div>

              {/* Physical Symptoms */}
              {selectedDayInfo.log.physicalSymptoms.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Physical Symptoms
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDayInfo.log.physicalSymptoms.map((sym) => (
                      <span
                        key={sym}
                        className="px-2 py-0.5 rounded-md bg-stone-800 border border-stone-700 text-stone-300 text-[11px] capitalize"
                      >
                        {sym.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Moods */}
              {selectedDayInfo.log.moods.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">
                    Emotional Mood
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDayInfo.log.moods.map((mood) => (
                      <span
                        key={mood}
                        className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-[11px] capitalize"
                      >
                        {mood}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Encrypted Notes */}
              {selectedDayInfo.log.notes && (
                <div className="p-3 rounded-xl bg-stone-850 border border-stone-800 text-xs text-stone-300 italic">
                  "{selectedDayInfo.log.notes}"
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl bg-stone-850/50 border border-dashed border-stone-800 text-center space-y-2">
              <p className="text-xs text-stone-400">
                No entry recorded for this day yet.
              </p>
              <p className="text-[11px] text-stone-500">
                Estimated to be in your {selectedPhaseDetails.displayName}.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-5 border-t border-stone-800 mt-5">
          <button
            id="btn-edit-or-log-date"
            onClick={() => onSelectDateToLog(selectedDateStr)}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium shadow-sm transition-all flex items-center justify-center gap-2"
          >
            {selectedDayInfo.log ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{selectedDayInfo.log ? 'Edit Encrypted Entry' : 'Log Symptoms for This Day'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
