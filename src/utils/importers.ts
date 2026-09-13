/**
 * @file importers.ts
 * @description Ingestion engine and heuristic parsers for importing cycle tracking data from
 * external applications (Clue, Flo, Apple Health) and custom CSV/JSON spreadsheets.
 *
 * All parsing, cleaning, and period cycle reconstruction are executed 100% client-side in the
 * browser sandbox before being encrypted into the user's local vault.
 */

import { AppData, CyclePeriod, DailyLog, FlowLevel, CervicalFluidType } from '../types';
import { formatDate, addDays, daysBetween, parseDate } from './cycleCalculations';

/**
 * Recognized external tracker platforms and formats.
 */
export type TrackerSource = 'auto' | 'clue' | 'flo' | 'apple_health' | 'generic_csv' | 'json';

/**
 * Diagnostic summary computed prior to importing data into the vault.
 */
export interface ImportPreview {
  /** Identified source platform */
  source: TrackerSource;
  /** Total number of unique calendar days containing logs */
  totalDays: number;
  /** Number of discrete multi-day menstrual cycles detected */
  totalPeriods: number;
  /** Chronological start and end dates */
  dateRange: {
    start: string;
    end: string;
  };
  /** Count of valid Basal Body Temperature measurements found */
  bbtCount: number;
  /** Count of records with at least one physiological symptom */
  symptomCount: number;
  /** Dictionary of parsed daily logs keyed by ISO date string */
  logs: Record<string, DailyLog>;
  /** Reconstructed period objects */
  periods: CyclePeriod[];
  /** Non-fatal informational warnings or notices */
  warnings: string[];
}

/**
 * RFC 4180 compliant CSV parser supporting multi-line quoted fields, escaped double quotes,
 * and mixed line endings (CRLF / LF).
 *
 * @param text - Raw CSV text content.
 * @returns 2D array of string cells representing rows and columns.
 */
export function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Normalizes diverse date formats (ISO, MM/DD/YYYY, YYYY-MM-DD, timestamps) into standard `YYYY-MM-DD`.
 *
 * @param raw - Raw unparsed date string from external files.
 * @returns Normalized ISO date string, or `null` if unparseable.
 */
export function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  const clean = raw.trim().replace(/^"|"$/g, '');

  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // If ISO 8601 string (e.g. 2024-05-12T14:30:00Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(clean)) {
    return clean.slice(0, 10);
  }

  // MM/DD/YYYY or M/D/YYYY
  const mdyMatch = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (mdyMatch) {
    const m = mdyMatch[1].padStart(2, '0');
    const d = mdyMatch[2].padStart(2, '0');
    const y = mdyMatch[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback to standard JavaScript Date parser
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return formatDate(parsed);
  }

  return null;
}

/**
 * Normalizes menstrual flow descriptions into standard `FlowLevel` enum.
 * Maps values from Flo ("Heavy", "Medium"), Clue ("flowheavy", "flowmedium"), and numeric scales.
 *
 * @param raw - Raw string or numeric representation.
 * @returns Standardized `FlowLevel` or undefined if not recognized.
 */
export function normalizeFlow(raw: string): FlowLevel | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().trim();

  if (s.includes('spot') || s.includes('brown') || s.includes('pink') || s === '0.5') return 'spotting';
  if (s.includes('heavy') || s.includes('super') || s === '3' || s.includes('flowheavy')) return 'heavy';
  if (s.includes('medium') || s.includes('moderate') || s.includes('regular') || s === '2' || s.includes('flowmedium')) return 'medium';
  if (s.includes('light') || s === '1' || s.includes('flowlight')) return 'light';
  if (s === 'none' || s === 'no' || s === '0' || s === 'false') return 'none';

  // Boolean or period marker flags
  if (s === 'yes' || s === 'true' || s === 'period' || s.includes('period start')) return 'medium';

  return undefined;
}

/**
 * Parses and converts temperature values into the user's preferred unit (°F or °C).
 * Automatically detects whether raw number is Celsius (<45) or Fahrenheit (>90).
 *
 * @param val - Numeric or string temperature value (e.g., "97.4" or "36.4").
 * @param userUnit - Target display unit ('F' | 'C').
 * @returns Object with converted `bbt` number and associated unit.
 */
export function normalizeTemp(val: string | number, userUnit: 'F' | 'C'): { bbt?: number; unit: 'F' | 'C' } {
  const num = typeof val === 'number' ? val : parseFloat(val.toString().replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num < 30 || num > 110) return { unit: userUnit };

  // Heuristic: If < 45, it is Celsius; if > 90, it is Fahrenheit
  if (num < 45) {
    if (userUnit === 'F') {
      return { bbt: +((num * 9) / 5 + 32).toFixed(2), unit: 'F' };
    }
    return { bbt: +num.toFixed(2), unit: 'C' };
  } else {
    if (userUnit === 'C') {
      return { bbt: +(((num - 32) * 5) / 9).toFixed(2), unit: 'C' };
    }
    return { bbt: +num.toFixed(2), unit: 'F' };
  }
}

