/**
 * @file cycleCalculations.ts
 * @description Core business logic and endocrinological calculations for menstrual cycle phase
 * tracking, ovulation estimation, fertile window calculation, and symptom correlation.
 *
 * Biological Foundations:
 * - Menstrual Phase (Days 1–5): Shedding of endometrium; low estrogen & progesterone.
 * - Follicular Phase (Days 6–13): FSH recruitment of ovarian follicles; estradiol rises.
 * - Ovulatory Phase (Days 14–16): Luteinizing Hormone (LH) surge releases mature ovum.
 * - Luteal Phase (Days 17–28): Corpus luteum produces progesterone, triggering a ~0.4°–0.8°F
 *   thermogenic basal body temperature elevation.
 */

import { AppData, CyclePeriod, CyclePhase, CycleStatus, PhaseDetails, DailyLog } from '../types';

/**
 * Educational, nutritional, physiological, and visual configuration for each of the four cycle phases.
 * Uses an organic, high-contrast palette avoiding stereotypical pinks.
 */
export const PHASE_DETAILS: Record<CyclePhase, PhaseDetails> = {
  menstrual: {
    phase: 'menstrual',
    displayName: 'Menstrual Phase',
    dayRange: 'Days 1 - 5',
    primaryHormone: 'Low Estrogen & Progesterone',
    hormoneDescription: 'Uterine lining sheds as hormone levels reach their baseline low. Cellular renewal begins.',
    estrogenLevel: 'low',
    progesteroneLevel: 'baseline',
    bodyState: 'Rest & Renewal',
    energyDescription: 'Energy is naturally introspective and lower. Basal metabolic rate slows.',
    nutritionTip: 'Warm nourishing broths, iron-rich greens, magnesium, and hydration.',
    exerciseTip: 'Gentle walking, restorative yin yoga, and prioritizing deep restorative sleep.',
    color: {
      bg: 'bg-amber-950/10 dark:bg-amber-950/30',
      border: 'border-amber-700/30',
      text: 'text-amber-800 dark:text-amber-300',
      accent: '#9a4430', // Deep earthy terracotta / rust
      dialColor: '#9a4430',
    },
  },
  follicular: {
    phase: 'follicular',
    displayName: 'Follicular Phase',
    dayRange: 'Days 6 - 13',
    primaryHormone: 'Rising Estrogen & FSH',
    hormoneDescription: 'Follicle Stimulating Hormone stimulates ovarian follicles; rising estradiol boosts neuroplasticity and serotonin.',
    estrogenLevel: 'rising',
    progesteroneLevel: 'low',
    bodyState: 'Awakening & Vitality',
    energyDescription: 'Mental clarity sharpens, stamina rises, and stress tolerance is high.',
    nutritionTip: 'Fermented foods, sprouted seeds, lean proteins, and crisp seasonal vegetables.',
    exerciseTip: 'Cardio, strength training, dance, and learning new movement skills.',
    color: {
      bg: 'bg-emerald-950/10 dark:bg-emerald-950/30',
      border: 'border-emerald-700/30',
      text: 'text-emerald-800 dark:text-emerald-300',
      accent: '#2f6d54', // Forest Sage / Eucalyptus
      dialColor: '#2f6d54',
    },
  },
  ovulatory: {
    phase: 'ovulatory',
    displayName: 'Ovulatory Phase',
    dayRange: 'Days 14 - 16',
    primaryHormone: 'Estrogen Peak & LH Surge',
    hormoneDescription: 'Luteinizing hormone surges to release a mature egg. Estrogen and testosterone reach monthly zenith.',
    estrogenLevel: 'peak',
    progesteroneLevel: 'rising',
    bodyState: 'Peak Vitality & Magnetic Presence',
    energyDescription: 'Highest energy, verbal fluency, social confidence, and peak physical resilience.',
    nutritionTip: 'Cruciferous vegetables (broccoli, kale) to metabolize estrogen, berries, zinc, and fiber.',
    exerciseTip: 'High-intensity interval training (HIIT), heavy lifts, and peak cardio performance.',
    color: {
      bg: 'bg-amber-900/10 dark:bg-amber-900/30',
      border: 'border-amber-600/30',
      text: 'text-amber-700 dark:text-amber-300',
      accent: '#b87c22', // Warm Radiant Amber / Ochre
      dialColor: '#b87c22',
    },
  },
  luteal: {
    phase: 'luteal',
    displayName: 'Luteal Phase',
    dayRange: 'Days 17 - 28',
    primaryHormone: 'Progesterone Dominant',
    hormoneDescription: 'Corpus luteum secretes progesterone to sustain endometrium. Body temperature rises by ~0.4°-0.8°F.',
    estrogenLevel: 'secondary_peak',
    progesteroneLevel: 'peak',
    bodyState: 'Focus & Preparation',
    energyDescription: 'Calmer, detail-oriented focus early on; metabolic rate rises by 100-300 kcal/day.',
    nutritionTip: 'Complex carbohydrates (sweet potatoes, oats), B6, magnesium, and herbal teas (chamomile, ginger).',
    exerciseTip: 'Pilates, steady-state zone 2 cardio, resistance workouts, and stretching.',
    color: {
      bg: 'bg-slate-900/10 dark:bg-slate-900/30',
      border: 'border-slate-600/30',
      text: 'text-slate-700 dark:text-slate-300',
      accent: '#515978', // Twilight Slate / Muted Plum
      dialColor: '#515978',
    },
  },
};

