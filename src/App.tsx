import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  LayoutDashboard, Heart, BarChart3, Zap, FlaskConical,
  Map, Bell, LogOut, TrendingUp, Menu, Folder, UserCircle, AlertTriangle, X
} from 'lucide-react';
import { defaultUserData, UserData } from './data';
import { supabase } from './lib/supabase';
import LoginPage from './LoginPage';
import DashboardSection from './DashboardSection';
import HealthScoreSection from './HealthScoreSection';
import PortfolioSection from './PortfolioSection';
import IncidentSection from './IncidentSection';
import ScenarioSection from './ScenarioSection';
import PathPlanningSection from './PathPlanningSection';
import MarketAlertsSection from './MarketAlertsSection';
import DocumentsSection from './DocumentsSection';
import ProfileSection from './ProfileSection';
import Chatbot from './Chatbot';
import { fetchUserData, saveUserData } from './lib/userDataService';
import { computeAllPaths, type PathPlanningResult } from './lib/pathPlanningEngine';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'documents', label: 'My Documents', icon: Folder },
  { id: 'profile', label: 'My Profile', icon: UserCircle },
  { id: 'health', label: 'Health Score', icon: Heart },
  { id: 'portfolio', label: 'My Portfolio', icon: BarChart3 },
  { id: 'incident', label: 'Incident Layer', icon: Zap },
  { id: 'scenario', label: 'Scenario Simulator', icon: FlaskConical },
  { id: 'paths', label: 'Path Planning', icon: Map },
  { id: 'alerts', label: 'Market Alerts', icon: Bell },
];