/**
 * Extracts recognized physical symptoms from freeform text or comma-delimited columns.
 *
 * @param text - Raw symptom string or serialized row text.
 * @returns Array of unique internal symptom slugs (e.g. ['cramps', 'bloating']).
 */
export function extractSymptoms(text: string): string[] {
  if (!text) return [];
  const s = text.toLowerCase();
  const symptoms: string[] = [];

  if (s.includes('cramp') || s.includes('dysmenorrhea') || s.includes('pelvic pain')) symptoms.push('cramps');
  if (s.includes('tender') || s.includes('breast') || s.includes('chest pain')) symptoms.push('breast_tenderness');
  if (s.includes('bloat') || s.includes('water retention') || s.includes('swelling')) symptoms.push('bloating');
  if (s.includes('headache') || s.includes('migraine')) symptoms.push('headache');
  if (s.includes('acne') || s.includes('breakout') || s.includes('pimple') || s.includes('skin')) symptoms.push('acne');
  if (s.includes('fatigue') || s.includes('tired') || s.includes('exhaust') || s.includes('low energy')) symptoms.push('fatigue');
  if (s.includes('back') || s.includes('backache') || s.includes('lumbar')) symptoms.push('backache');
  if (s.includes('insomnia') || s.includes('sleep') || s.includes('wakeful')) symptoms.push('insomnia');
  if (s.includes('nausea') || s.includes('queasy')) symptoms.push('nausea');
  if (s.includes('sweat') || s.includes('flash') || s.includes('hot flash')) symptoms.push('hot_flashes');
  if (s.includes('fog') || s.includes('concentration') || s.includes('unfocused')) symptoms.push('brain_fog');

  return Array.from(new Set(symptoms));
}

/**
 * Extracts recognized emotional states from text or mood columns.
 *
 * @param text - Raw mood string.
 * @returns Array of recognized mood tags.
 */
export function extractMoods(text: string): string[] {
  if (!text) return [];
  const s = text.toLowerCase();
  const moods: string[] = [];

  if (s.includes('calm') || s.includes('peace') || s.includes('grounded') || s.includes('relaxed')) moods.push('calm');
  if (s.includes('energi') || s.includes('vibrant') || s.includes('happy') || s.includes('great') || s.includes('good')) moods.push('energized');
  if (s.includes('focus') || s.includes('productive') || s.includes('sharp')) moods.push('focused');
  if (s.includes('sensit') || s.includes('tearful') || s.includes('emotional')) moods.push('sensitive');
  if (s.includes('anxi') || s.includes('nervous') || s.includes('restless') || s.includes('panic')) moods.push('anxious');
  if (s.includes('irrit') || s.includes('angry') || s.includes('frustrat') || s.includes('moody') || s.includes('pms')) moods.push('irritable');
  if (s.includes('sad') || s.includes('depress') || s.includes('melanchol') || s.includes('down')) moods.push('sad');
  if (s.includes('overwhelm') || s.includes('stress')) moods.push('overwhelmed');

  return Array.from(new Set(moods));
}

/**
 * Normalizes cervical fluid terminology into standard Fertility Awareness Method categories.
 *
 * @param text - Raw text description.
 * @returns Standardized `CervicalFluidType` or undefined.
 */
export function normalizeCervicalFluid(text: string): CervicalFluidType | undefined {
  if (!text) return undefined;
  const s = text.toLowerCase();
  if (s.includes('egg') || s.includes('stretchy') || s.includes('peak')) return 'egg_white';
  if (s.includes('watery') || s.includes('wet')) return 'watery';
  if (s.includes('cream') || s.includes('lotion')) return 'creamy';
  if (s.includes('sticky') || s.includes('tacky') || s.includes('scant')) return 'sticky';
  if (s.includes('dry') || s.includes('none')) return 'dry';
  return undefined;
}

/**
 * Reconstructs discrete multi-day period episodes from daily bleeding logs.
 * Clusters consecutive bleeding days into a single `CyclePeriod`. Allows up to a 2-day gap
 * for mid-period cessation commonly observed in physiological flow.
 *
 * @param logs - Dictionary of daily logs.
 * @returns Array of `CyclePeriod` objects sorted in descending chronological order.
 */
