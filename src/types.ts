/**
 * @file types.ts
 * @description Core TypeScript type definitions, data models, and interfaces for the
 * AuraCycle / Cycle & Hormonal Health Tracker application.
 *
 * All data represented here is designed for client-side cryptographic storage (AES-256-GCM)
 * without any remote server transmission.
 */

/**
 * The four biological phases of the menstrual and ovarian cycle.
 * - `menstrual`: Uterine lining shedding, hormone levels at baseline (Days 1–5).
 * - `follicular`: Follicle-stimulating hormone (FSH) and estradiol rising (Days 6–13).
 * - `ovulatory`: Luteinizing hormone (LH) surge and mature egg release (Days 14–16).
 * - `luteal`: Corpus luteum produces progesterone; basal body temperature rises (Days 17–28).
 */
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';

/**
 * Quantifiable menstrual bleeding flow levels.
 */
export type FlowLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';

/**
 * Observable cervical fluid / mucus consistency stages used in fertility awareness methods (FAM).
 * Evolves from dry/sticky post-menses to fertile watery/egg-white prior to ovulation.
 */
export type CervicalFluidType = 'dry' | 'sticky' | 'creamy' | 'watery' | 'egg_white';

/**
 * Self-reported subjective sexual desire level.
 */
export type LibidoLevel = 'low' | 'medium' | 'high';

/**
 * Represents a discrete menstrual period episode consisting of one or more consecutive bleeding days.
 */
export interface CyclePeriod {
  /** Unique period identifier (e.g., `period-2026-08-10`) */
  id: string;
  /** ISO date string for menses onset (Day 1 of cycle): `YYYY-MM-DD` */
  startDate: string;
  /** Optional ISO date string for final day of active flow: `YYYY-MM-DD` */
  endDate?: string;
  /** Peak flow intensity observed during this period */
  flowIntensity: FlowLevel;
  /** Optional contextual notes (e.g., medication, cycle anomalies) */
  notes?: string;
}

/**
 * Granular daily log entry capturing physiological, hormonal, and psychological biomarkers.
 */
export interface DailyLog {
  /** Unique log identifier, typically `log-YYYY-MM-DD` */
  id: string;
  /** ISO date string for this entry: `YYYY-MM-DD` */
  date: string;
  /** Menstrual flow status for this day */
  flow?: FlowLevel;
  /**
   * Basal Body Temperature (BBT) measured immediately upon waking before any physical movement.
   * Typical pre-ovulatory range: 97.0°F–97.7°F (36.1°C–36.5°C).
   * Typical post-ovulatory luteal shift: 97.8°F–98.6°F (36.5°C–37.0°C).
   */
  bbt?: number;
  /** Temperature scale unit */
  tempUnit: 'F' | 'C';
  /** Observed cervical mucus quality */
  cervicalFluid?: CervicalFluidType;
  /** Subjective energy rating (1 = Exhausted/Depleted, 5 = Peak Vitality) */
  energy: number;
  /** Emotional and mental state tags (e.g. 'calm', 'energized', 'anxious', 'irritable', 'sad', 'focused', 'sensitive') */
  moods: string[];
  /** Somatic symptoms (e.g. 'cramps', 'breast_tenderness', 'bloating', 'headache', 'acne', 'fatigue', 'backache', 'insomnia', 'nausea', 'hot_flashes', 'brain_fog') */
  physicalSymptoms: string[];
  /** Subjective libido / sexual desire rating */
  libido?: LibidoLevel;
  /** Self-reported sleep duration in hours */
  sleepHours?: number;
  /** Subjective perceived stress rating (1 = Calm/Grounded, 5 = High Stress/Overwhelmed) */
  stressLevel: number;
  /** Freeform personal journaling and symptom notes */
  notes?: string;
}

/**
 * User-configurable settings and security preferences.
 */