/**
 * Formats a JavaScript Date object into an ISO date string: `YYYY-MM-DD`.
 *
 * @param d - Date instance to format.
 * @returns ISO date string.
 */
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses an ISO date string (`YYYY-MM-DD`) into a local Date object.
 *
 * @param dateStr - ISO formatted date string.
 * @returns Date instance initialized to midnight local time.
 */
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calculates the number of whole calendar days between two Date instances.
 *
 * @param earlier - Start Date.
 * @param later - End Date.
 * @returns Integer number of elapsed days.
 */
export function daysBetween(earlier: Date, later: Date): number {
  const d1 = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const d2 = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Adds an integer number of days to an ISO date string and returns the new `YYYY-MM-DD` string.
 *
 * @param dateStr - Base ISO date string.
 * @param days - Number of days to add (or subtract if negative).
 * @returns New ISO date string.
 */
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/**
 * Computes real-time cycle status metrics, active biological phase, fertile window, and countdowns.
 *
 * Calculation methodology:
 * 1. Finds the latest period start date.
 * 2. Determines current cycle day = (days elapsed since period start) + 1.
 * 3. Estimates ovulation at (avgCycleLength - 14) days based on the typical 14-day luteal phase duration.
 * 4. Determines the biological fertile window (5 days prior to ovulation through 1 day post-ovulation,
 *    accounting for ~5 day sperm viability and ~24h ovum viability).
 *
 * @param data - The complete unencrypted AppData object.
 * @param referenceDate - Optional reference Date (defaults to current system time).
 * @returns Complete `CycleStatus` object.
 */
export function calculateCycleStatus(data: AppData, referenceDate: Date = new Date()): CycleStatus {
  const periods = [...data.periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  const avgCycleLength = data.settings.avgCycleLength || 28;
  const avgPeriodLength = data.settings.avgPeriodLength || 5;

  if (periods.length === 0) {
    // Default fallback if no periods logged yet
    const refStr = formatDate(referenceDate);
    return {
      currentCycleDay: 1,
      totalCycleLength: avgCycleLength,
      currentPhase: 'follicular',
      daysUntilNextPeriod: avgCycleLength,
      nextPeriodStartDate: addDays(refStr, avgCycleLength),
      estimatedOvulationDate: addDays(refStr, Math.round(avgCycleLength / 2)),
      isFertileWindow: false,
      isPeriodActive: false,
      cycleProgressPercent: 0,
    };
  }

  const latestPeriod = periods[0];
  const periodStartDate = parseDate(latestPeriod.startDate);
  const cycleDayDiff = daysBetween(periodStartDate, referenceDate);
  const currentCycleDay = Math.max(1, cycleDayDiff + 1);

  // Compute actual or estimated ovulation day (typically 14 days before end of cycle)
  const estimatedOvulationDay = Math.max(10, avgCycleLength - 14);
  const ovulationDate = addDays(latestPeriod.startDate, estimatedOvulationDay - 1);
  const nextPeriodDate = addDays(latestPeriod.startDate, avgCycleLength);

  // Determine current phase based on cycle day
  let currentPhase: CyclePhase = 'follicular';
  if (currentCycleDay <= avgPeriodLength) {
    currentPhase = 'menstrual';
  } else if (currentCycleDay < estimatedOvulationDay - 1) {
    currentPhase = 'follicular';
  } else if (currentCycleDay <= estimatedOvulationDay + 1) {
    currentPhase = 'ovulatory';
  } else {
    currentPhase = 'luteal';
  }

  // Is period currently active? Check if date falls within latestPeriod startDate and endDate
  let isPeriodActive = false;
  const refStr = formatDate(referenceDate);
  if (refStr >= latestPeriod.startDate) {
    if (latestPeriod.endDate) {
      isPeriodActive = refStr <= latestPeriod.endDate;
    } else {
      isPeriodActive = currentCycleDay <= avgPeriodLength;
    }
  }

  // Fertile window: 5 days before ovulation up to 1 day after
  const fertileStartDay = Math.max(1, estimatedOvulationDay - 5);
  const fertileEndDay = estimatedOvulationDay + 1;
  const isFertileWindow = currentCycleDay >= fertileStartDay && currentCycleDay <= fertileEndDay;

  const daysUntilNextPeriod = Math.max(0, avgCycleLength - currentCycleDay);
  const cycleProgressPercent = Math.min(100, Math.round((currentCycleDay / avgCycleLength) * 100));

  return {
    currentCycleDay,
    totalCycleLength: avgCycleLength,
    currentPhase,
    daysUntilNextPeriod,
    nextPeriodStartDate: nextPeriodDate,
    estimatedOvulationDate: ovulationDate,
    isFertileWindow,
    isPeriodActive,
    cycleProgressPercent,
  };
}

/**
 * Calculates the cycle day for a specific historical date relative to recorded periods.
 *
 * @param dateStr - Target date string (`YYYY-MM-DD`).
 * @param periods - Array of recorded cycle periods.
 * @returns 1-indexed cycle day number.
 */
export function getCycleDayForDate(dateStr: string, periods: CyclePeriod[]): number {
  if (periods.length === 0) return 1;
  const sorted = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate));
  // Find the period that started on or immediately before dateStr
  const applicablePeriod = sorted.find(p => p.startDate <= dateStr);
  if (!applicablePeriod) return 1;

  const start = parseDate(applicablePeriod.startDate);
  const target = parseDate(dateStr);
  return Math.max(1, daysBetween(start, target) + 1);
}