export function reconstructPeriodsFromLogs(logs: Record<string, DailyLog>): CyclePeriod[] {
  const sortedDates = Object.keys(logs)
    .filter((d) => logs[d].flow && logs[d].flow !== 'none')
    .sort();

  if (sortedDates.length === 0) return [];

  const periods: CyclePeriod[] = [];
  let currentStart = sortedDates[0];
  let currentEnd = sortedDates[0];
  let maxFlow: FlowLevel = logs[sortedDates[0]].flow || 'medium';

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = parseDate(currentEnd);
    const thisDate = parseDate(sortedDates[i]);
    const gap = daysBetween(prevDate, thisDate);

    // If flow occurs within 2 days of previous flow day, cluster into same period
    if (gap <= 2) {
      currentEnd = sortedDates[i];
      const thisFlow = logs[sortedDates[i]].flow;
      if (thisFlow === 'heavy' || (thisFlow === 'medium' && maxFlow !== 'heavy')) {
        maxFlow = thisFlow;
      }
    } else {
      // Finalize current period
      periods.push({
        id: `imported-period-${currentStart}`,
        startDate: currentStart,
        endDate: currentEnd,
        flowIntensity: maxFlow,
      });

      // Start new period
      currentStart = sortedDates[i];
      currentEnd = sortedDates[i];
      maxFlow = logs[sortedDates[i]].flow || 'medium';
    }
  }

  // Push final period
  periods.push({
    id: `imported-period-${currentStart}`,
    startDate: currentStart,
    endDate: currentEnd,
    flowIntensity: maxFlow,
  });

  return periods.sort((a, b) => b.startDate.localeCompare(a.startDate));
}

/**
 * Universal parser entry point capable of parsing JSON archives or CSV files.
 * Automatically detects source vendor (Clue, Flo, Apple Health, AuraCycle, or custom CSV).
 *
 * @param rawContent - Full raw text content of the uploaded file.
 * @param preferredUnit - User's preferred temperature scale ('F' | 'C').
 * @returns Diagnostic `ImportPreview` ready for UI review and confirmation.
 * @throws Error if file cannot be parsed or lacks date markers.
 */
