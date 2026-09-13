/**
 * @file CycleDial.tsx
 * @description Radial SVG cycle dial visualization representing the 4 biological cycle phases,
 * interactive day indicator, fertile window arc, and hormonal dynamics breakdown.
 */

import React from 'react';
import { CyclePhase, CycleStatus, PhaseDetails } from '../types';
import { PHASE_DETAILS } from '../utils/cycleCalculations';
import { Sparkles, Droplets, HeartHandshake, ShieldAlert } from 'lucide-react';

interface CycleDialProps {
  status: CycleStatus;
  selectedPhase: CyclePhase;
  onSelectPhase: (phase: CyclePhase) => void;
  onOpenLogModal: () => void;
}

export const CycleDial: React.FC<CycleDialProps> = ({
  status,
  selectedPhase,
  onSelectPhase,
  onOpenLogModal,
}) => {
  const { currentCycleDay, totalCycleLength, currentPhase, daysUntilNextPeriod, isFertileWindow, isPeriodActive } = status;

  // Render circular segmented track
  const size = 320;
  const center = size / 2;
  const radius = 120;
  const strokeWidth = 22;

  // Compute angles for each day
  const daysCount = totalCycleLength || 28;
  const anglePerDay = (2 * Math.PI) / daysCount;

  // Ovulation estimate day
  const ovulationDay = Math.max(10, totalCycleLength - 14);
  const periodLength = 5;

  const currentPhaseDetails = PHASE_DETAILS[currentPhase];
  const activePhaseDetails: PhaseDetails = PHASE_DETAILS[selectedPhase];

  // Generate SVG arcs for the 4 biological phases
  const getPhaseForDayIndex = (day: number): CyclePhase => {
    if (day <= periodLength) return 'menstrual';
    if (day < ovulationDay - 1) return 'follicular';
    if (day <= ovulationDay + 1) return 'ovulatory';
    return 'luteal';
  };

  // Day position coordinates on circle
  const getCoordinatesForDay = (day: number, r: number) => {
    // Start at top (-PI/2) and go clockwise
    const angle = -Math.PI / 2 + (day - 1) * anglePerDay;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const currentMarker = getCoordinatesForDay(currentCycleDay, radius);

  return (
    <div className="bg-stone-900/95 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
      {/* Background subtle radial aura */}
      <div
        className="absolute -right-24 -top-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: currentPhaseDetails.color.accent }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left / Center: Interactive SVG Cycle Dial */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-[300px] h-[300px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-full transform transition-transform"
            >
              {/* Subtle background track */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#292524"
                strokeWidth={strokeWidth}
              />

              {/* Day segments */}
              {Array.from({ length: daysCount }).map((_, i) => {
                const day = i + 1;
                const phase = getPhaseForDayIndex(day);
                const color = PHASE_DETAILS[phase].color.dialColor;
                const isCurrent = day === currentCycleDay;
                const isSelectedPhaseDay = phase === selectedPhase;

                // Segment angle
                const startAngle = -Math.PI / 2 + i * anglePerDay + 0.02;
                const endAngle = -Math.PI / 2 + (i + 1) * anglePerDay - 0.02;

                const x1 = center + radius * Math.cos(startAngle);
                const y1 = center + radius * Math.sin(startAngle);
                const x2 = center + radius * Math.cos(endAngle);
                const y2 = center + radius * Math.sin(endAngle);

                return (
                  <path
                    key={`segment-${day}`}
                    d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={isSelectedPhaseDay ? strokeWidth + 2 : strokeWidth}
                    strokeOpacity={isSelectedPhaseDay ? 1 : 0.45}
                    className="cursor-pointer transition-all duration-200 hover:opacity-100"
                    onClick={() => onSelectPhase(phase)}
                  />
                );
              })}

              {/* Ovulation marker star / dot */}
              {(() => {
                const ovPos = getCoordinatesForDay(ovulationDay, radius);
                return (
                  <circle
                    cx={ovPos.x}
                    cy={ovPos.y}
                    r={3.5}
                    fill="#fef08a"
                    stroke="#854d0e"
                    strokeWidth={1.5}
                  />
                );
              })()}

              {/* Active Today Needle / Indicator Pin */}
              <g>
                <circle
                  cx={currentMarker.x}
                  cy={currentMarker.y}
                  r={10}
                  fill="#ffffff"
                  stroke={currentPhaseDetails.color.accent}
                  strokeWidth={3}
                  className="shadow-md"
                />
                <circle
                  cx={currentMarker.x}
                  cy={currentMarker.y}
                  r={4}
                  fill={currentPhaseDetails.color.accent}
                />
              </g>
            </svg>

            {/* Dial Center Info */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-400">
                Cycle Day
              </span>
              <div className="text-4xl sm:text-5xl font-serif-heading font-bold text-stone-100 my-1">
                {currentCycleDay}
              </div>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-full border mb-1.5"
                style={{
                  color: currentPhaseDetails.color.accent,
                  borderColor: `${currentPhaseDetails.color.accent}55`,
                  backgroundColor: `${currentPhaseDetails.color.accent}20`,
                }}
              >
                {currentPhaseDetails.displayName}
              </span>
              <div className="text-[12px] text-stone-400 font-medium">
                {daysUntilNextPeriod > 0
                  ? `${daysUntilNextPeriod} days to next cycle`
                  : 'Cycle completed / Day 1 pending'}
              </div>
            </div>
          </div>

          {/* Quick status chips below dial */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {isPeriodActive && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-200 border border-amber-800">
                <Droplets className="w-3 h-3 text-amber-400" />
                Active Menstruation
              </span>
            )}
            {isFertileWindow ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-950/80 text-amber-200 border border-amber-800">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Fertile Window Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-stone-800 text-stone-400 border border-stone-700">
                <ShieldAlert className="w-3 h-3 text-stone-400" />
                Low Conception Window
              </span>
            )}
          </div>
        </div>

        {/* Right Column: Biological Phase & Hormone Dynamics Card */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider uppercase text-stone-400">
                Hormonal Landscape
              </span>
              <span className="text-xs text-stone-500 font-mono">
                {activePhaseDetails.dayRange}
              </span>
            </div>
            <h2 className="text-2xl font-serif-heading font-semibold text-stone-100 mt-1">
              {activePhaseDetails.displayName}
            </h2>
            <p className="text-sm text-stone-300 mt-1 leading-relaxed">
              {activePhaseDetails.hormoneDescription}
            </p>
          </div>

          {/* Hormone Level Meters */}
          <div className="bg-stone-800/80 border border-stone-700/60 rounded-2xl p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300 font-medium">Estrogen (Estradiol)</span>
                <span className="text-emerald-400 capitalize text-[11px] font-mono">
                  {activePhaseDetails.estrogenLevel.replace('_', ' ')}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-teal-400 rounded-full transition-all duration-500"
                  style={{
                    width:
                      activePhaseDetails.estrogenLevel === 'peak'
                        ? '95%'
                        : activePhaseDetails.estrogenLevel === 'rising'
                        ? '65%'
                        : activePhaseDetails.estrogenLevel === 'secondary_peak'
                        ? '50%'
                        : '20%',
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-stone-300 font-medium">Progesterone</span>
                <span className="text-amber-400 capitalize text-[11px] font-mono">
                  {activePhaseDetails.progesteroneLevel}
                </span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 rounded-full transition-all duration-500"
                  style={{
                    width:
                      activePhaseDetails.progesteroneLevel === 'peak'
                        ? '90%'
                        : activePhaseDetails.progesteroneLevel === 'rising'
                        ? '50%'
                        : activePhaseDetails.progesteroneLevel === 'low'
                        ? '20%'
                        : '10%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Phase Syncing Guidance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Nourishment</span>
              </div>
              <p className="text-xs text-stone-300 leading-normal">
                {activePhaseDetails.nutritionTip}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-800/50 border border-stone-700/50">
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-1">
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>Optimal Movement</span>
              </div>
              <p className="text-xs text-stone-300 leading-normal">
                {activePhaseDetails.exerciseTip}
              </p>
            </div>
          </div>

          {/* Interactive Phase Selectors */}
          <div className="pt-2">
            <div className="text-[11px] text-stone-400 font-medium uppercase tracking-wider mb-2">
              Explore All 4 Biological Phases
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(['menstrual', 'follicular', 'ovulatory', 'luteal'] as CyclePhase[]).map((phase) => {
                const isSelected = selectedPhase === phase;
                const pDetails = PHASE_DETAILS[phase];
                return (
                  <button
                    key={phase}
                    id={`btn-select-phase-${phase}`}
                    onClick={() => onSelectPhase(phase)}
                    className={`py-2 px-1 rounded-xl text-xs font-medium border text-center transition-all ${
                      isSelected
                        ? 'bg-stone-700 text-white shadow-sm'
                        : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border-stone-700/60'
                    }`}
                    style={{
                      borderColor: isSelected ? pDetails.color.accent : undefined,
                    }}
                  >
                    <div className="truncate capitalize">{phase}</div>
                    <div className="text-[10px] text-stone-400">{pDetails.dayRange}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              id="btn-log-for-today"
              onClick={onOpenLogModal}
              className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 hover:border-emerald-600/70 text-stone-100 text-xs font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Droplets className="w-4 h-4 text-amber-500" />
              <span>Record Symptoms or Period for Today</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