interface DocsState { bank: File | null; portfolio: File | null; tax: File | null; other: File | null; }

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('user@financeiq.com');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [data, setData] = useState<UserData>(defaultUserData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [docs, setDocs] = useState<DocsState>({ bank: null, portfolio: null, tax: null, other: null });

  // Persistent admin event alerts (never auto-dismiss)
  interface AdminAlert {
    id: string;
    type: 'crash' | 'correction' | 'rally' | 'life-event';
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
    title: string;
    message: string;
    timestamp: string;
  }
  const [adminAlerts, setAdminAlerts] = useState<AdminAlert[]>([]);

  // Path recalculation events — triggered by alerts
  interface PathRecalcEvent {
    id: string;
    triggerType: string; // 'market-crash' | 'macro-event' | 'life-event'
    triggerTitle: string;
    timestamp: string;
    before: {
      monthlySurplus: number;
      goalBuckets: { goal_name: string; monthly_allocation: number; success_rate: number }[];
      retirementAge: number;
    };
    after: {
      monthlySurplus: number;
      goalBuckets: { goal_name: string; monthly_allocation: number; success_rate: number }[];
      retirementAge: number;
    };
  }
  const [pathRecalcEvents, setPathRecalcEvents] = useState<PathRecalcEvent[]>([]);

  // Listen for auth state changes
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (mounted) setSession(currentSession);
        
        if (currentSession?.user) {
          if (mounted) {
            setUserName(currentSession.user.user_metadata?.full_name || 'User');
            setUserEmail(currentSession.user.email || 'user@financeiq.com');
          }
          
          try {
            const userData = await fetchUserData(currentSession.user.id);
            if (mounted) setData(userData);
          } catch(e) {
            console.error("Failed to fetch data on init:", e);
          }
        }
      } catch (err) {
        console.error("Auth init error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (mounted) setSession(newSession);
      if (newSession?.user) {
        if (mounted) {
          setUserName(newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name || 'User');
          setUserEmail(newSession.user.email || 'user@financeiq.com');
        }
        try {
          const userData = await fetchUserData(newSession.user.id);
          if (mounted) setData(userData);
        } catch(e) {
           console.error("Failed to fetch data on auth change:", e);
        }
      } else {
        if (mounted) {
          setData(defaultUserData);
          setDocs({ bank: null, portfolio: null, tax: null, other: null });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- ADMIN POLLING HACK ---
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    let isPolling = false;

    const pollAdminEvents = async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const res = await fetch(`http://localhost:8000/api/v1/admin/poll-events/${userId}`);
        const result = await res.json();
        
        if (result.events && result.events.length > 0) {
          for (const evt of result.events) {
            let newData = { ...data };
            const alertId = `${evt.type}-${Date.now()}`;
            
            if (evt.type === 'simulate-market-crash') {
              const { ticker, drop_percent } = evt.payload;
              
              // Determine severity based on threshold
              let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
              let alertType: 'crash' | 'correction' | 'rally' = 'correction';
              let title = '';
              let message = '';
              
              if (drop_percent >= 5) {
                severity = 'CRITICAL';
                alertType = 'crash';
                title = `MARKET CRASH: ${ticker} dropped ${drop_percent}%`;
                message = `Severe market downturn detected. Portfolio value has been significantly impacted. Auto path recalculation triggered — switching to safety-first strategy.`;
              } else if (drop_percent >= 2) {
                severity = 'HIGH';
                alertType = 'correction';
                title = `MARKET CORRECTION: ${ticker} dropped ${drop_percent}%`;
                message = `Market correction detected. Portfolio rebalancing recommended. Monitoring for further deterioration.`;
              } else {
                severity = 'MEDIUM';
                alertType = 'rally';
                title = `MARKET MOVEMENT: ${ticker} changed ${drop_percent}%`;
                message = `Notable market movement detected. No immediate action required.`;
              }
              
              setAdminAlerts(prev => [{ id: alertId, type: alertType, severity, title, message, timestamp: new Date().toISOString() }, ...prev]);
              
              const newAssets = newData.assets_portfolio.map(a => {
                if (a.ticker === ticker) {
                  return { ...a, current_market_value: Math.max(0, Math.floor(a.current_market_value * (1 - drop_percent / 100))) };
                }
                return a;
              });
              newData = { ...newData, assets_portfolio: newAssets };
              
            } else if (evt.type === 'log-life-event') {
              const { event_type, new_income } = evt.payload;
              const niceEvent = event_type.replace(/_/g, ' ').toUpperCase();
              
              setAdminAlerts(prev => [{
                id: alertId,
                type: 'life-event',
                severity: 'CRITICAL',
                title: `LIFE EVENT: ${niceEvent}`,
                message: `Income adjusted to ₹${new_income.toLocaleString('en-IN')}. Emergency runway recalculated. Health score will be recomputed with updated financial state.`,
                timestamp: new Date().toISOString(),
              }, ...prev]);
              
              newData = { 
                ...newData, 
                income_and_cashflow: { 
                  ...newData.income_and_cashflow, 
                  monthly_net_take_home: new_income, 
                  monthly_base_pay: new_income,
                  monthly_variable_pay: 0
                } 
              };
            } else if (evt.type === 'macro-event') {
              const { event_type, basis_points_change, new_emi, old_emi, emi_delta, new_interest_rate, new_debt_health, old_debt_health, dti_ratio, xai_message } = evt.payload;
              const isHike = event_type.includes('hike');
              
              setAdminAlerts(prev => [{
                id: alertId,
                type: isHike ? 'crash' : 'correction',
                severity: isHike ? 'CRITICAL' : 'HIGH',
                title: isHike 
                  ? `RBI RATE HIKE: +${basis_points_change}% | EMI: ₹${Math.round(old_emi).toLocaleString('en-IN')} → ₹${Math.round(new_emi).toLocaleString('en-IN')} | DTI: ${dti_ratio || '—'}%`
                  : `RBI RATE CUT: ${basis_points_change}% | EMI: ₹${Math.round(new_emi).toLocaleString('en-IN')} | DTI: ${dti_ratio || '—'}%`,
                message: xai_message,
                timestamp: new Date().toISOString(),
              }, ...prev]);

              // Update EMI in the user's liabilities
              const newDebts = newData.liabilities_and_debt.map((d: any) => {
                if (d.loan_type?.toLowerCase().includes('home') || d.loan_type?.toLowerCase().includes('housing')) {
                  return { ...d, interest_rate: new_interest_rate, monthly_emi: Math.round(new_emi) };
                }
                return d;
              });
              
              // Also update total monthly EMI in income_cashflow
              const emiDiff = Math.round(emi_delta);
              
              // Directly apply the backend's calculated debt_health score
              const currentScores = newData.system_state.health_scores;
              const dims = currentScores.dimensions;
              const updatedDims = { ...dims, debt_health: new_debt_health };
              
              // Recalculate overall score as average of all 6 dimensions
              const allScores = [
                updatedDims.emergency_fund,
                updatedDims.insurance_coverage,
                updatedDims.investment_diversification,
                updatedDims.debt_health,
                updatedDims.tax_efficiency,
                updatedDims.retirement_readiness,
              ];
              const newOverall = Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10;

              newData = {
                ...newData,
                liabilities_and_debt: newDebts,
                income_and_cashflow: {
                  ...newData.income_and_cashflow,
                  total_monthly_emi: newData.income_and_cashflow.total_monthly_emi + emiDiff,
                },
                system_state: {
                  ...newData.system_state,
                  health_scores: {
                    ...currentScores,
                    overall_score: newOverall,
                    dimensions: updatedDims,
                  },
                },
              };
            } else if (evt.type === 'market-threshold') {
              // ── REAL-TIME MARKET THRESHOLD ALERT ──
              const { event_type, severity, ticker, asset_name, percentage_change, current_price, recommended_path_shift, xai_explanation, recommended_actions } = evt.payload;
              
              let alertType: 'crash' | 'correction' | 'rally' = 'correction';
              if (event_type === 'CRASH') alertType = 'crash';
              else if (event_type === 'RALLY') alertType = 'rally';
              
              const pctLabel = percentage_change > 0 ? `+${percentage_change.toFixed(2)}%` : `${percentage_change.toFixed(2)}%`;
              const priceLabel = current_price ? `₹${current_price.toLocaleString('en-IN')}` : '';
              
              setAdminAlerts(prev => [{
                id: alertId,
                type: alertType,
                severity: severity as 'CRITICAL' | 'HIGH' | 'MEDIUM',
                title: `${event_type}: ${asset_name} (${ticker}) ${pctLabel} ${priceLabel}`,
                message: xai_explanation || `${asset_name} crossed the ${event_type.toLowerCase()} threshold. ${recommended_actions?.join('. ') || ''}`,
                timestamp: new Date().toISOString(),
              }, ...prev]);

              // Update the portfolio asset value if we have a current price
              if (current_price && ticker) {
                const newAssets = newData.assets_portfolio.map((a: any) => {
                  if (a.ticker === ticker) {
                    // Compute new market value from the percentage change
                    const newValue = Math.max(0, Math.round(a.current_market_value * (1 + percentage_change / 100)));
                    return { ...a, current_market_value: newValue };
                  }
                  return a;
                });
                newData = { ...newData, assets_portfolio: newAssets };
              }

              // Auto-switch path if backend recommends it
              if (recommended_path_shift) {
                newData = {
                  ...newData,
                  system_state: {
                    ...newData.system_state,
                    path_planning: {
                      ...newData.system_state.path_planning,
                      active_path_selected: recommended_path_shift,
                    },
                  },
                };
                toast(`Path auto-switched to "${recommended_path_shift}" based on market conditions`, {
                  icon: '🔄',
                  duration: 5000,
                  style: { background: '#112649', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' },
                });
              }
            }

            // ── PATH RECALCULATION: Before/After Snapshot ──
            const activePathId = data.system_state.path_planning.active_path_selected;
            let beforePaths: PathPlanningResult | null = null;
            if (activePathId) {
              try { beforePaths = computeAllPaths(data); } catch (e) { /* ignore */ }
            }

            toast.loading(`Recalculating Health Score & Advisory...`, { id: "recalc", duration: 3000 });
            try {
              const hsRes = await fetch('http://localhost:8000/api/v1/analyze-with-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
              });
              if (hsRes.ok) {
                const hsResult = await hsRes.json();
                newData.system_state.health_scores = {
                  overall_score: hsResult.overall_score,
                  dimensions: {
                    emergency_fund: hsResult.dimensions['Emergency Fund']?.score || 0,
                    insurance_coverage: hsResult.dimensions['Insurance Coverage']?.score || 0,
                    investment_diversification: hsResult.dimensions['Investment Diversification']?.score || 0,
                    debt_health: hsResult.dimensions['Debt Health']?.score || 0,
                    tax_efficiency: hsResult.dimensions['Tax Efficiency']?.score || 0,
                    retirement_readiness: hsResult.dimensions['Retirement Readiness']?.score || 0,
                  },
                  gemini_advisory: hsResult.gemini_advisory,
                };
                toast.success('AI Advisory Updated!', { id: "recalc" });
              }
            } catch (e) {
              console.error("Failed to recalculate health score", e);
             toast.dismiss("recalc");
            }
            
            // ── PATH RECALCULATION: Compute After snapshot & generate delta ──
            if (activePathId && beforePaths) {
              try {
                const afterPaths = computeAllPaths(newData);
                const beforePath = beforePaths.paths.find(p => p.id === activePathId);
                const afterPath = afterPaths.paths.find(p => p.id === activePathId);

                if (beforePath && afterPath) {
                  const recalcEvent: PathRecalcEvent = {
                    id: `recalc-${Date.now()}`,
                    triggerType: evt.type,
                    triggerTitle: evt.type === 'macro-event'
                      ? `RBI Rate Change (+${evt.payload.basis_points_change}%)`
                      : evt.type === 'simulate-market-crash'
                      ? `Market Crash (${evt.payload.ticker} -${evt.payload.drop_percent}%)`
                      : evt.type === 'market-threshold'
                      ? `${evt.payload.event_type}: ${evt.payload.asset_name} (${evt.payload.percentage_change > 0 ? '+' : ''}${evt.payload.percentage_change}%)`
                      : `Life Event (${evt.payload.event_type})`,
                    timestamp: new Date().toISOString(),
                    before: {
                      monthlySurplus: beforePaths.monthlySurplus,
                      goalBuckets: beforePath.goalBuckets.map(b => ({
                        goal_name: b.goal_name,
                        monthly_allocation: b.monthly_allocation,
                        success_rate: b.success_rate,
                      })),
                      retirementAge: beforePath.retirementAge,
                    },
                    after: {
                      monthlySurplus: afterPaths.monthlySurplus,
                      goalBuckets: afterPath.goalBuckets.map(b => ({
                        goal_name: b.goal_name,
                        monthly_allocation: b.monthly_allocation,
                        success_rate: b.success_rate,
                      })),
                      retirementAge: afterPath.retirementAge,
                    },
                  };

                  setPathRecalcEvents(prev => [recalcEvent, ...prev]);

                  // Show path impact in a toast
                  const surplusDelta = afterPaths.monthlySurplus - beforePaths.monthlySurplus;
                  if (surplusDelta !== 0) {
                    toast(
                      `Path recalculated: Surplus ${surplusDelta < 0 ? '' : '+'}₹${Math.abs(surplusDelta).toLocaleString('en-IN')}/mo | Retirement age: ${beforePath.retirementAge} → ${afterPath.retirementAge}`,
                      { icon: '🔄', duration: 5000, style: { background: '#112649', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' } }
                    );
                  }
                }
              } catch (e) {
                console.error('Path recalculation failed:', e);
              }
            }

            // Save to DB and State
            setData(newData);
            await saveUserData(newData);
          }
        }
      } catch (e) {
        // silently ignore fetch errors
      } finally {
        isPolling = false;
      }
    };

    const intervalId = setInterval(pollAdminEvents, 3000);
    return () => clearInterval(intervalId);
  }, [session, data]);
  // -------------------------


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActiveTab('dashboard');
    setData(defaultUserData);
    setDocs({ bank: null, portfolio: null, tax: null, other: null });
  };

  const handleLogin = (name: string, email: string) => {
    setUserName(name);
    setUserEmail(email);
  };

  // Loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 mb-4 shadow-lg animate-pulse-glow">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (!session) return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'toast-custom', duration: 3000 }} />
      <LoginPage onLogin={handleLogin} />
    </>
  );

  const renderSection = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardSection data={data} setData={setData} />;
      case 'documents': return <DocumentsSection setData={setData} onAnalysisComplete={() => setActiveTab('dashboard')} docs={docs} setDocs={setDocs} />;
      case 'profile': return <ProfileSection data={data} setData={setData} />;
      case 'health': return <HealthScoreSection data={data} setData={setData} />;
      case 'portfolio': return <PortfolioSection data={data} />;
      case 'incident': return <IncidentSection data={data} setData={setData} />;
      case 'scenario': return <ScenarioSection data={data} setData={setData} />;
      case 'paths': return <PathPlanningSection data={data} setData={setData} pathRecalcEvents={pathRecalcEvents} />;
      case 'alerts': return <MarketAlertsSection data={data} />;
      default: return <DashboardSection data={data} setData={setData} />;
    }
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#0F172A' }}>
      <Toaster position="top-right" toastOptions={{ className: 'toast-custom', duration: 3000 }} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: '#0B1D3A' }}>
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Finance<span className="text-orange-500">IQ</span></span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const active = activeTab === item.id;
            return (
              <button key={item.id}
                onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-orange-500/15 text-orange-400 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <item.icon className="w-4.5 h-4.5 shrink-0" />
                {item.label}
                {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500"></div>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userName}</p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors cursor-pointer" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center gap-3 p-4 border-b border-white/5" style={{ background: '#0B1D3A' }}>
          <button onClick={() => setSidebarOpen(true)} className="text-white cursor-pointer">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-white">Finance<span className="text-orange-500">IQ</span></span>
        </div>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto">

          {/* ──── PERSISTENT ADMIN ALERT BANNERS ──── */}
          {adminAlerts.length > 0 && (
            <div className="space-y-3 mb-6 animate-fadeIn">
              {adminAlerts.map(alert => {
                const colors = {
                  CRITICAL: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: 'text-red-400', icon: 'text-red-400', barColor: '#EF4444' },
                  HIGH: { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', text: 'text-orange-400', icon: 'text-orange-400', barColor: '#F97316' },
                  MEDIUM: { bg: 'rgba(234,179,8,0.12)', border: 'rgba(234,179,8,0.35)', text: 'text-yellow-400', icon: 'text-yellow-400', barColor: '#EAB308' },
                };
                const c = colors[alert.severity];
                return (
                  <div key={alert.id} className="rounded-xl overflow-hidden" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                    <div className="h-1" style={{ background: c.barColor }} />
                    <div className="px-5 py-4 flex items-start gap-4">
                      <div className={`mt-0.5 shrink-0 ${c.icon}`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs font-bold uppercase tracking-wider ${c.text}`}>{alert.severity}</span>
                          <span className="text-[10px] text-slate-500">{new Date(alert.timestamp).toLocaleTimeString('en-IN')}</span>
                        </div>
                        <h4 className={`font-bold text-sm ${c.text} mb-1`}>{alert.title}</h4>
                        <p className="text-sm text-slate-300 leading-relaxed">{alert.message}</p>
                      </div>
                      <button
                        onClick={() => setAdminAlerts(prev => prev.filter(a => a.id !== alert.id))}
                        className="text-slate-500 hover:text-white transition-colors shrink-0 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              {navItems.find(n => n.id === activeTab)?.label || 'Dashboard'}
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Last updated: {new Date(data.last_updated).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {renderSection()}
        </div>
      </main>
      <Chatbot />
    </div>
  );
}
