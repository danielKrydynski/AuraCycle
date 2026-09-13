import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { AppData, CyclePeriod, DailyLog } from '../types';
import {
  getCycleDayForDate,
  getPhaseForCycleDay,
  calculateSymptomPhaseCorrelations,
  PHASE_DETAILS,
  daysBetween,
  parseDate,
} from '../utils/cycleCalculations';
import { Activity, Thermometer, BarChart3, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';

interface AnalyticsChartsProps {
  data: AppData;
  tempUnit: 'F' | 'C';
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ data, tempUnit }) => {
  const [activeChart, setActiveChart] = useState<'bbt' | 'symptoms' | 'energy' | 'regularity'>('bbt');

  // 1. Process BBT and Energy by Cycle Day for current/recent cycles
  const cycleDayData = useMemo(() => {
    const dayStats: Record<number, { bbtSum: number; bbtCount: number; energySum: number; stressSum: number; logCount: number }> = {};
    const avgCycle = data.settings.avgCycleLength || 28;

    for (let i = 1; i <= Math.max(28, avgCycle); i++) {
      dayStats[i] = { bbtSum: 0, bbtCount: 0, energySum: 0, stressSum: 0, logCount: 0 };
    }

    Object.values(data.logs).forEach((log: DailyLog) => {
      const cycleDay = getCycleDayForDate(log.date, data.periods);
      if (cycleDay >= 1 && cycleDay <= avgCycle + 4) {
        if (!dayStats[cycleDay]) {
          dayStats[cycleDay] = { bbtSum: 0, bbtCount: 0, energySum: 0, stressSum: 0, logCount: 0 };
        }
        if (log.bbt) {
          dayStats[cycleDay].bbtSum += log.bbt;
          dayStats[cycleDay].bbtCount += 1;
        }
        if (log.energy) {
          dayStats[cycleDay].energySum += log.energy;
        }
        if (log.stressLevel) {
          dayStats[cycleDay].stressSum += log.stressLevel;
        }
        dayStats[cycleDay].logCount += 1;
      }
    });

    return Object.entries(dayStats)
      .map(([dayStr, stat]) => {
        const day = parseInt(dayStr, 10);
        const phase = getPhaseForCycleDay(day, avgCycle);
        const avgBbt = stat.bbtCount > 0 ? +(stat.bbtSum / stat.bbtCount).toFixed(2) : null;
        const avgEnergy = stat.logCount > 0 ? +(stat.energySum / stat.logCount).toFixed(1) : null;
        const avgStress = stat.logCount > 0 ? +(stat.stressSum / stat.logCount).toFixed(1) : null;

        return {
          cycleDay: day,
          dayLabel: `D${day}`,
          phase,
          bbt: avgBbt,
          energy: avgEnergy,
          stress: avgStress,
          phaseColor: PHASE_DETAILS[phase].color.accent,
        };
      })
      .sort((a, b) => a.cycleDay - b.cycleDay);
  }, [data.logs, data.periods, data.settings.avgCycleLength]);

  // 2. Symptom Phase correlations
  const symptomCorrelations = useMemo(() => {
    return calculateSymptomPhaseCorrelations(data.logs, data.periods, data.settings.avgCycleLength);
  }, [data.logs, data.periods, data.settings.avgCycleLength]);

  // 3. Historical cycle lengths
  const cycleHistory = useMemo(() => {
    const sorted = [...data.periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const list: { cycleNumber: number; startDate: string; length: number; duration: number }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const current = sorted[i];
      let length = data.settings.avgCycleLength || 28;
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        length = daysBetween(parseDate(current.startDate), parseDate(next.startDate));
      }
      let duration = data.settings.avgPeriodLength || 5;
      if (current.endDate) {
        duration = daysBetween(parseDate(current.startDate), parseDate(current.endDate)) + 1;
      }

      list.push({
        cycleNumber: i + 1,
        startDate: current.startDate,
        length,
        duration,
      });
    }

    return list;
  }, [data.periods, data.settings.avgCycleLength, data.settings.avgPeriodLength]);

  // Calculate insights
  const insights = useMemo(() => {
    const res: { title: string; text: string; type: 'info' | 'positive' | 'note' }[] = [];

    // Check BBT shift
    const follicularTemps = cycleDayData.filter(d => d.cycleDay >= 6 && d.cycleDay <= 12 && d.bbt !== null).map(d => d.bbt!);
    const lutealTemps = cycleDayData.filter(d => d.cycleDay >= 18 && d.cycleDay <= 26 && d.bbt !== null).map(d => d.bbt!);

    if (follicularTemps.length > 0 && lutealTemps.length > 0) {
      const avgF = follicularTemps.reduce((a, b) => a + b, 0) / follicularTemps.length;
      const avgL = lutealTemps.reduce((a, b) => a + b, 0) / lutealTemps.length;
      const diff = avgL - avgF;

      if (diff >= (tempUnit === 'F' ? 0.3 : 0.15)) {
        res.push({
          title: 'Biphasic Temperature Shift Confirmed',
          text: `Your Basal Body Temp shifts +${diff.toFixed(2)}°${tempUnit} higher in the Luteal phase, confirming active progesterone production post-ovulation.`,
          type: 'positive',
        });
      } else {
        res.push({
          title: 'Temperature Logging',
          text: `Continue taking morning BBT immediately upon waking before standing to detect your post-ovulatory thermal shift.`,
          type: 'note',
        });
      }
    }

    // Check symptom patterns
    if (symptomCorrelations.length > 0) {
      const topLuteal = [...symptomCorrelations].sort((a, b) => b.luteal - a.luteal)[0];
      if (topLuteal && topLuteal.luteal > 0) {
        res.push({
          title: `Luteal Phase Focus: ${topLuteal.label}`,
          text: `${topLuteal.label} appears predominantly during your luteal phase. Supporting liver estrogen clearance and magnesium intake may ease this transition.`,
          type: 'info',
        });
      }
    }

    if (res.length === 0) {
      res.push({
        title: 'Gathering Cycle Data',
        text: 'Log your symptoms and morning temperature regularly to unlock deep personalized hormonal patterns.',
        type: 'note',
      });
    }

    return res;
  }, [cycleDayData, symptomCorrelations, tempUnit]);

  return (
    <div className="space-y-6">
      {/* Chart Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            id="chart-tab-bbt"
            onClick={() => setActiveChart('bbt')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
              activeChart === 'bbt'
                ? 'bg-amber-950 text-amber-200 border border-amber-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>BBT & Ovulation Curve</span>
          </button>

          <button
            id="chart-tab-symptoms"
            onClick={() => setActiveChart('symptoms')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
              activeChart === 'symptoms'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-800 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Symptoms by Phase</span>
          </button>

          <button
            id="chart-tab-energy"
            onClick={() => setActiveChart('energy')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
              activeChart === 'energy'
                ? 'bg-stone-800 text-stone-100 border border-stone-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Energy & Stress Curve</span>
          </button>

          <button
            id="chart-tab-regularity"
            onClick={() => setActiveChart('regularity')}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all flex items-center gap-1.5 ${
              activeChart === 'regularity'
                ? 'bg-stone-800 text-stone-100 border border-stone-700 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-stone-400" />
            <span>Cycle Regularity</span>
          </button>
        </div>

        {/* Non-pink Phase Legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-stone-400 pr-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#9a4430]"></span> Menstrual
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2f6d54]"></span> Follicular
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#b87c22]"></span> Ovulatory
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#515978]"></span> Luteal
          </span>
        </div>
      </div>

      {/* Primary Chart Canvas Container */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-7 shadow-xl">
        {/* BBT Chart View */}
        {activeChart === 'bbt' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                  Basal Body Temperature Across Cycle Days
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Visualizes the follicular low baseline vs. post-ovulation progesterone thermal rise (+0.4°-0.8°F).
                </p>
              </div>
              <div className="text-xs font-mono text-stone-400 mt-2 sm:mt-0 px-2.5 py-1 rounded-lg bg-stone-850 border border-stone-700">
                Unit: °{tempUnit}
              </div>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cycleDayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                  />
                  <YAxis
                    domain={tempUnit === 'F' ? [96.8, 98.8] : [36.0, 37.4]}
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickFormatter={(val) => `${val}°`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#f5f5f4',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value}°${tempUnit}`, 'Avg BBT']}
                    labelFormatter={(label) => `Cycle ${label}`}
                  />
                  {/* Estimated ovulation marker line */}
                  <ReferenceLine
                    x="D14"
                    stroke="#b87c22"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Est. Ovulation',
                      position: 'top',
                      fill: '#b87c22',
                      fontSize: 10,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bbt"
                    name="BBT"
                    stroke="#eab308"
                    strokeWidth={2.5}
                    dot={{ fill: '#ca8a04', r: 3 }}
                    activeDot={{ r: 6, fill: '#fef08a' }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Symptoms by Phase Bar Chart */}
        {activeChart === 'symptoms' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                  Hormonal Symptom Incidence by Cycle Phase
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Discover which hormonal shifts trigger specific physical sensations and discomforts.
                </p>
              </div>
            </div>

            {symptomCorrelations.length === 0 ? (
              <div className="py-16 text-center text-stone-500 text-xs">
                No physical symptoms logged yet. Use the Log button to record daily observations.
              </div>
            ) : (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={symptomCorrelations.slice(0, 8)}
                    margin={{ top: 10, right: 20, left: -10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#78716c"
                      tick={{ fill: '#a8a29e', fontSize: 10 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="#78716c"
                      tick={{ fill: '#a8a29e', fontSize: 11 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1c1917',
                        borderColor: '#44403c',
                        borderRadius: '0.75rem',
                        color: '#f5f5f4',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="menstrual" name="Menstrual" fill="#9a4430" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="follicular" name="Follicular" fill="#2f6d54" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="ovulatory" name="Ovulatory" fill="#b87c22" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="luteal" name="Luteal" fill="#515978" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Energy & Stress Area Chart */}
        {activeChart === 'energy' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                  Energy & Stress Trajectory
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Correlates vitality and mental stress across cycle days (1-5 scale).
                </p>
              </div>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cycleDayData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2f6d54" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#2f6d54" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stressGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b45309" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#b45309" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis dataKey="dayLabel" stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 11 }} />
                  <YAxis domain={[1, 5]} stroke="#78716c" tick={{ fill: '#a8a29e', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#f5f5f4',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area
                    type="monotone"
                    dataKey="energy"
                    name="Energy Level (1-5)"
                    stroke="#34d399"
                    fillOpacity={1}
                    fill="url(#energyGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="stress"
                    name="Stress Level (1-5)"
                    stroke="#f59e0b"
                    fillOpacity={1}
                    fill="url(#stressGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Cycle Regularity Chart */}
        {activeChart === 'regularity' && (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-serif-heading font-semibold text-stone-100">
                  Historical Cycle Lengths
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Compares individual cycle lengths to your baseline average ({data.settings.avgCycleLength || 28} days).
                </p>
              </div>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cycleHistory} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#292524" vertical={false} />
                  <XAxis
                    dataKey="startDate"
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[20, 36]}
                    stroke="#78716c"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    tickFormatter={(val) => `${val}d`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1c1917',
                      borderColor: '#44403c',
                      borderRadius: '0.75rem',
                      color: '#f5f5f4',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [`${val} days`, 'Cycle Length']}
                  />
                  <ReferenceLine
                    y={data.settings.avgCycleLength || 28}
                    stroke="#34d399"
                    strokeDasharray="4 4"
                    label={{
                      value: `Target Avg (${data.settings.avgCycleLength}d)`,
                      fill: '#34d399',
                      fontSize: 10,
                      position: 'top',
                    }}
                  />
                  <Bar dataKey="length" fill="#2f6d54" radius={[6, 6, 0, 0]} name="Total Cycle Length" />
                  <Bar dataKey="duration" fill="#9a4430" radius={[4, 4, 0, 0]} name="Period Duration" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Hormonal Health Insights Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-stone-900 border border-stone-800 flex items-start gap-3.5 shadow-sm"
          >
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-stone-100">{insight.title}</h4>
              <p className="text-xs text-stone-400 mt-1 leading-relaxed">{insight.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
