import { useState, useEffect, useCallback } from 'react';
import { Activity, Wifi, RefreshCw, Zap, ArrowDown, ArrowUp, PackageOpen } from 'lucide-react';
import { marketAlerts, UserData } from './data';

const API_BASE = 'http://localhost:8000';

interface TickerState {
  ticker: string;
  ticker_name: string;
  current_price: number | null;
  baseline_price: number | null;
  percentage_change: number;
  last_updated: string | null;
  status: string;
}

interface MarketEvent {
  event_type: string;
  severity: string;
  trigger: string;
  ticker: string;
  asset_name: string;
  user_id: string;
  current_price: number | null;
  percentage_change: number;
  timestamp: string;
  xai_explanation: string;
  recommended_path_shift: string | null;
  path_auto_recalculated: boolean;
  recommended_actions: string[];
  model: string;
  confidence: string;
}

interface PollerMeta {
  status: string;
  poll_count: number;
  last_updated: string | null;
  last_error: string | null;
  total_unique_tickers: number;
}

interface UserMarketState {
  user_id: string;
  registered: boolean;
  tickers: string[];
  ticker_states: TickerState[];
  event_log: MarketEvent[];
  poller: PollerMeta;
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'text-red-400';
    case 'HIGH': return 'text-orange-400';
    case 'MEDIUM': return 'text-yellow-400';
    default: return 'text-slate-400';
  }
}

function severityBgClass(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-500/15 border-red-500/30';
    case 'HIGH': return 'bg-orange-500/15 border-orange-500/30';
    case 'MEDIUM': return 'bg-yellow-500/15 border-yellow-500/30';
    default: return 'bg-white/5 border-white/10';
  }
}

