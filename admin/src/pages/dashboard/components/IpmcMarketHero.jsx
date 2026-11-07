import { useState, useRef, useMemo } from 'react';
import { ibShort, signedPct } from '../../../lib/format';
import { ArrowUpRight, ArrowDownRight, Radio, Activity, Zap, TrendingUp, BarChart2 } from 'lucide-react';

export default function IpmcMarketHero({ marketIndex, overview, companies = [] }) {
  const [scrubIndex, setScrubIndex] = useState(null);
  const [activeRange, setActiveRange] = useState('1D'); // '1D', '1W', '1M'
  const containerRef = useRef(null);

  const mkt = marketIndex || overview?.marketIndex || null;

  // Extract core points & stats
  const points = mkt?.points ? Number(mkt.points) : 7614.95;
  const changePctVal = mkt?.changePct ? Number(mkt.changePct) : 0;
  const changePtsVal = mkt?.changePts ? Number(mkt.changePts) : 0;
  const isIndexUp = changePctVal >= 0;

  // Historical intraday points
  const rawHistory = Array.isArray(mkt?.history) && mkt.history.length >= 2 ? mkt.history : [];
  
  // Synthesize realistic baseline points if history is empty
  const chartPoints = useMemo(() => {
    if (rawHistory.length >= 2) {
      return rawHistory.map((h, i) => ({
        time: h.time || `${9 + Math.floor(i / 6)}:${String((i % 6) * 10).padStart(2, '0')}`,
        points: Number(h.points) || points,
      }));
    }
    // Fallback baseline points
    const basePts = points - changePtsVal;
    const pts = [];
    const count = 36;
    for (let i = 0; i < count; i++) {
      const prog = i / (count - 1);
      const wave = Math.sin(prog * Math.PI * 2.5) * (changePtsVal * 0.35);
      const val = basePts + (changePtsVal * prog) + wave;
      const h = 9 + Math.floor((prog * 360) / 60);
      const m = Math.floor((prog * 360) % 60);
      pts.push({
        time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        points: Number(val.toFixed(2)),
      });
    }
    return pts;
  }, [rawHistory, points, changePtsVal]);

  // High, Low, Open & Prev Close
  const openPrice = Number(mkt?.open || mkt?.prevClose || (points - changePtsVal) || 7350);
  const dataValues = chartPoints.map((p) => p.points);
  const rawDataMin = Math.min(...dataValues, openPrice);
  const rawDataMax = Math.max(...dataValues, openPrice);

  // Anti-cliff spread clamp: never let spread drop below 30 points
  const spread = Math.max(30.0, rawDataMax - rawDataMin);
  const minVal = rawDataMin - spread * 0.16;
  const maxVal = rawDataMax + spread * 0.24;
  const range = maxVal - minVal || 1;

  const highPrice = Number(mkt?.high || rawDataMax);
  const lowPrice = Number(mkt?.low || rawDataMin);

  // Breadth calculation
  const breadthUp = mkt?.breadth?.up ?? companies.filter((c) => Number(c.current_price) > Number(c.prev_close || c.base_price || 0)).length;
  const breadthFlat = mkt?.breadth?.flat ?? companies.filter((c) => Number(c.current_price) === Number(c.prev_close || c.base_price || 0)).length;
  const breadthDown = mkt?.breadth?.down ?? companies.filter((c) => Number(c.current_price) < Number(c.prev_close || c.base_price || 0)).length;
  const totalBreadth = Math.max(1, breadthUp + breadthFlat + breadthDown);
  const pctUp = ((breadthUp / totalBreadth) * 100).toFixed(0);
  const pctFlat = ((breadthFlat / totalBreadth) * 100).toFixed(0);
  const pctDown = (100 - Number(pctUp) - Number(pctFlat)).toFixed(0);

  // Statistics (Foreign, Intraday, All Market)
  const stats = mkt?.stats || {};
  const totalTurnover = Number(stats.totalTurnoverIb || overview?.marketVolumeIb || 128450000000);
  const foreignBuy = Number(stats.foreignBuyIb || (totalTurnover * 0.52));
  const foreignSell = Number(stats.foreignSellIb || (totalTurnover * 0.48));
  const foreignNet = Number(stats.foreignNetIb !== undefined ? stats.foreignNetIb : (foreignBuy - foreignSell));
  const totalLots = Number(stats.totalLotsTraded || Math.round(totalTurnover / 3000));
  const tradeFreq = Number(stats.tradeFrequency || 99077);

  // Interactive scrubbing handler
  const handleMouseMove = (e) => {
    if (!containerRef.current || chartPoints.length < 2) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const idx = Math.round(pct * (chartPoints.length - 1));
    setScrubIndex(Math.max(0, Math.min(idx, chartPoints.length - 1)));
  };

  const handleTouchMove = (e) => {
    if (!containerRef.current || chartPoints.length < 2 || !e.touches[0]) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
    const pct = x / rect.width;
    const idx = Math.round(pct * (chartPoints.length - 1));
    setScrubIndex(Math.max(0, Math.min(idx, chartPoints.length - 1)));
  };

  const handleMouseLeave = () => {
    setScrubIndex(null);
  };

  // Active scrubbed data or latest data
  const activePoint = scrubIndex !== null && chartPoints[scrubIndex] ? chartPoints[scrubIndex] : null;
  const displayPoints = activePoint ? activePoint.points : points;
  const displayTime = activePoint ? activePoint.time : 'Sesi Live';
  const displayChangePts = activePoint ? displayPoints - openPrice : changePtsVal;
  const displayChangePct = openPrice > 0 ? (displayChangePts / openPrice) * 100 : changePctVal;
  const isDisplayUp = displayChangePct >= 0;

  // Chart Dimensions & Bezier Path Generation
  const svgWidth = 1000;
  const svgHeight = 200;
  const padBottom = 24;
  const padTop = 20;
  const chartHeight = svgHeight - padBottom - padTop;

  const coords = useMemo(() => {
    return chartPoints.map((p, idx) => {
      const x = (idx / (chartPoints.length - 1)) * svgWidth;
      const y = svgHeight - padBottom - ((p.points - minVal) / range) * chartHeight;
      return { x, y, points: p.points, time: p.time };
    });
  }, [chartPoints, minVal, range, chartHeight, svgWidth, svgHeight, padBottom]);

  // Find index of highest and lowest points for flag badges
  let highIdx = 0;
  let lowIdx = 0;
  coords.forEach((c, idx) => {
    if (c.points > coords[highIdx].points) highIdx = idx;
    if (c.points < coords[lowIdx].points) lowIdx = idx;
  });

  // Smooth Cubic Bezier Spline Path
  const { pathD, areaD } = useMemo(() => {
    if (coords.length < 2) return { pathD: '', areaD: '' };
    let d = `M ${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const cur = coords[i];
      const cX = (prev.x + cur.x) / 2;
      d += ` C ${cX.toFixed(1)},${prev.y.toFixed(1)} ${cX.toFixed(1)},${cur.y.toFixed(1)} ${cur.x.toFixed(1)},${cur.y.toFixed(1)}`;
    }
    const area = `${d} L ${coords[coords.length - 1].x.toFixed(1)},${svgHeight} L ${coords[0].x.toFixed(1)},${svgHeight} Z`;
    return { pathD: d, areaD: area };
  }, [coords, svgHeight]);

  // Baseline Y position
  const baselineY = svgHeight - padBottom - ((openPrice - minVal) / range) * chartHeight;
  const activeCoord = scrubIndex !== null && coords[scrubIndex] ? coords[scrubIndex] : null;

  const lineColor = isIndexUp ? '#10b981' : '#f43f5e';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-slate-700/80 shadow-2xl shadow-black/80 p-5 sm:p-6 backdrop-blur-xl">
      {/* Top Ambient Highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-500 opacity-90" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP HEADER: Title, Live Status, Big Index Points & Breadth Badges */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-800/80">
        <div>
          {/* Beacon + Category */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-400 uppercase">
              BURSA EFEK CAPITAL FEDERATION • SESI LIVE
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/15 border border-sky-400/40 text-sky-300 font-extrabold tracking-wide">
              REAL-TIME 24/7
            </span>
          </div>

          {/* Index Title & Big Live Point display */}
          <div className="flex items-baseline gap-3 sm:gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>IPMC Composite Index</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
                CFX-100
              </span>
            </h2>

            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white drop-shadow-md">
                {displayPoints.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>

              <span
                className={`text-xs sm:text-sm font-mono font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm transition-all ${
                  isDisplayUp
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {isDisplayUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {displayChangePts >= 0 ? '+' : ''}
                {displayChangePts.toFixed(2)} ({signedPct(displayChangePct)})
              </span>
            </div>
          </div>
        </div>

        {/* Right Header: Breadth Distribution Badges & Mini Bar + Timeframe Selector */}
        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Timeframe Chips */}
            <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 text-[11px] font-mono">
              {['1D', '1W', '1M'].map((rangeKey) => (
                <button
                  key={rangeKey}
                  type="button"
                  onClick={() => setActiveRange(rangeKey)}
                  className={`px-2.5 py-0.5 rounded-md transition-all font-bold ${
                    activeRange === rangeKey
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {rangeKey}
                </button>
              ))}
            </div>

            {/* Breadth pills */}
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shadow-sm flex items-center gap-1">
                ▲ {breadthUp} <span className="hidden sm:inline font-normal text-[10px] text-emerald-300">Naik</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300 shadow-sm flex items-center gap-1">
                ■ {breadthFlat} <span className="hidden sm:inline font-normal text-[10px] text-slate-400">Tetap</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-sm flex items-center gap-1">
                ▼ {breadthDown} <span className="hidden sm:inline font-normal text-[10px] text-rose-300">Turun</span>
              </span>
            </div>
          </div>

          {/* Segmented Breadth Distribution Bar */}
          <div className="w-full sm:w-64 h-2 rounded-full overflow-hidden flex bg-slate-800/90 border border-slate-700/60 shadow-inner">
            <div style={{ width: `${pctUp}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`${breadthUp} Emiten Naik (${pctUp}%)`} />
            <div style={{ width: `${pctFlat}%` }} className="bg-slate-500 h-full transition-all duration-500" title={`${breadthFlat} Emiten Tetap (${pctFlat}%)`} />
            <div style={{ width: `${pctDown}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`${breadthDown} Emiten Turun (${pctDown}%)`} />
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Distribusi 363 Emiten • Naik {pctUp}% • Tetap {pctFlat}% • Turun {pctDown}%
          </span>
        </div>
      </div>

      {/* 2. MAIN INTERACTIVE INTRADAY SPLINE CHART */}
      <div className="relative z-10 my-4">
        {/* Section title & baseline badge */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={14} className="text-sky-400" />
              Grafik Intraday Bursa Realtime (50 Tick)
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500">
              • Arahkan kursor / sentuh layar untuk memeriksa titik harga
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-xs font-mono">
              Harga Acuan (Prev/Open): <strong className="text-slate-200">{openPrice.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Interactive Chart Container */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseLeave}
          className="relative w-full h-52 sm:h-56 cursor-crosshair rounded-xl overflow-hidden bg-slate-950/60 border border-slate-800/90 p-1 select-none shadow-inner"
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id="ipmcAreaGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.32" />
                <stop offset="80%" stopColor={lineColor} stopOpacity="0.04" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines */}
            {[0.25, 0.5, 0.75].map((pct, i) => {
              const yGrid = padTop + chartHeight * pct;
              return (
                <line
                  key={i}
                  x1="0"
                  y1={yGrid}
                  x2={svgWidth}
                  y2={yGrid}
                  stroke="#1e293b"
                  strokeWidth="0.8"
                  strokeDasharray="4 4"
                />
              );
            })}

            {/* Reference Baseline (Dashed Line for Sesi Pembukaan) */}
            <line
              x1="0"
              y1={baselineY}
              x2={svgWidth}
              y2={baselineY}
              stroke="#475569"
              strokeWidth="1.2"
              strokeDasharray="5 5"
              strokeOpacity="0.75"
            />

            {/* Area Fill Gradient */}
            {areaD && <path d={areaD} fill="url(#ipmcAreaGradV2)" />}

            {/* Neon Glow Under-Pass */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth="5"
                strokeOpacity="0.35"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Crisp Foreground Spline */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={lineColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Reference baseline badge label on the right */}
          <div
            className="absolute right-2 pointer-events-none px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700/80 text-[9.5px] font-mono text-slate-400 whitespace-nowrap"
            style={{
              top: `${(baselineY / svgHeight) * 100}%`,
              transform: 'translateY(-50%)',
            }}
          >
            Ref: {openPrice.toFixed(1)}
          </div>

          {/* High Flag Badge */}
          {coords[highIdx] && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-md bg-slate-900/95 border border-emerald-500/50 text-[10px] font-mono font-bold text-emerald-400 shadow-lg shadow-black/80 whitespace-nowrap flex items-center gap-1"
              style={{
                left: `${(coords[highIdx].x / svgWidth) * 100}%`,
                top: `${(coords[highIdx].y / svgHeight) * 100}%`,
                transform: 'translate(-50%, -125%)',
              }}
            >
              <span>▲ H:</span> <span>{highPrice.toFixed(1)}</span>
            </div>
          )}

          {/* Low Flag Badge */}
          {coords[lowIdx] && (
            <div
              className="absolute pointer-events-none px-2 py-0.5 rounded-md bg-slate-900/95 border border-rose-500/50 text-[10px] font-mono font-bold text-rose-400 shadow-lg shadow-black/80 whitespace-nowrap flex items-center gap-1"
              style={{
                left: `${(coords[lowIdx].x / svgWidth) * 100}%`,
                top: `${(coords[lowIdx].y / svgHeight) * 100}%`,
                transform: 'translate(-50%, 25%)',
              }}
            >
              <span>▼ L:</span> <span>{lowPrice.toFixed(1)}</span>
            </div>
          )}

          {/* Interactive Scrubbing Crosshair Guideline & Snapping Neon Dot */}
          {activeCoord && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-sky-400 z-10 transition-none"
              style={{ left: `${(activeCoord.x / svgWidth) * 100}%` }}
            >
              {/* Outer pulsing ring */}
              <div
                className="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-sky-400/20 animate-ping"
                style={{ top: `${(activeCoord.y / svgHeight) * 100}%` }}
              />
              {/* Inner glowing snap dot */}
              <div
                className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full bg-sky-400 border-2 border-slate-950 shadow-[0_0_12px_#38bdf8]"
                style={{ top: `${(activeCoord.y / svgHeight) * 100}%` }}
              />
            </div>
          )}

          {/* Floating Glass Tooltip on Hover / Touch */}
          {activeCoord && (
            <div
              className="absolute pointer-events-none z-30 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-sky-400/90 text-xs font-mono shadow-2xl backdrop-blur-md whitespace-nowrap transition-none"
              style={{
                left: `${(activeCoord.x / svgWidth) * 100}%`,
                top: 10,
                transform: activeCoord.x > svgWidth * 0.7 ? 'translateX(-105%)' : 'translateX(10%)',
              }}
            >
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">
                  {displayPoints.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
                </span>
                <span className={`text-[11px] font-bold ${isDisplayUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isDisplayUp ? '▲' : '▼'} {displayChangePts >= 0 ? '+' : ''}{displayChangePts.toFixed(2)} ({signedPct(displayChangePct)})
                </span>
              </div>
              <div className="text-[10.5px] text-sky-300 font-semibold mt-0.5 flex items-center gap-1.5">
                <span>⏱️ Pukul {displayTime} WIB</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Sesi Intraday</span>
              </div>
            </div>
          )}
        </div>

        {/* Time Axis Labels along the bottom */}
        <div className="flex items-center justify-between px-2 pt-2 text-[10.5px] font-mono text-slate-500 font-semibold">
          <span>{chartPoints[0]?.time || '09:00'} WIB</span>
          <span>{chartPoints[Math.floor(chartPoints.length * 0.33)]?.time || '11:30'} WIB</span>
          <span>{chartPoints[Math.floor(chartPoints.length * 0.66)]?.time || '13:30'} WIB</span>
          <span className="text-sky-400 font-bold">{chartPoints[chartPoints.length - 1]?.time || '16:00'} WIB (Live)</span>
        </div>
      </div>

      {/* 3. BOTTOM ROW: 3 REAL-TIME STATISTIC PANELS (1:1 DENGAN APK FLUTTER) */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-slate-800/80">
        {/* Panel 1: Foreign Flow (Arus Modal Asing) */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all font-mono space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Foreign (Modal Asing)
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Konsorsium Global</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Foreign Buy:</span>
              <span className="text-emerald-400 font-semibold">{ibShort(foreignBuy)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Foreign Sell:</span>
              <span className="text-rose-400 font-semibold">{ibShort(foreignSell)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 font-bold">
              <span className="text-slate-300">Net Foreign Flow:</span>
              <span className={foreignNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {foreignNet >= 0 ? '+' : ''}{ibShort(foreignNet)}
              </span>
            </div>
          </div>
        </div>

        {/* Panel 2: Intraday Range (Rentang Sesi Hari Ini) */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all font-mono space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              Intraday (Rentang Sesi)
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">CFX-100 Acuan</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Opening (Buka):</span>
              <span className="text-slate-200 font-semibold">{openPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">High (Tertinggi):</span>
              <span className="text-emerald-400 font-semibold">{highPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 font-bold">
              <span className="text-slate-400">Low (Terendah):</span>
              <span className="text-rose-400 font-semibold">{lowPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Panel 3: All Market Activity (Aktivitas Transaksi Bursa) */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700/80 transition-all font-mono space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              All Market (Aktivitas)
            </span>
            <span className="text-[10px] text-slate-500 font-semibold uppercase">Pasar Reguler</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Volume Transaksi:</span>
              <span className="text-slate-200 font-semibold">{(totalLots / 1000000).toFixed(2).replace('.', ',')} M Lot</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Turnover Nilai:</span>
              <span className="text-amber-400 font-bold">{ibShort(totalTurnover)}</span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-800/80 font-bold">
              <span className="text-slate-400">Frekuensi Order:</span>
              <span className="text-sky-300 font-semibold">{tradeFreq.toLocaleString('id-ID')}x order</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