export interface UserSettings {
  /** Expected average cycle length in days (biological norm: 21–35, standard: 28) */
  avgCycleLength: number;
  /** Expected average duration of menstrual bleeding in days (biological norm: 3–7, standard: 5) */
  avgPeriodLength: number;
  /** Preferred temperature unit for BBT tracking ('F' for Fahrenheit, 'C' for Celsius) */
  tempUnit: 'F' | 'C';
  /** Inactivity duration before locking the vault (minutes; 0 = immediate, -1 = manual only) */
  autoLockMinutes: number;
  /** Whether the user has secured their local vault with a custom passcode/PIN */
  isProtectedWithPin: boolean;
  /** Cryptographic PBKDF2 hash of the user's PIN for fast verification (optional) */
  pinHash?: string;
  /** Base64-encoded cryptographic salt associated with the key derivation */
  salt?: string;
  /** Indicates whether the initial setup / onboarding wizard was completed */
  setupCompleted: boolean;
}

/**
 * Storage envelope for AES-256-GCM encrypted data persisted in browser `localStorage`.
 * Zero plaintext information leaves the client.
 */
export interface EncryptedStore {
  /** Schema revision number for backward-compatible migrations */
  version: number;
  /** Cryptographic salt (16 random bytes, Base64-encoded) used for PBKDF2 key derivation */
  salt: string;
  /** Initialization Vector (12 random bytes, Base64-encoded) ensuring unique ciphertext per write */
  iv: string;
  /** Authenticated ciphertext (Base64-encoded) containing JSON-serialized AppData */
  ciphertext: string;
  /** ISO 8601 timestamp of last encryption write */
  lastUpdated: string;
}

/**
 * The complete unencrypted application state model held in memory while the vault is unlocked.
 */
export interface AppData {
  /** History of recorded menstrual periods */
  periods: CyclePeriod[];
  /** Dictionary of daily biomarker logs indexed by ISO date string (`YYYY-MM-DD`) */
  logs: Record<string, DailyLog>;
  /** User settings and cycle configuration */
  settings: UserSettings;
}

/**
 * Scientific, physiological, nutritional, and movement details for each cycle phase.
 */
export interface PhaseDetails {
  /** Biological phase identifier */
  phase: CyclePhase;
  /** Human-readable display label (e.g. "Follicular Phase") */
  displayName: string;
  /** Typical calendar day range within a standard 28-day cycle (e.g. "Days 6 - 13") */
  dayRange: string;
  /** Primary dominant hormone(s) characterizing this phase */
  primaryHormone: string;
  /** Clinical and endocrinological description of hormonal fluctuations */
  hormoneDescription: string;
  /** Relative estradiol / estrogen concentration trend */
  estrogenLevel: 'low' | 'rising' | 'peak' | 'dropping' | 'secondary_peak';
  /** Relative progesterone concentration trend */
  progesteroneLevel: 'baseline' | 'low' | 'rising' | 'peak' | 'dropping';
  /** High-level physiological summary */
  bodyState: string;
  /** Energy and cognitive profile description */
  energyDescription: string;
  /** Phase-aligned nutrition and micronutrient recommendations */
  nutritionTip: string;
  /** Phase-aligned physical activity and exercise recommendations */
  exerciseTip: string;
  /** UI theme styling and SVG dial colors adhering to the non-pink earthy botanical palette */
  color: {
    bg: string;
    border: string;
    text: string;
    accent: string;
    dialColor: string;
  };
}

/**
 * Real-time computed status of the active cycle derived from period history.
 */
export interface CycleStatus {
  /** Current day of the active cycle (Day 1 = first day of latest period) */
  currentCycleDay: number;
  /** Projected total cycle duration in days based on user history or settings */
  totalCycleLength: number;
  /** Currently active biological phase */
  currentPhase: CyclePhase;
  /** Days remaining until the next predicted menstrual period onset */
  daysUntilNextPeriod: number;
  /** Predicted ISO date string (`YYYY-MM-DD`) for next menses onset */
  nextPeriodStartDate: string;
  /** Predicted ISO date string (`YYYY-MM-DD`) for ovulation day */
  estimatedOvulationDate: string;
  /** Whether the current date falls within the 6-day fertile window (5 days prior + day of ovulation) */
  isFertileWindow: boolean;
  /** Whether active menstrual bleeding is currently occurring */
  isPeriodActive: boolean;
  /** Completion progress of the current cycle as a percentage (0–100%) */
  cycleProgressPercent: number;
}
