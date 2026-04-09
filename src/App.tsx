import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import {
  LayoutDashboard, Heart, BarChart3, Zap, FlaskConical,
  Map, Bell, LogOut, TrendingUp, Menu, Folder, UserCircle
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

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        setUserName(currentSession.user.user_metadata?.full_name || 'User');
        setUserEmail(currentSession.user.email || 'user@financeiq.com');
        try {
          // Import here to avoid circular dependency issues at the top level if they exist, or import at top
          // Wait, I should import fetchUserData at the top.
          const { fetchUserData } = await import('./lib/userDataService');
          const userData = await fetchUserData(currentSession.user.id);
          setData(userData);
        } catch(e) {
          console.error("Failed to fetch data on init:", e);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        setUserName(newSession.user.user_metadata?.full_name || newSession.user.user_metadata?.name || 'User');
        setUserEmail(newSession.user.email || 'user@financeiq.com');
        try {
          const { fetchUserData } = await import('./lib/userDataService');
          const userData = await fetchUserData(newSession.user.id);
          setData(userData);
        } catch(e) {
           console.error("Failed to fetch data on auth change:", e);
        }
      } else {
        setData(defaultUserData);
        setDocs({ bank: null, portfolio: null, tax: null, other: null });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
      case 'paths': return <PathPlanningSection data={data} setData={setData} />;
      case 'alerts': return <MarketAlertsSection />;
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
    </div>
  );
}
