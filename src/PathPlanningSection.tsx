import { useState, useMemo } from 'react';
import { Shield, BarChart3, Flame, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatINR, UserData } from './data';
import { computeAllPaths, type PathResult } from './lib/pathPlanningEngine';
import { saveUserData } from './lib/userDataService';
import toast from 'react-hot-toast';
import ActionPlanView from './ActionPlanView';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const pathIcons: Record<string, React.ElementType> = {
  safety: Shield,
  balanced: BarChart3,
  aggressive: Flame,
};

const pathGradients: Record<string, string> = {
  safety: 'from-green-500 to-emerald-600',
  balanced: 'from-sky-500 to-cyan-600',
  aggressive: 'from-orange-500 to-amber-600',
};

function successIcon(rate: number): string {
  if (rate >= 85) return '✅';
  if (rate >= 70) return '⚠️';
  return '❌';
}

function successColor(rate: number): string {
  if (rate >= 85) return '#22C55E';
  if (rate >= 70) return '#EAB308';
  return '#EF4444';
}

function successBgClass(rate: number): string {
  if (rate >= 85) return 'bg-green-500';
  if (rate >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

function overallConfidence(buckets: { success_rate: number }[]): string {
  if (buckets.length === 0) return '—';
  const avg = buckets.reduce((s, b) => s + b.success_rate, 0) / buckets.length;
  if (avg >= 85) return 'HIGH';
  if (avg >= 70) return 'MEDIUM';
  return 'LOW-MED';
}

// ─────────────────────────────────────────────────────────────────────────────
// MONTE CARLO TOOLTIP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function MonteCarloTooltip() {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        type="button"
        className="text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="What is success rate?"
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl text-xs text-slate-300 z-50 glass shadow-xl animate-fadeIn"
          style={{ background: 'rgba(11, 29, 58, 0.95)', border: '1px solid rgba(255,255,255,0.12)' }}>
          We ran 1,000 simulations of this goal using random market return scenarios.
          This percentage shows how often you successfully reach your target amount.
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 rotate-45"
            style={{ background: 'rgba(11, 29, 58, 0.95)', borderRight: '1px solid rgba(255,255,255,0.12)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} />
        </div>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COLLAPSIBLE SECTION
// ─────────────────────────────────────────────────────────────────────────────

function Collapsible({ title, items, accentColor }: { title: string; items: string[]; accentColor: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-white/5 pt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-200 transition-colors cursor-pointer"
      >
        {title}
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${items.length * 36 + 12}px` : '0px', opacity: open ? 1 : 0 }}
      >
        <ul className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: accentColor }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GLIDE PATH CHART
// ─────────────────────────────────────────────────────────────────────────────

function GlidePathChart({ data, accentColor }: { data: { year: number; equity: number; debt: number }[]; accentColor: string }) {
  return (
    <div className="mt-4">
      <p className="text-xs text-slate-400 font-medium mb-2 uppercase tracking-wider">Asset Allocation Over Time</p>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`eq-${accentColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accentColor} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`db-${accentColor.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748B" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#64748B" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="year" tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748B', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: '#112649', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F1F5F9', fontSize: 12 }}
              formatter={(value: number, name: string) => [`${value}%`, name === 'equity' ? 'Equity' : 'Debt']}
              labelFormatter={(label) => `Year ${label}`}
            />
            <Area type="monotone" dataKey="equity" stackId="1" stroke={accentColor} fill={`url(#eq-${accentColor.replace('#', '')})`} strokeWidth={2} />
            <Area type="monotone" dataKey="debt" stackId="1" stroke="#64748B" fill={`url(#db-${accentColor.replace('#', '')})`} strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function PathCard({
  path,
  isSelected,
  isDimmed,
  onSelect,
}: {
  path: PathResult;
  isSelected: boolean;
  isDimmed: boolean;
  onSelect: () => void;
}) {
  const Icon = pathIcons[path.id] || BarChart3;
  const gradient = pathGradients[path.id] || pathGradients.balanced;

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${isDimmed ? 'path-card-dimmed' : ''}`}
      style={{
        background: 'rgba(17, 38, 73, 0.6)',
        backdropFilter: 'blur(12px)',
        border: isSelected ? `2px solid ${path.accentColor}` : '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isSelected ? `0 0 40px ${path.accentColor}30, 0 0 80px ${path.accentColor}15` : 'none',
      }}
    >
      {/* Top colored band */}
      <div className="h-1.5" style={{ background: path.accentColor }} />

      <div className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: `${path.accentColor}18` }}
            >
              <Icon className="w-5 h-5" style={{ color: path.accentColor }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{path.name}</h3>
              <span
                className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 uppercase tracking-wider"
                style={{ background: `${path.accentColor}20`, color: path.accentColor }}
              >
                {path.risk} RISK
              </span>
            </div>
          </div>
          {isSelected && (
            <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
              ✓ Active
            </span>
          )}
        </div>

        <p className="text-xs text-slate-400 italic leading-relaxed -mt-1">{path.philosophy}</p>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Retire Age', value: `Age ${path.retirementAge}` },
            { label: 'Monthly SIP', value: formatINR(path.monthlySipNeeded) },
            { label: 'Avg Return', value: `${path.avgReturn}% p.a.` },
          ].map((m) => (
            <div key={m.label} className="text-center p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{m.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{m.value}</p>
            </div>
          ))}
        </div>

        {/* Goal Buckets */}
        <div>
          <div className="flex items-center mb-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Goal Buckets</p>
            <span className="text-[10px] text-slate-500 ml-1">— Success Rate</span>
            <MonteCarloTooltip />
          </div>
          <div className="space-y-3">
            {path.goalBuckets.map((bucket) => (
              <div key={bucket.goal_id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-300 truncate flex-1 mr-2">{bucket.goal_name}</span>
                  <span className="text-white font-medium shrink-0 mr-3">{formatINR(bucket.monthly_allocation)}</span>
                  <span className="shrink-0 font-semibold text-xs" style={{ color: successColor(bucket.success_rate) }}>
                    {bucket.success_rate}% {successIcon(bucket.success_rate)}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${successBgClass(bucket.success_rate)}`}
                    style={{ width: `${Math.min(bucket.success_rate, 100)}%`, opacity: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Glide Path Chart */}
        <GlidePathChart data={path.glidePath} accentColor={path.accentColor} />

        {/* Collapsible Sections */}
        <div className="space-y-3">
          <Collapsible title="▶ Key Actions" items={path.keyActions} accentColor={path.accentColor} />
          <Collapsible title="▶ Trade-offs" items={path.tradeoffs} accentColor={path.accentColor} />
        </div>

        {/* Select Button */}
        <button
          type="button"
          onClick={onSelect}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 cursor-pointer ${
            isSelected
              ? 'bg-white/10 text-white border border-white/20'
              : `bg-gradient-to-r ${gradient} text-white hover:opacity-90 hover:shadow-lg`
          }`}
        >
          {isSelected ? '✓ Active Plan' : 'Select This Path →'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────────────────────────────────────

function ComparisonTable({ paths, selectedId }: { paths: PathResult[]; selectedId: string | null }) {
  if (paths.length === 0) return null;

  // Build rows dynamically
  const staticRows: { label: string; values: string[] }[] = [
    { label: 'Retirement Age', values: paths.map((p) => `Age ${p.retirementAge}`) },
    { label: 'Monthly SIP Needed', values: paths.map((p) => formatINR(p.monthlySipNeeded)) },
    { label: 'Avg Expected Return', values: paths.map((p) => `${p.avgReturn}%`) },
  ];

  // Goal rows — pick goals from first path (all paths have same goals)
  const goalRows: { label: string; values: string[] }[] = paths[0].goalBuckets.map((bucket, idx) => ({
    label: bucket.goal_name,
    values: paths.map((p) => {
      const b = p.goalBuckets[idx];
      return b ? `${b.success_rate}% ${successIcon(b.success_rate)}` : '—';
    }),
  }));

  const confidenceRow = {
    label: 'Overall Confidence',
    values: paths.map((p) => overallConfidence(p.goalBuckets)),
  };

  const allRows = [...staticRows, ...goalRows, confidenceRow];

  return (
    <div className="mt-10 animate-fadeIn">
      <h3 className="text-lg font-bold text-white mb-4">Side-by-Side Comparison</h3>
      <div className="overflow-x-auto rounded-xl" style={{ background: 'rgba(17, 38, 73, 0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left text-xs text-slate-500 uppercase tracking-wider font-medium p-4 border-b border-white/5 w-48">Metric</th>
              {paths.map((p) => (
                <th
                  key={p.id}
                  className={`text-center p-4 border-b font-semibold text-sm ${
                    selectedId === p.id ? 'border-white/10' : 'border-white/5'
                  }`}
                  style={{
                    color: selectedId === p.id ? p.accentColor : '#CBD5E1',
                    background: selectedId === p.id ? `${p.accentColor}08` : 'transparent',
                  }}
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, i) => (
              <tr key={i} className="border-b border-white/[0.03] last:border-0">
                <td className="p-3.5 text-slate-400 font-medium text-xs">{row.label}</td>
                {row.values.map((v, j) => (
                  <td
                    key={j}
                    className="p-3.5 text-center text-white/90 font-medium text-xs"
                    style={{
                      background: selectedId === paths[j]?.id ? `${paths[j].accentColor}06` : 'transparent',
                    }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function PathPlanningSection({
  data,
  setData,
}: {
  data: UserData;
  setData: React.Dispatch<React.SetStateAction<UserData>>;
}) {
  const selectedPathId = data.system_state.path_planning.active_path_selected;

  // Compute all paths — memoized so Monte Carlo only re-runs when data changes
  const result = useMemo(() => computeAllPaths(data), [data]);

  const handleSelectPath = async (pathId: string) => {
    const updated: UserData = {
      ...data,
      system_state: {
        ...data.system_state,
        path_planning: {
          ...data.system_state.path_planning,
          active_path_selected: pathId,
        },
      },
    };
    setData(updated);
    toast.success('Path activated. Your plan is live.', {
      icon: '🚀',
      style: { background: '#112649', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' },
    });

    // Persist to Supabase
    try {
      await saveUserData(updated);
    } catch (e) {
      console.error('Failed to save path selection:', e);
    }
  };

  const handleResetPath = async () => {
    const updated: UserData = {
      ...data,
      system_state: {
        ...data.system_state,
        path_planning: {
          ...data.system_state.path_planning,
          active_path_selected: null,
        },
      },
    };
    setData(updated);
    try {
      await saveUserData(updated);
    } catch (e) {
      console.error('Failed to reset path selection:', e);
    }
  };

  const selectedPathObj = result.paths.find(p => p.id === selectedPathId);

  // If a path is selected, show the Action Plan Execution view
  if (selectedPathId && selectedPathObj) {
    return (
      <div className="space-y-12">
        <ActionPlanView 
           selectedPath={selectedPathObj} 
           result={result} 
           onReset={handleResetPath}
        />
        
        {/* Hide comparison underneath a "Review Alternative Strategies" section */}
        <div className="border-t border-white/10 pt-8 mt-12 opacity-60 hover:opacity-100 transition-opacity">
           <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
             Review Alternative Strategies
           </h3>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {result.paths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                isSelected={selectedPathId === path.id}
                isDimmed={!!selectedPathId && selectedPathId !== path.id}
                onSelect={() => handleSelectPath(path.id)}
              />
            ))}
          </div>
          <ComparisonTable paths={result.paths} selectedId={selectedPathId} />
        </div>
      </div>
    );
  }

  // Otherwise, return standard Strategy Selection view 
  return (
    <div className="animate-fadeIn space-y-8">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Your Personalised Investment Paths</h2>
        <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
          Three strategies built around your goals, timeline and risk appetite.
          Each path is independently stress-tested with 1,000 market simulations.
        </p>
      </div>

      {/* Top Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Monthly Surplus Available', value: formatINR(result.monthlySurplus), accent: '#F97316' },
          { label: 'Total Goals', value: result.totalGoals.toString(), accent: '#0EA5E9' },
          { label: 'Earliest Retirement', value: `Age ${result.earliestRetirementAge}`, accent: '#22C55E' },
        ].map((pill) => (
          <div
            key={pill.label}
            className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
            style={{ background: 'rgba(17, 38, 73, 0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="w-2 h-8 rounded-full" style={{ background: pill.accent }} />
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{pill.label}</p>
              <p className="text-lg font-bold text-white">{pill.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3 Path Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {result.paths.map((path) => (
          <PathCard
            key={path.id}
            path={path}
            isSelected={selectedPathId === path.id}
            isDimmed={!!selectedPathId && selectedPathId !== path.id}
            onSelect={() => handleSelectPath(path.id)}
          />
        ))}
      </div>

      {/* Bottom Comparison Table */}
      <ComparisonTable paths={result.paths} selectedId={selectedPathId} />
    </div>
  );
}