export default function MarketAlertsSection({ data }: { data: UserData }) {
  const [marketState, setMarketState] = useState<UserMarketState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);


  // Register user's tickers on mount / when data changes
  useEffect(() => {
    const registerTickers = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/start-monitoring`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user_id,
            assets_portfolio: data.assets_portfolio.map(a => ({
              ticker: a.ticker,
              asset_name: a.asset_name,
              category: a.category,
            })),
          }),
        });
        if (res.ok) {
          setRegistered(true);
        }
      } catch (err) {
        console.error('Failed to register tickers:', err);
      }
    };

    if (data.assets_portfolio.length > 0) {
      registerTickers();
    }
  }, [data.user_id, data.assets_portfolio]);

  // Fetch market state
  const fetchMarketState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/market-state/${data.user_id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const state: UserMarketState = await res.json();
      setMarketState(state);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch market state');
    } finally {
      setLoading(false);
    }
  }, [data.user_id]);

  // Auto-poll every 30 seconds
  useEffect(() => {
    if (!registered) return;
    fetchMarketState();
    const interval = setInterval(fetchMarketState, 30_000);
    return () => clearInterval(interval);
  }, [registered, fetchMarketState]);

  const hasAssets = data.assets_portfolio.some(a => a.ticker !== 'NONE' && a.ticker !== '');
  const pollerOnline = marketState?.poller?.status === 'POLLING';

  return (
    <div className="animate-fadeIn space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Market Intelligence Alerts</h2>
        <p className="text-sm text-slate-400">Real-time monitoring of your portfolio assets</p>
      </div>

      {/* ──── NO ASSETS STATE ──── */}
      {!hasAssets && (
        <div className="flex flex-col items-center justify-center p-12 text-center glass rounded-xl border border-white/10">
          <div className="w-16 h-16 bg-slate-500/20 text-slate-400 rounded-full flex items-center justify-center mb-6">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Tradable Assets</h3>
          <p className="text-slate-400 max-w-md">
            Your portfolio doesn't contain any market-tradable assets to monitor.
            Add assets with valid ticker symbols in your Profile to enable real-time monitoring.
          </p>
        </div>
      )}

      {/* ──── PER-TICKER PULSE CARDS ──── */}
      {hasAssets && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-400" />
              Live Asset Monitor
              {pollerOnline && (
                <span className="flex items-center gap-1 text-xs text-green-400 font-normal ml-2">
                  <Wifi className="w-3 h-3" /> Live
                </span>
              )}
            </h3>
            <button onClick={fetchMarketState} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading && !marketState ? (
            <div className="flex items-center justify-center py-8 glass rounded-xl">
              <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <span className="ml-3 text-sm text-slate-400">Connecting to market feed...</span>
            </div>
          ) : error && !marketState ? (
            <div className="text-center py-6 glass rounded-xl">
              <p className="text-sm text-red-400">Failed to connect: {error}</p>
              <p className="text-xs text-slate-500 mt-1">Is the backend running on port 8000?</p>
            </div>
          ) : !marketState?.registered ? (
            <div className="text-center py-6 glass rounded-xl">
              <p className="text-sm text-slate-400">Registering tickers...</p>
            </div>
          ) : marketState.ticker_states.length === 0 ? (
            <div className="text-center py-6 glass rounded-xl">
              <p className="text-sm text-slate-400">No valid tickers found in your portfolio.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {marketState.ticker_states.map((ts) => {
                const isPositive = ts.percentage_change >= 0;
                return (
                  <div key={ts.ticker} className="rounded-xl overflow-hidden" style={{ background: 'rgba(17, 38, 73, 0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className={`h-1 ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-bold text-white">{ts.ticker_name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">{ts.ticker}</span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          ts.status === 'LIVE' ? 'bg-green-500/15 text-green-400' :
                          ts.status === 'GOD_MODE' ? 'bg-purple-500/15 text-purple-400' :
                          ts.status === 'MARKET_CLOSED' ? 'bg-yellow-500/15 text-yellow-400' :
                          'bg-white/5 text-slate-500'
                        }`}>
                          {ts.status}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Price</span>
                          <span className="text-white font-medium">
                            {ts.current_price != null ? `₹${ts.current_price.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Open</span>
                          <span className="text-white font-medium">
                            {ts.baseline_price != null ? `₹${ts.baseline_price.toLocaleString('en-IN')}` : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Change</span>
                          <span className={`font-bold flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                            {isPositive ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                            {ts.percentage_change >= 0 ? '+' : ''}{ts.percentage_change.toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      {ts.last_updated && (
                        <p className="text-[10px] text-slate-600 mt-3">
                          {new Date(ts.last_updated).toLocaleTimeString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──── TRIGGERED EVENTS LOG ──── */}
      {marketState && marketState.event_log.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-400" />
            Auto Path Recalculations
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">{marketState.event_log.length}</span>
          </h3>
          <div className="space-y-3">
            {[...marketState.event_log].reverse().map((evt, i) => (
              <div key={i} className={`rounded-xl p-5 border ${severityBgClass(evt.severity)}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold uppercase tracking-wider ${severityColor(evt.severity)}`}>
                      {evt.event_type}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${severityColor(evt.severity)} bg-white/5`}>
                      {evt.severity}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
                      {evt.ticker}
                    </span>
                    {evt.path_auto_recalculated && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-medium">
                        PATH RECALCULATED
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{new Date(evt.timestamp).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">{evt.xai_explanation}</p>

                {evt.recommended_path_shift && (
                  <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-white/[0.03]">
                    <span className="text-xs text-slate-500">Auto-switched to:</span>
                    <span className="text-xs font-bold text-white capitalize">{evt.recommended_path_shift}</span>
                  </div>
                )}

                {evt.recommended_actions.length > 0 && (
                  <ul className="space-y-1.5">
                    {evt.recommended_actions.map((action, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-slate-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5">
                  <span className="text-[10px] text-slate-600">Model: {evt.model}</span>
                  <span className="text-[10px] text-slate-600">|</span>
                  <span className="text-[10px] text-slate-600">Confidence: {evt.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* ──── STATIC ALERTS (existing) ──── */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Portfolio-Specific Alerts</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {marketAlerts.map((a, i) => (
            <div key={i} className="glass rounded-xl p-5 card-hover" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex items-start gap-4">
                <div className="text-2xl shrink-0 mt-1">{a.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${a.badge}`}>{a.type}</span>
                    <span className="text-xs text-slate-500">{a.time}</span>
                  </div>
                  <h4 className="font-semibold text-white text-sm mb-1.5 leading-snug">{a.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{a.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
