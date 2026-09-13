/**
 * @file seedData.ts
 * @description Generates a physiologically accurate 75-day sample dataset with realistic
 * biphasic BBT curves, cervical mucus progression, and phase-correlated symptoms for demonstration
 * and testing without exposing any real personal user data.
 */

import { AppData, DailyLog, CyclePeriod } from '../types';
import { formatDate, addDays } from '../utils/cycleCalculations';

export function generateSampleData(): AppData {
  const today = new Date();
  // Today is roughly Cycle Day 14 (Ovulatory) of the current cycle
  const currentCycleStart = addDays(formatDate(today), -13);
  const cycle2Start = addDays(currentCycleStart, -28);
  const cycle3Start = addDays(cycle2Start, -29);

  const periods: CyclePeriod[] = [
    {
      id: 'period-1',
      startDate: currentCycleStart,
      endDate: addDays(currentCycleStart, 4),
      flowIntensity: 'medium',
      notes: 'Natural cycle, mild cramps on day 1-2.',
    },
    {
      id: 'period-2',
      startDate: cycle2Start,
      endDate: addDays(cycle2Start, 4),
      flowIntensity: 'heavy',
      notes: 'Heavy flow day 2, resolved by day 5.',
    },
    {
      id: 'period-3',
      startDate: cycle3Start,
      endDate: addDays(cycle3Start, 5),
      flowIntensity: 'medium',
      notes: 'Regular cycle start.',
    },
  ];

  const logs: Record<string, DailyLog> = {};

  // Helper to populate realistic logs across 75 days
  for (let i = 75; i >= 0; i--) {
    const dStr = addDays(formatDate(today), -i);
    const dateObj = new Date();
    dateObj.setDate(today.getDate() - i);

    // Determine which cycle it belongs to
    let cycleDay = 1;
    if (dStr >= currentCycleStart) {
      const diff = Math.round((new Date(dStr).getTime() - new Date(currentCycleStart).getTime()) / (1000 * 60 * 60 * 24));
      cycleDay = diff + 1;
    } else if (dStr >= cycle2Start) {
      const diff = Math.round((new Date(dStr).getTime() - new Date(cycle2Start).getTime()) / (1000 * 60 * 60 * 24));
      cycleDay = diff + 1;
    } else {
      const diff = Math.round((new Date(dStr).getTime() - new Date(cycle3Start).getTime()) / (1000 * 60 * 60 * 24));
      cycleDay = diff + 1;
    }

    // Realistic biological metrics based on cycleDay (1-28)
    let bbt = 97.3;
    let cervicalFluid: DailyLog['cervicalFluid'] = 'dry';
    let energy = 3;
    let stressLevel = 2;
    const moods: string[] = [];
    const physicalSymptoms: string[] = [];
    let flow: DailyLog['flow'] = 'none';

    if (cycleDay <= 5) {
      // Menstrual
      flow = cycleDay === 1 ? 'medium' : cycleDay === 2 ? 'heavy' : cycleDay === 3 ? 'medium' : 'light';
      bbt = +(97.2 + Math.random() * 0.25).toFixed(2);
      cervicalFluid = 'dry';
      energy = cycleDay <= 2 ? 2 : 3;
      stressLevel = 3;
      if (cycleDay <= 2) {
        moods.push('sensitive', 'calm');
        physicalSymptoms.push('cramps', 'fatigue', 'backache');
      } else {
        moods.push('calm');
      }
    } else if (cycleDay <= 13) {
      // Follicular
      bbt = +(97.25 + Math.random() * 0.25).toFixed(2);
      cervicalFluid = cycleDay < 10 ? 'sticky' : 'creamy';
      energy = cycleDay < 10 ? 3 : 4;
      stressLevel = 2;
      moods.push('energized', 'focused');
      if (Math.random() > 0.7) physicalSymptoms.push('bloating');
    } else if (cycleDay <= 16) {
      // Ovulatory (Estrogen & LH peak, biphasic temperature shift)
      bbt = cycleDay === 14 ? +(97.1 + Math.random() * 0.1).toFixed(2) : +(97.8 + Math.random() * 0.2).toFixed(2);
      cervicalFluid = 'egg_white';
      energy = 5;
      stressLevel = 1;
      moods.push('energized', 'focused', 'calm');
      if (cycleDay === 14 && Math.random() > 0.4) physicalSymptoms.push('breast_tenderness');
    } else {
      // Luteal (Progesterone elevated, BBT remains high ~97.8 - 98.3 F)
      bbt = +(97.85 + Math.random() * 0.35).toFixed(2);
      cervicalFluid = cycleDay > 24 ? 'dry' : 'creamy';
      energy = cycleDay > 22 ? 2 : 3;
      stressLevel = cycleDay > 22 ? 4 : 2;

      if (cycleDay > 22) {
        // Late Luteal PMS window
        moods.push('sensitive', 'anxious');
        physicalSymptoms.push('bloating', 'breast_tenderness', 'fatigue');
        if (cycleDay >= 25) {
          physicalSymptoms.push('headache', 'insomnia', 'acne');
        }
      } else {
        moods.push('calm', 'focused');
      }
    }

    logs[dStr] = {
      id: `log-${dStr}`,
      date: dStr,
      flow,
      bbt,
      tempUnit: 'F',
      cervicalFluid,
      energy,
      moods,
      physicalSymptoms,
      stressLevel,
      sleepHours: cycleDay > 22 ? 6.5 : 8,
      notes: cycleDay === 14 ? 'High clarity, mild ovulation twinge on right side.' : cycleDay === 1 ? 'Took warm raspberry leaf tea.' : undefined,
    };
  }

  return {
    periods,
    logs,
    settings: {
      avgCycleLength: 28,
      avgPeriodLength: 5,
      tempUnit: 'F',
      autoLockMinutes: 15,
      isProtectedWithPin: false,
      setupCompleted: true,
    },
  };
}