export function parseTrackerData(rawContent: string, preferredUnit: 'F' | 'C' = 'F'): ImportPreview {
  const warnings: string[] = [];
  const logs: Record<string, DailyLog> = {};
  let periods: CyclePeriod[] = [];
  let detectedSource: TrackerSource = 'generic_csv';

  // 1. Try parsing as JSON first
  try {
    const json = JSON.parse(rawContent);

    // Is it an AuraCycle export or standard backup?
    if (json.periods && json.logs) {
      return {
        source: 'json',
        totalDays: Object.keys(json.logs).length,
        totalPeriods: json.periods.length,
        dateRange: {
          start: Object.keys(json.logs).sort()[0] || 'N/A',
          end: Object.keys(json.logs).sort().reverse()[0] || 'N/A',
        },
        bbtCount: Object.values(json.logs).filter((l: any) => l.bbt).length,
        symptomCount: Object.values(json.logs).filter((l: any) => l.physicalSymptoms?.length > 0).length,
        logs: json.logs,
        periods: json.periods,
        warnings: [],
      };
    }

    // Is it a Clue / Flo JSON structure?
    if (Array.isArray(json) || json.days || json.cycles) {
      detectedSource = 'clue';
      const items: any[] = Array.isArray(json) ? json : json.days || json.cycles || [];
      items.forEach((item) => {
        const d = normalizeDate(item.date || item.day || item.startDate);
        if (!d) return;

        const flow = normalizeFlow(item.flow || item.bleeding || item.period);
        const tempInfo = item.temperature || item.bbt ? normalizeTemp(item.temperature || item.bbt, preferredUnit) : { unit: preferredUnit };
        const symptoms = extractSymptoms(JSON.stringify(item));
        const moods = extractMoods(JSON.stringify(item));
        const cervicalFluid = normalizeCervicalFluid(item.cervical_fluid || item.cervicalFluid || item.fluid);

        logs[d] = {
          id: `log-${d}`,
          date: d,
          flow,
          bbt: tempInfo.bbt,
          tempUnit: tempInfo.unit,
          cervicalFluid,
          energy: item.energy || 3,
          stressLevel: item.stress || 2,
          moods,
          physicalSymptoms: symptoms,
          notes: item.notes || item.comment || undefined,
        };
      });

      periods = reconstructPeriodsFromLogs(logs);
    }
  } catch {
    // Not valid JSON, proceed to CSV parsing
  }

  // 2. Parse as CSV
  if (Object.keys(logs).length === 0) {
    const rows = parseCSV(rawContent);
    if (rows.length < 2) {
      throw new Error('The file does not contain enough data rows to import.');
    }

    const headers = rows[0].map((h) => h.toLowerCase().trim());

    // Auto-detect tracker format from header fingerprints
    if (headers.some((h) => h.includes('clue') || h.includes('tracking_type'))) {
      detectedSource = 'clue';
    } else if (headers.some((h) => h.includes('flo') || h.includes('cycle day'))) {
      detectedSource = 'flo';
    } else if (headers.some((h) => h.includes('hkcategory') || h.includes('apple') || h.includes('health'))) {
      detectedSource = 'apple_health';
    } else {
      detectedSource = 'generic_csv';
    }

    // Map column indices
    const dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('day') || h.includes('time'));
    const flowIdx = headers.findIndex((h) => h.includes('flow') || h.includes('bleed') || h.includes('period') || h.includes('menstruat'));
    const tempIdx = headers.findIndex((h) => h.includes('temp') || h.includes('bbt') || h.includes('basal'));
    const symptomIdx = headers.findIndex((h) => h.includes('symptom') || h.includes('pain') || h.includes('cramp') || h.includes('physical'));
    const moodIdx = headers.findIndex((h) => h.includes('mood') || h.includes('emotion') || h.includes('feeling'));
    const fluidIdx = headers.findIndex((h) => h.includes('cervic') || h.includes('fluid') || h.includes('discharge'));
    const noteIdx = headers.findIndex((h) => h.includes('note') || h.includes('comment') || h.includes('journal') || h.includes('description'));

    if (dateIdx === -1) {
      throw new Error('Could not find a valid Date column in this file. Please verify the header contains "Date" or "Day".');
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (row.length <= dateIdx) continue;

      const dateStr = normalizeDate(row[dateIdx]);
      if (!dateStr) continue;

      const flow = flowIdx >= 0 ? normalizeFlow(row[flowIdx]) : undefined;
      const tempVal = tempIdx >= 0 ? row[tempIdx] : undefined;
      const tempInfo = tempVal ? normalizeTemp(tempVal, preferredUnit) : { unit: preferredUnit };

      // Collect symptoms from dedicated column or row text
      let symptoms: string[] = [];
      if (symptomIdx >= 0 && row[symptomIdx]) {
        symptoms = extractSymptoms(row[symptomIdx]);
      } else {
        symptoms = extractSymptoms(row.join(' '));
      }

      // Collect moods
      let moods: string[] = [];
      if (moodIdx >= 0 && row[moodIdx]) {
        moods = extractMoods(row[moodIdx]);
      }

      const cervicalFluid = fluidIdx >= 0 ? normalizeCervicalFluid(row[fluidIdx]) : undefined;
      const notes = noteIdx >= 0 ? row[noteIdx] : undefined;

      logs[dateStr] = {
        id: `log-${dateStr}`,
        date: dateStr,
        flow,
        bbt: tempInfo.bbt,
        tempUnit: tempInfo.unit,
        cervicalFluid,
        energy: 3,
        stressLevel: 2,
        moods,
        physicalSymptoms: symptoms,
        notes: notes?.trim() || undefined,
      };
    }

    periods = reconstructPeriodsFromLogs(logs);
  }

  const allDates = Object.keys(logs).sort();
  if (allDates.length === 0) {
    throw new Error('No readable cycle dates or symptom records were found in this file.');
  }

  const bbtCount = Object.values(logs).filter((l) => l.bbt !== undefined).length;
  const symptomCount = Object.values(logs).filter((l) => l.physicalSymptoms.length > 0).length;

  return {
    source: detectedSource,
    totalDays: allDates.length,
    totalPeriods: periods.length,
    dateRange: {
      start: allDates[0],
      end: allDates[allDates.length - 1],
    },
    bbtCount,
    symptomCount,
    logs,
    periods,
    warnings,
  };
}

/**
 * Generates an annotated sample CSV template string ready for download.
 * Demonstrates the expected format for importing historical cycle spreadsheets.
 *
 * @returns CSV formatted string.
 */
export function generateSampleCsvTemplate(): string {
  return `Date,Flow,Temperature,Symptoms,Mood,Notes
2026-08-10,heavy,97.2,cramps; fatigue,sensitive,Raspberry leaf tea
2026-08-11,medium,97.3,cramps,calm,Gentle morning walk
2026-08-12,light,97.3,bloating,energized,Cramps subsided
2026-08-13,spotting,97.4,,,
2026-08-20,none,97.3,,,High energy day
2026-08-24,none,97.1,breast tenderness,energized,Egg white cervical fluid (ovulation)
2026-08-26,none,97.85,,,Progesterone temperature rise
2026-09-04,none,98.1,bloating; headache,irritable; anxious,PMS window
`;
}