/**
 * Maps an arbitrary cycle day to its corresponding biological cycle phase.
 *
 * @param cycleDay - Current day within the cycle (1 to cycleLength).
 * @param cycleLength - Total cycle length in days (default: 28).
 * @param periodLength - Flow duration in days (default: 5).
 * @returns Identified `CyclePhase`.
 */
export function getPhaseForCycleDay(cycleDay: number, cycleLength = 28, periodLength = 5): CyclePhase {
  const ovulationDay = Math.max(10, cycleLength - 14);
  if (cycleDay <= periodLength) return 'menstrual';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulatory';
  return 'luteal';
}

/**
 * Statistical aggregation of symptom occurrence grouped by menstrual cycle phase.
 */
export interface SymptomPhaseStats {
  /** Internal symptom slug (e.g. 'cramps') */
  symptom: string;
  /** Human-readable display label */
  label: string;
  /** Occurrence count during Menstrual phase */
  menstrual: number;
  /** Occurrence count during Follicular phase */
  follicular: number;
  /** Occurrence count during Ovulatory phase */
  ovulatory: number;
  /** Occurrence count during Luteal phase */
  luteal: number;
  /** Total observed occurrences across all phases */
  total: number;
}

/**
 * Human-friendly dictionary labels for physical hormonal symptoms.
 */
export const SYMPTOM_LABELS: Record<string, string> = {
  cramps: 'Cramps & Pelvic Pain',
  breast_tenderness: 'Breast Tenderness',
  bloating: 'Bloating & Water Retention',
  headache: 'Headache / Migraine',
  acne: 'Skin & Breakouts',
  fatigue: 'Fatigue & Lethargy',
  backache: 'Lower Back Ache',
  insomnia: 'Sleep Disruption',
  nausea: 'Nausea',
  hot_flashes: 'Night Sweats / Flashes',
  brain_fog: 'Brain Fog / Low Focus',
};

/**
 * Human-friendly dictionary labels for emotional and mood states.
 */
export const MOOD_LABELS: Record<string, string> = {
  calm: 'Calm & Grounded',
  energized: 'High Energy & Confident',
  focused: 'Sharp & Productive',
  sensitive: 'Emotionally Sensitive',
  anxious: 'Anxious / Restless',
  irritable: 'Irritable / Impatient',
  sad: 'Low Mood / Melancholy',
  overwhelmed: 'Overwhelmed',
};

/**
 * Aggregates symptom occurrence frequencies across all logged days and correlates them with biological phases.
 * Allows users to identify hormonal symptom patterns (e.g. luteal PMS vs menstrual dysmenorrhea).
 *
 * @param logs - Daily log records dictionary.
 * @param periods - Recorded period cycles.
 * @param avgCycleLength - User's average cycle length in days (default: 28).
 * @returns Array of `SymptomPhaseStats` sorted by total frequency in descending order.
 */
export function calculateSymptomPhaseCorrelations(
  logs: Record<string, DailyLog>,
  periods: CyclePeriod[],
  avgCycleLength = 28
): SymptomPhaseStats[] {
  const counts: Record<string, { menstrual: number; follicular: number; ovulatory: number; luteal: number; total: number }> = {};

  const allSymptoms = Object.keys(SYMPTOM_LABELS);
  allSymptoms.forEach(sym => {
    counts[sym] = { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0, total: 0 };
  });

  Object.values(logs).forEach(log => {
    const cycleDay = getCycleDayForDate(log.date, periods);
    const phase = getPhaseForCycleDay(cycleDay, avgCycleLength);

    log.physicalSymptoms.forEach(sym => {
      if (!counts[sym]) {
        counts[sym] = { menstrual: 0, follicular: 0, ovulatory: 0, luteal: 0, total: 0 };
      }
      counts[sym][phase] += 1;
      counts[sym].total += 1;
    });
  });

  return Object.entries(counts)
    .map(([symptom, stat]) => ({
      symptom,
      label: SYMPTOM_LABELS[symptom] || symptom,
      ...stat,
    }))
    .filter(stat => stat.total > 0)
    .sort((a, b) => b.total - a.total);
}
