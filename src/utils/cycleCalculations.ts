import { AppData, CyclePeriod, CyclePhase, CycleStatus, PhaseDetails, DailyLog } from '../types';

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

// Format date helper: YYYY-MM-DD
export function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD to local Date
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Difference in whole calendar days
export function daysBetween(earlier: Date, later: Date): number {
  const d1 = new Date(earlier.getFullYear(), earlier.getMonth(), earlier.getDate());
  const d2 = new Date(later.getFullYear(), later.getMonth(), later.getDate());
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Add days to a date string
export function addDays(dateStr: string, days: number): string {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

// Compute cycle metrics & current status
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

// Calculate cycle day for a specific date relative to past periods
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

// Determine phase for any arbitrary cycle day given cycle parameters
export function getPhaseForCycleDay(cycleDay: number, cycleLength = 28, periodLength = 5): CyclePhase {
  const ovulationDay = Math.max(10, cycleLength - 14);
  if (cycleDay <= periodLength) return 'menstrual';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulatory';
  return 'luteal';
}

// Aggregate symptom frequencies by cycle phase
export interface SymptomPhaseStats {
  symptom: string;
  label: string;
  menstrual: number;
  follicular: number;
  ovulatory: number;
  luteal: number;
  total: number;
}

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
