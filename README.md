# AuraCycle: Cycle & Hormonal Health Tracker

A privacy-first, locally encrypted menstrual and hormonal cycle tracker engineered with zero-knowledge cryptography, phase-aligned endocrinological insights, and zero cloud data leakage.

---

## 🌿 Overview & Core Philosophy

Most conventional menstrual tracking applications monetize intimate reproductive biomarkers, store identifiable health logs on remote servers, and expose sensitive cycle history to third-party data brokers, ad networks, and potential legal surveillance.

**AuraCycle** takes the inverse architectural approach:
- **100% Client-Side Execution**: The entire application runs inside your browser's local sandbox.
- **Zero Cloud Network Storage**: No databases, no server-side user accounts, no tracking pixels, and no telemetry.
- **Hardware-Backed Web Crypto**: All cycle logs, basal temperatures, and journal entries are encrypted using **AES-256-GCM** before writing to browser storage.
- **Dignified, Slop-Free Visuals**: Designed with an earthy botanical and twilight palette (terracotta, forest sage, warm amber, and slate), completely rejecting condescending neon-pink tropes.

---

## 🔒 Security & Cryptographic Architecture

AuraCycle uses the browser's native **Web Crypto API** (`window.crypto.subtle`) to guarantee zero-knowledge encryption:

```
User Passcode / PIN ──┐
                      ├─► PBKDF2 (100,000 rounds, SHA-256) ──► 256-bit AES-GCM Key
16-byte Random Salt ──┘                                                │
                                                                       ▼
Plaintext JSON ───────► AES-256-GCM Encryption (with 12-byte IV) ──► Authenticated Ciphertext
```

### Cryptographic Specifications
- **Cipher**: **AES-256-GCM** (Galois/Counter Mode), delivering both authenticated encryption and tamper-evident integrity protection.
- **Key Derivation Function**: **PBKDF2** with **HMAC-SHA-256** and **100,000 iterations**, substantially raising the computational barrier against offline brute-force attacks.
- **Initialization Vector (IV)**: A cryptographically secure random 12-byte (96-bit) IV generated uniquely for *every single write*.
- **Salt**: A cryptographically secure random 16-byte (128-bit) salt per vault, preventing precomputed rainbow table attacks.
- **Device-Only Auto Key**: For users who prefer frictionless access without a PIN, a high-entropy 192-bit (24-byte) random device key encrypts the vault locally with the same AES-256 rigor.
- **Inactivity Auto-Lock**: Automatically locks the in-memory vault and scrubs plaintext memory after configurable intervals (immediate, 5 min, 15 min).
- **Cryptographic Purge**: A single-click "Purge All Data" function completely erases the salt, IV, ciphertext, and metadata keys from disk.

---

## 🔬 Clinical & Endocrinological Science

The human menstrual and ovarian cycle is a continuous hormonal dance governed by the hypothalamic-pituitary-ovarian (HPO) axis. AuraCycle structures tracking around the **four biological phases**:

| Phase | Days (28-day model) | Dominant Hormones | Physiological State & Thermogenic Marker |
| :--- | :--- | :--- | :--- |
| **Menstrual** | Days 1 – 5 | Low Estrogen & Progesterone | Endometrial shedding, lower metabolic baseline, restorative state. |
| **Follicular** | Days 6 – 13 | Rising Estradiol & FSH | Ovarian follicle maturation, rising energy, cognitive neuroplasticity. |
| **Ovulatory** | Days 14 – 16 | LH Surge & Estrogen Peak | Mature ovum release, peak libido, highest cervical fluid fertility. |
| **Luteal** | Days 17 – 28 | Progesterone Dominant | Corpus luteum formation, thermogenic **+0.4°F to +0.8°F (+0.2°C to +0.4°C) BBT shift**, PMS vulnerability. |

### Biomarkers Tracked
1. **Basal Body Temperature (BBT)**: Waking temperature down to 0.01° precision (°F or °C) to identify the biphasic post-ovulatory shift and confirm ovulatory cycles.
2. **Cervical Fluid / Mucus (FAM)**: Progression from dry/sticky to fertile creamy, watery, and egg-white.
3. **Menstrual Flow**: Spotting, light, medium, and heavy flow tracking with multi-day cycle clustering.
4. **Energy & Stress Scales**: Dual 1–5 quantitative ratings correlated against active cycle days.
5. **Physical Symptoms**: Cramps, breast tenderness, bloating, migraines/headaches, acne, fatigue, backache, insomnia, nausea, hot flashes, and brain fog.
6. **Emotional & Psychological States**: Calm, energized, focused, sensitive, anxious, irritable, sad, and overwhelmed.
7. **Sleep & Libido**: Objective sleep duration in hours and sexual desire ratings.

