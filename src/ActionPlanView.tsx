import { useState } from 'react';
import { CheckCircle2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from './data';
import type { PathPlanningResult, PathResult, TimelinePhase } from './lib/pathPlanningEngine';

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP MILESTONE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function RoadmapMilestone({
  phase,
  index,
  total,
  accentColor,
}: {
  phase: TimelinePhase;
  index: number;
  total: number;
  accentColor: string;
}) {
  const [expanded, setExpanded] = useState(index === 0); // Month 1 open by default
  const isLast = index === total - 1;

  return (
    <div className="relative flex gap-5">
      {/* Vertical connector line + Node */}
      <div className="flex flex-col items-center shrink-0">
        {/* Node */}
        <div
          className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-[3px] shadow-lg transition-transform duration-300"
          style={{
            background: expanded ? accentColor : '#0B1D3A',
            borderColor: accentColor,
            boxShadow: expanded ? `0 0 20px ${accentColor}60, 0 4px 12px rgba(0,0,0,0.3)` : `0 0 8px ${accentColor}30`,
            color: expanded ? '#FFF' : accentColor,
            transform: expanded ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {phase.emoji}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div className="w-0.5 flex-1 min-h-[20px]" style={{ background: `linear-gradient(to bottom, ${accentColor}60, ${accentColor}15)` }} />
        )}
      </div>

      {/* Content card */}
      <div className="flex-1 pb-8">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left group cursor-pointer"
        >
          <div
            className="rounded-2xl overflow-hidden transition-all duration-300"
            style={{
              background: expanded ? `linear-gradient(135deg, ${accentColor}12, ${accentColor}04)` : 'rgba(17, 38, 73, 0.4)',
              border: expanded ? `1px solid ${accentColor}40` : '1px solid rgba(255,255,255,0.05)',
              boxShadow: expanded ? `0 4px 24px ${accentColor}15` : 'none',
            }}
          >
            {/* Phase header */}
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ background: `${accentColor}20`, color: accentColor }}
                >
                  {phase.phase}
                </span>
                <h4 className="text-sm font-bold text-white">{phase.title}</h4>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span className="text-[11px] hidden sm:inline">{phase.tasks.length} step{phase.tasks.length > 1 ? 's' : ''}</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>

            {/* Subtitle */}
            {expanded && (
              <p className="px-5 -mt-1 mb-3 text-xs text-slate-400 italic">{phase.subtitle}</p>
            )}

            {/* Expanded tasks */}
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: expanded ? `${phase.tasks.length * 200 + 40}px` : '0px', opacity: expanded ? 1 : 0 }}
            >
              <div className="px-5 pb-5 space-y-3">
                {phase.tasks.map((t, tidx) => (
                  <div
                    key={tidx}
                    className="rounded-xl p-4 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accentColor, opacity: 0.8 }} />
                      <div className="flex-1">
                        <p className="text-[13px] text-white font-medium leading-relaxed">{t.task}</p>
                        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg" style={{ background: `${accentColor}08`, border: `1px solid ${accentColor}15` }}>
                          <Info className="w-3 h-3 shrink-0 mt-0.5" style={{ color: accentColor, opacity: 0.7 }} />
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            <span className="font-medium" style={{ color: `${accentColor}CC` }}>Why? </span>
                            {t.reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// XAI CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function XaiCard({ title, desc, accentColor }: { title: string; desc: string; accentColor: string }) {
  return (
    <div
      className="p-4 rounded-xl border transition-all hover:bg-white/[0.02] group"
      style={{ background: 'rgba(255,255,255,0.01)', borderColor: `rgba(255,255,255,0.06)` }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-3.5 h-3.5" style={{ color: accentColor, opacity: 0.7 }} />
        <p className="text-xs font-bold text-white uppercase tracking-wide">{title}</p>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ACTION PLAN VIEW
// ─────────────────────────────────────────────────────────────────────────────

export default function ActionPlanView({
  selectedPath,
  result,
  onReset,
}: {
  selectedPath: PathResult;
  result: PathPlanningResult;
  onReset: () => void;
}) {
  return (
    <div className="animate-fadeIn space-y-10">

      {/* ── Active Blueprint Header ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: 'rgba(17, 38, 73, 0.6)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${selectedPath.accentColor}30`,
          boxShadow: `0 0 40px ${selectedPath.accentColor}10`,
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-20 -mr-20 -mt-20 pointer-events-none"
          style={{ background: selectedPath.accentColor }}
        />
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-green-500/20 text-green-400 text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active Blueprint
              </span>
              <span className="text-sm font-bold text-white uppercase tracking-wider">{selectedPath.name}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Your 12-Month Financial Roadmap</h2>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              A step-by-step plan built specifically for you. Every task tells you <strong>exactly what to do</strong> and <strong>why it matters</strong>. Just follow the roadmap month by month.
            </p>
          </div>
          <button
            onClick={onReset}
            className="text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 rounded-xl transition-all font-medium whitespace-nowrap cursor-pointer shrink-0"
          >
            Change Strategy
          </button>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
          {[
            { label: 'Monthly Surplus', value: formatINR(result.monthlySurplus) },
            { label: 'Retire by Age', value: `${selectedPath.retirementAge}` },
            { label: 'Avg Return', value: `${selectedPath.avgReturn}% p.a.` },
          ].map(s => (
            <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{s.label}</p>
              <p className="text-sm font-bold text-white mt-0.5">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Surplus Split Bar ── */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
          Where your {formatINR(result.monthlySurplus)}/month goes
        </h3>
        <div className="h-3.5 w-full rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.05)' }}>
          {selectedPath.goalBuckets.map((b, i) => {
            const pct = result.monthlySurplus > 0 ? (b.monthly_allocation / result.monthlySurplus) * 100 : 0;
            const opacity = Math.max(0.35, 1 - (i * 0.2));
            return (
              <div
                key={b.goal_id}
                className="h-full transition-all duration-1000"
                style={{ width: `${pct}%`, background: selectedPath.accentColor, opacity }}
                title={`${b.goal_name}: ${formatINR(b.monthly_allocation)}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-2.5">
          {selectedPath.goalBuckets.map((b, i) => {
            const pct = result.monthlySurplus > 0 ? Math.round((b.monthly_allocation / result.monthlySurplus) * 100) : 0;
            const opacity = Math.max(0.35, 1 - (i * 0.2));
            return (
              <div key={b.goal_id} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: selectedPath.accentColor, opacity }} />
                <span className="text-white font-semibold">{formatINR(b.monthly_allocation)}</span>
                <span className="text-slate-500">({pct}%)</span>
                <span className="text-slate-400">{b.goal_name}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Behind the AI (XAI) ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Info className="w-4 h-4 text-orange-400" /> How the AI built your plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <XaiCard title="Why this split?" desc={selectedPath.xai_explanations.allocation_logic} accentColor={selectedPath.accentColor} />
          <XaiCard title="What does success % mean?" desc={selectedPath.xai_explanations.monte_carlo_meaning} accentColor={selectedPath.accentColor} />
          <XaiCard title="Why does asset mix change?" desc={selectedPath.xai_explanations.glide_path_reasoning} accentColor={selectedPath.accentColor} />
        </div>
      </div>

      {/* ── Visual Roadmap Timeline ── */}
      <div className="space-y-6 pt-2">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Your Financial Roadmap</h3>
          <p className="text-xs text-slate-400">Follow these milestones month by month. Click any milestone to see the detailed steps and reasons.</p>
        </div>

        <div className="mt-4">
          {selectedPath.monthly_timeline.map((phase, idx) => (
            <RoadmapMilestone
              key={idx}
              phase={phase}
              index={idx}
              total={selectedPath.monthly_timeline.length}
              accentColor={selectedPath.accentColor}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
