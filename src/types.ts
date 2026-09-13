export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

export type CervicalFluidType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white';

export type LibidoLevel = 'low' | 'medium' | 'high';

export interface CyclePeriod {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  flowIntensity: FlowLevel;
  notes?: string;
}

export interface DailyLog {
  id: string;
  date: string; // YYYY-MM-DD
  flow?: FlowLevel;
  bbt?: number; // Basal Body Temperature
  tempUnit: 'F' | 'C';
  cervicalFluid?: CervicalFluidType;
  energy: number; // 1 - 5
  moods: string[]; // e.g., 'calm', 'energized', 'anxious', 'irritable', 'sad', 'focused', 'sensitive', 'brain_fog'
  physicalSymptoms: string[]; // e.g., 'cramps', 'breast_tenderness', 'bloating', 'headache', 'acne', 'fatigue', 'backache', 'insomnia', 'nausea', 'hot_flashes'
  libido?: LibidoLevel;
  sleepHours?: number;
  stressLevel: number; // 1 - 5
  notes?: string;
}

export interface UserSettings {
  avgCycleLength: number; // default 28
  avgPeriodLength: number; // default 5
  tempUnit: 'F' | 'C';
  autoLockMinutes: number; // 0 = immediate, 5, 15, -1 = manual only
  isProtectedWithPin: boolean;
  pinHash?: string;
  salt?: string;
  setupCompleted: boolean;
}

export interface EncryptedStore {
  version: number;
  salt: string;
  iv: string;
  ciphertext: string;
  lastUpdated: string;
}

export interface AppData {
  periods: CyclePeriod[];
  logs: Record<string, DailyLog>; // key: YYYY-MM-DD
  settings: UserSettings;
}

export interface PhaseDetails {
  phase: CyclePhase;
  displayName: string;
  dayRange: string;
  primaryHormone: string;
  hormoneDescription: string;
  estrogenLevel: 'low' | 'rising' | 'peak' | 'dropping' | 'secondary_peak';
  progesteroneLevel: 'baseline' | 'low' | 'rising' | 'peak' | 'dropping';
  bodyState: string;
  energyDescription: string;
  nutritionTip: string;
  exerciseTip: string;
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    dialColor: string;
  };
}

export interface CycleStatus {
  currentCycleDay: number;
  totalCycleLength: number;
  currentPhase: CyclePhase;
  daysUntilNextPeriod: number;
  nextPeriodStartDate: string;
  estimatedOvulationDate: string;
  isFertileWindow: boolean;
  isPeriodActive: boolean;
  cycleProgressPercent: number;
}