---

## 📦 Third-Party Cycle Tracker Migration

AuraCycle includes an intelligent, browser-based **Data Import Wizard** to easily migrate historical cycle data away from proprietary apps:

- **Clue**: Ingests Clue account CSV and JSON data exports.
- **Flo**: Ingests Flo cycle export CSVs.
- **Apple Health**: Parses menstrual flow, ovulation test records, and basal body temperature logs exported from iOS Health.
- **Custom CSV & Spreadsheets**: Auto-detects column headers (`Date`, `Flow`, `Temperature`, `Symptoms`, `Mood`, `Notes`).
- **AuraCycle Encrypted Backups**: Full-fidelity restoration of existing JSON vaults.

### Ingestion Features
- **RFC 4180 CSV Engine**: Handles multi-line quoted fields, commas within notes, and mixed line breaks.
- **Cycle Episode Clustering**: Reconstructs multi-day menstrual period events from daily bleeding logs (handling typical 1–2 day mid-period flow pauses).
- **Unit Normalization**: Automatically differentiates Celsius (<45°) from Fahrenheit (>90°) and converts seamlessly to your preferred display unit.
- **Pre-Import Verification**: Displays total days, detected periods, date range, and sample records before writing to storage.
- **Merge or Replace**: Choose to merge past history into your current logs or replace your vault completely.

---

## 🎨 Visual Identity & Botanical Palette

AuraCycle intentionally avoids the patronizing "bubblegum pink" aesthetic common to female health technology. Instead, the interface adopts a sophisticated, high-contrast botanical theme:

- **Menstrual Phase**: Deep Terracotta & Earth Rust (`#9a4430`)
- **Follicular Phase**: Forest Sage & Eucalyptus (`#2f6d54`)
- **Ovulatory Phase**: Warm Radiant Amber & Ochre (`#b87c22`)
- **Luteal Phase**: Twilight Slate & Muted Plum (`#515978`)
- **Background & Containers**: Refined dark obsidian stones (`stone-950`, `stone-900`, `stone-850`) with warm undertones meeting WCAG AA contrast standards.

---

## 📁 Project Architecture & Codebase Guide

```
├── index.html                     # HTML5 entry point with synchronized title and meta tags
├── metadata.json                  # Application capabilities and system metadata
├── package.json                   # Build configuration and dependency declarations
├── vite.config.ts                 # Vite build setup with Tailwind CSS plugin
├── src/
│   ├── main.tsx                   # Application bootstrap and React DOM root mounting
│   ├── App.tsx                    # Root controller managing vault lifecycle, lock state, and modals
│   ├── types.ts                   # Core TypeScript types, interfaces, and biomarker schemas
│   ├── index.css                  # Global Tailwind CSS stylesheet
│   ├── components/
│   │   ├── Header.tsx             # Sticky top navigation, tab switching, and lock triggers
│   │   ├── LockScreen.tsx         # PBKDF2 authentication, setup wizard, and demo data loader
│   │   ├── CycleDial.tsx          # Radial SVG cycle dial with 4-phase arcs and countdown
│   │   ├── CalendarView.tsx       # Interactive monthly calendar with phase pips and day detail
│   │   ├── AnalyticsCharts.tsx    # Recharts BBT curves, phase symptom frequencies, and energy trends
│   │   ├── DailyLogModal.tsx      # Comprehensive biomarker logging dialog with tag selectors
│   │   ├── ImportTrackerModal.tsx # Ingestion wizard for Clue, Flo, Apple Health, and custom CSV
│   │   └── PrivacySettingsModal.tsx # Passcode settings, auto-lock timers, and vault backups
│   ├── utils/
│   │   ├── crypto.ts              # Native Web Crypto API (AES-256-GCM, PBKDF2, Base64 helpers)
│   │   ├── cycleCalculations.ts   # Phase mapping, fertile window, ovulation math, symptom correlation
│   │   └── importers.ts           # CSV/JSON parsers, vendor detection, and period reconstruction
│   └── data/
│       └── seedData.ts            # Realistic 75-day sample dataset with biphasic BBT curves
```

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js (v18.0.0 or higher)
- npm or yarn

### Installation
Clone the repository and install all dependencies:
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
The server will start on port `3000` (or `http://localhost:3000`).

### Production Build
Compile the optimized static bundle:
```bash
npm run build
```
Build output will be generated in the `dist/` directory.

### Code Quality & Validation
Run TypeScript compilation and static analysis checks:
```bash
npm run lint
```

---

## 📄 License & Privacy Assurance

AuraCycle is provided as an open, private utility for personal health sovereignty. All data remains exclusively on your device under your direct control.
