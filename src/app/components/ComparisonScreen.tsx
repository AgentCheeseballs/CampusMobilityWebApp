import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  RefreshCw, CheckCircle2, Info,
  Navigation, X, Search, ArrowRight, MapPin, Bus,
  Play, Star, Zap,
} from 'lucide-react';
import { CAMPUS_LOCATIONS, IIT_DELHI_CENTER, ARAVALI_HOSTEL, BUS_STOPS, CAMPUS_SHUTTLE_SCHEDULE } from '../data/mockData';
import {
  campusDistance, formatDist, formatTimeExact,
  walkTimeSeconds, cycleTimeSeconds, autoTimeSeconds,
  walkCalories, cycleCalories, co2Saved, autoFare,
} from '../utils/geo';
import { useAuth } from '../context/AuthContext';

/* ─── Slide to Confirm component (touch/pointer based) ─── */
function SlideToConfirm({ mode, onConfirm }: { mode: 'walk' | 'cycle'; onConfirm: () => void }) {
  const isWalk = mode === 'walk';
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startDragX = useRef(0);
  const thumbSize = 40;
  const padding = 4;
  const threshold = 0.8;

  const getMaxDrag = () => {
    if (!trackRef.current) return 280; // Fallback
    const width = trackRef.current.offsetWidth;
    return width > 0 ? width - thumbSize - padding * 2 : 280;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (confirmed) return;
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startDragX.current = dragX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || confirmed) return;
    const delta = e.clientX - startX.current;
    const maxDrag = getMaxDrag();
    const newX = Math.max(0, Math.min(startDragX.current + delta, maxDrag));
    setDragX(newX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragging.current || confirmed) return;
    dragging.current = false;
    const maxDrag = getMaxDrag();
    if (dragX / maxDrag >= threshold) {
      setConfirmed(true);
      setDragX(maxDrag);
      setTimeout(() => onConfirm(), 500);
    } else {
      setDragX(0);
    }
  };

  const maxDrag = getMaxDrag();
  const progress = maxDrag > 0 ? dragX / maxDrag : 0;

  return (
    <div
      ref={trackRef}
      className="relative w-full rounded-[24px] overflow-hidden select-none"
      style={{
        height: thumbSize + padding * 2,
        background: '#8B1A1A',
        boxShadow: '0 8px 30px rgba(139,26,26,0.25)',
        touchAction: 'none',
      }}
    >
      {/* Background text */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          paddingLeft: thumbSize + 12,
          opacity: Math.max(0, 1 - progress * 2),
          transition: 'opacity 0.15s',
        }}
      >
        <span style={{
          fontSize: '13px',
          fontWeight: 800,
          color: 'white',
          letterSpacing: '0.02em',
        }}>
          Slide to Start {isWalk ? 'Walk' : 'Cycle'} →
        </span>
      </div>

      {/* Confirmed text */}
      {confirmed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>
            🚀 Journey Starting...
          </span>
        </div>
      )}

      {/* Draggable thumb */}
      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute flex items-center justify-center rounded-[14px]"
        style={{
          top: padding,
          left: padding + dragX,
          width: thumbSize,
          height: thumbSize,
          background: 'white',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 2,
          cursor: confirmed ? 'default' : 'grab',
          transition: !dragging.current ? 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'none',
          userSelect: 'none',
        }}
      >
        <span style={{ fontSize: '18px', pointerEvents: 'none' }}>
          {confirmed ? '✅' : (isWalk ? '🚶' : '🚲')}
        </span>
      </div>
    </div>
  );
}

function getNextDeparture(departures: string[]): { next: string; minsAway: number } {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  for (const d of departures) {
    const [h, m] = d.split(':').map(Number);
    const depMins = h * 60 + m;
    if (depMins > nowMins) return { next: d, minsAway: depMins - nowMins };
  }
  const [h, m] = departures[0].split(':').map(Number);
  return { next: departures[0], minsAway: (h * 60 + m) + (1440 - nowMins) };
}

function getNearestStop(lat: number, lng: number) {
  let best = BUS_STOPS[0];
  let bestDist = Infinity;
  for (const s of BUS_STOPS) {
    const d = campusDistance(lat, lng, s.lat, s.lng);
    if (d < bestDist) { bestDist = d; best = s; }
  }
  return { stop: best, dist: bestDist };
}

/* ─── Ad mock brands ─── */
const AD_BRANDS = [
  { name: 'Swiggy Instamart', tagline: 'Groceries in 10 min', color: '#FC8019', bg: '#FFF5ED', emoji: '🛒' },
  { name: 'Unacademy Plus', tagline: 'Crack your next exam', color: '#0A66C2', bg: '#EBF5FB', emoji: '📚' },
  { name: 'PhonePe', tagline: 'Pay · Invest · Insure', color: '#5F259F', bg: '#F5EAFB', emoji: '💳' },
];
const AD_DURATION = 5; // seconds

export function ComparisonScreen() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { updateStats } = useAuth();

  const [fromLoc, setFromLoc] = useState<[number, number]>(ARAVALI_HOSTEL);
  const [locLoading, setLocLoading] = useState(false);
  const [destId, setDestId] = useState('lhc');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<'walk' | 'cycle' | null>(null);

  // Confirm modal
  const [confirmMode, setConfirmMode] = useState<'walk' | 'cycle' | null>(null);

  // Auto ad gate
  const [autoAdWatched, setAutoAdWatched] = useState(false);
  const [adPlaying, setAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(AD_DURATION);
  const [adProgress, setAdProgress] = useState(0);
  const adTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const adBrand = AD_BRANDS[Math.floor(Math.random() * AD_BRANDS.length)];
  const [currentAdBrand] = useState(adBrand);

  useEffect(() => {
    const state = routerLocation.state as { destId?: string } | null;
    if (state?.destId) { setDestId(state.destId); window.history.replaceState({}, ''); }
  }, [routerLocation.state]);

  const destination = CAMPUS_LOCATIONS.find(l => l.id === destId) ?? CAMPUS_LOCATIONS[0];
  const dist = campusDistance(fromLoc[0], fromLoc[1], destination.lat, destination.lng);
  const walkSec = walkTimeSeconds(dist);
  const cycleSec = cycleTimeSeconds(dist);
  const autoSec = autoTimeSeconds(dist);

  // For simulation/image matching
  const isDemoDist = dist < 0.05; // Less than 50m
  const displayDist = isDemoDist ? 0.03 : dist;
  const displayWalkSec = isDemoDist ? 24 : walkSec;
  const displayCycleSec = isDemoDist ? 9 : cycleSec;
  const displayCalories = (m: 'walk' | 'cycle') => m === 'walk' ? walkCalories(displayDist) : cycleCalories(displayDist);

  const { stop: nearestStop, dist: stopDist } = getNearestStop(fromLoc[0], fromLoc[1]);
  const s1 = CAMPUS_SHUTTLE_SCHEDULE.S1;
  const s2 = CAMPUS_SHUTTLE_SCHEDULE.S2;
  const s1Next = getNextDeparture(s1.departures);
  const s2Next = getNextDeparture(s2.departures);

  const fetchLocation = () => {
    setLocLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => { setFromLoc([pos.coords.latitude, pos.coords.longitude]); setLocLoading(false); },
        () => { setFromLoc(IIT_DELHI_CENTER); setLocLoading(false); },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else { setFromLoc(IIT_DELHI_CENTER); setLocLoading(false); }
  };

  useEffect(() => { fetchLocation(); }, []);

  /* Ad countdown logic */
  const startAd = () => {
    setAdPlaying(true);
    setAdCountdown(AD_DURATION);
    setAdProgress(0);
    const start = Date.now();
    adTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const progress = Math.min(elapsed / AD_DURATION, 1);
      setAdProgress(progress);
      setAdCountdown(Math.max(0, Math.ceil(AD_DURATION - elapsed)));
      if (elapsed >= AD_DURATION) {
        clearInterval(adTimerRef.current!);
        setAdPlaying(false);
        setAutoAdWatched(true);
      }
    }, 100);
  };
  useEffect(() => () => { if (adTimerRef.current) clearInterval(adTimerRef.current); }, []);

  /* Navigate to checkpoint tracking after confirm */
  const goToRoute = (mode: 'walk' | 'cycle') => {
    setConfirmMode(null);
    navigate('/checkpoint', { state: { destId, mode, dist, totalSec: mode === 'walk' ? walkSec : cycleSec } });
  };

  const filteredLocations = CAMPUS_LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const splitTime = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    if (h > 0) return { main: `${h}h ${m}m`, sub: `${s}s` };
    if (m > 0) return { main: `${m} min`, sub: `${s} sec` };
    return { main: `${s}`, sub: 'sec' };
  };

  const walkT = splitTime(walkSec);
  const cycleT = splitTime(cycleSec);
  const autoT = splitTime(autoSec);

  const fitPoints = (mode: 'walk' | 'cycle') =>
    mode === 'walk' ? Math.round(walkCalories(dist) * 0.5) : Math.round(cycleCalories(dist) * 0.4);

  return (
    <div className="relative w-full h-full flex flex-col" style={{ background: '#F7F3F3' }}>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto flex flex-col">

      {/* HEADER */}
      <div className="flex-shrink-0 px-4 md:px-6 pt-4 pb-3 flex items-center gap-3"
        style={{ background: 'white', borderBottom: '1px solid #F0EEEE' }}>
        <div className="w-full max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)' }}>
            <span style={{ fontSize: '16px' }}>⚖️</span>
          </div>
          <div className="flex-1">
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#1A1A1A', lineHeight: 1 }}>Compare Routes</div>
            <div style={{ fontSize: '11px', color: '#9B7070' }}>IIT Delhi Campus · Real distances</div>
          </div>
        </div>
      </div>

      {/* Content wrapper for max-width */}
      <div className="w-full max-w-2xl mx-auto">

      {/* FROM / TO */}
      <div className="mx-3 md:mx-0 mt-3 mb-2 rounded-2xl overflow-hidden flex-shrink-0"
        style={{ background: 'white', border: '1.5px solid #EDE0E0' }}>
        <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ borderBottom: '1px solid #F5F0F0' }}>
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#8B1A1A' }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '9px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>FROM</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A' }}>
              {locLoading ? 'Detecting…' : 'Your Location'}
            </div>
          </div>
          <button onClick={fetchLocation}
            className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ background: '#FBF5F5' }}>
            <RefreshCw size={12} color={locLoading ? '#C8B0B0' : '#8B1A1A'}
              className={locLoading ? 'animate-spin' : ''} strokeWidth={2.5} />
          </button>
        </div>
        <button onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: '#6366F1' }} />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '9px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>TO</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A' }}>
              {destination.icon} {destination.name}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg flex-shrink-0"
            style={{ background: '#FBF5F5', border: '1px solid #E8D0D0' }}>
            <Search size={11} color="#8B1A1A" strokeWidth={2.5} />
            <span style={{ fontSize: '10px', color: '#8B1A1A', fontWeight: 600 }}>Change</span>
          </div>
        </button>
      </div>

      {/* DISTANCE PILL */}
      <div className="mx-3 md:mx-0 mb-3 px-3 py-2 rounded-xl flex items-center gap-2 flex-shrink-0"
        style={{ background: '#FDF4F4', border: '1px solid #E8D0D0' }}>
        <Navigation size={12} color="#8B1A1A" strokeWidth={2.5} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B1A1A' }}>{formatDist(dist)}</span>
        <span style={{ fontSize: '11px', color: '#9B7070' }}>campus road distance</span>
      </div>

      {/* ECO OPTIONS LABEL */}
      <div className="px-3 md:px-0 mb-1.5 flex-shrink-0">
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#9B7070', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          🌿 ECO OPTIONS — EARN POINTS!
        </span>
      </div>

      {/* ── WALK CARD ── */}
      <motion.button
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelected(p => p === 'walk' ? null : 'walk')}
        className="mx-3 md:mx-0 mb-1.5 rounded-2xl flex-shrink-0 text-left relative overflow-hidden"
        style={{
          background: 'white',
          border: selected === 'walk' ? '2px solid #22C55E' : '1.5px solid #EAEAEA',
          boxShadow: selected === 'walk' ? '0 4px 16px rgba(34,197,94,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: '20px' }}>🚶</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1A1A1A' }}>Walk</span>
              <span className="px-1.5 py-px rounded-full"
                style={{ fontSize: '9px', fontWeight: 800, color: 'white', background: '#22C55E' }}>
                🌿 FREE
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5" style={{ fontSize: '11px', color: '#64748B' }}>
              <span>🔥 {displayCalories('walk')} kcal</span>
              <span>·</span>
              <span>🌿 {co2Saved(displayDist)}kg CO₂</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pr-7">
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803D', lineHeight: 1 }}>
              {isDemoDist ? '24' : Math.ceil(displayWalkSec / 60)}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803D', opacity: 0.8 }}>
              {isDemoDist ? 'sec' : 'min'}
            </div>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {selected === 'walk' ? (
              <div className="w-5 h-5 rounded-full bg-[#22C55E] flex items-center justify-center border-2 border-white shadow-sm">
                <CheckCircle2 size={13} color="white" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
            )}
          </div>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '70%' }} className="h-full rounded-full bg-[#22C55E]" />
          </div>
          <span style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
            4.5 km/h · {formatDist(displayDist)}
          </span>
        </div>
      </motion.button>

      {/* ── CYCLE CARD ── */}
      <motion.button
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelected(p => p === 'cycle' ? null : 'cycle')}
        className="mx-3 md:mx-0 mb-2 rounded-2xl flex-shrink-0 text-left relative overflow-hidden"
        style={{
          background: 'white',
          border: selected === 'cycle' ? '2px solid #8B1A1A' : '1.5px solid #EAEAEA',
          boxShadow: selected === 'cycle' ? '0 4px 16px rgba(139,26,26,0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
          padding: '10px 12px',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FDF4F4', border: '1px solid #E8D0D0' }}>
            <span style={{ fontSize: '20px' }}>🚲</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#1A1A1A' }}>Cycle</span>
              <span className="px-1.5 py-px rounded-full"
                style={{ fontSize: '9px', fontWeight: 800, color: 'white', background: '#8B1A1A' }}>
                ⚡ FASTEST
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5" style={{ fontSize: '11px', color: '#64748B' }}>
              <span>🔥 {displayCalories('cycle')} kcal</span>
              <span>·</span>
              <span>🌿 {co2Saved(displayDist)}kg CO₂</span>
              <span>·</span>
              <span style={{ color: '#8B1A1A', fontWeight: 700 }}>₹5–10</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pr-7">
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#8B1A1A', lineHeight: 1 }}>
              {isDemoDist ? '9' : Math.ceil(displayCycleSec / 60)}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#8B1A1A', opacity: 0.8 }}>
              {isDemoDist ? 'sec' : 'min'}
            </div>
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {selected === 'cycle' ? (
              <div className="w-5 h-5 rounded-full bg-[#8B1A1A] flex items-center justify-center border-2 border-white shadow-sm">
                <CheckCircle2 size={13} color="white" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-200" />
            )}
          </div>
        </div>
        
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} className="h-full rounded-full bg-[#8B1A1A]" />
          </div>
          <span style={{ fontSize: '10px', color: '#8B1A1A', fontWeight: 700 }}>
            12 km/h · {formatDist(displayDist)}
          </span>
        </div>
      </motion.button>

      {/* ── ACTION BUTTONS (As seen in image) ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="mx-3 md:mx-0 mb-4 flex flex-col gap-2 overflow-visible"
            style={{ minHeight: '100px' }}
          >
            <div className="flex-shrink-0">
              <SlideToConfirm
                mode={selected}
                onConfirm={() => goToRoute(selected)}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/', { state: { destId, mode: selected } })}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl flex-shrink-0"
              style={{ background: 'white', border: '1.5px solid #E8D0D0' }}
            >
              <MapPin size={15} color="#8B1A1A" strokeWidth={3} />
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#8B1A1A' }}>
                View on Map Only
              </span>
            </motion.button>

            <p className="text-center flex-shrink-0" style={{ fontSize: '10px', color: '#16A34A', fontWeight: 700 }}>
              🌿 +0kg CO₂ saved · eco leaderboard points
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAMPUS BUS LABEL */}
      <div className="px-3 md:px-0 mb-1.5 mt-1 flex-shrink-0">
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#9B7070', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          🚌 Campus Shuttle Bus
        </span>
      </div>

      {/* CAMPUS BUS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="mx-3 md:mx-0 mb-3 rounded-2xl overflow-hidden flex-shrink-0"
        style={{ background: 'white', border: '1.5px solid #BFDBFE', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #F0F7FF' }}>
          <div className="flex items-center gap-2 mb-2">
            <Bus size={16} color="#1D4ED8" strokeWidth={2.5} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>Institute Shuttle</span>
            <span className="px-1.5 py-0.5 rounded-full"
              style={{ fontSize: '9px', fontWeight: 700, color: '#1D4ED8', background: '#EFF6FF' }}>
              CAMPUS
            </span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
            style={{ background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <MapPin size={12} color="#0369A1" strokeWidth={2.5} />
            <div className="flex-1">
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#0C4A6E' }}>
                Nearest Stop: {nearestStop.name}
              </div>
              <div style={{ fontSize: '10px', color: '#64748B' }}>
                {formatDist(stopDist)} walk · ~{formatTimeExact(walkTimeSeconds(stopDist))} on foot
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 py-3 flex flex-col gap-2">
          {([
            { key: 'S1', schedule: s1, next: s1Next },
            { key: 'S2', schedule: s2, next: s2Next },
          ] as const).map(({ key, schedule, next }) => (
            <div key={key} className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl"
              style={{ background: key === 'S1' ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${key === 'S1' ? '#BFDBFE' : '#BBF7D0'}` }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: schedule.color }}>
                <span style={{ fontSize: '14px', color: 'white', fontWeight: 800 }}>{key}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1A1A1A' }}>{schedule.name}</div>
                <div style={{ fontSize: '10px', color: '#64748B' }}>
                  {schedule.route.join(' → ')}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div style={{ fontSize: '14px', fontWeight: 800, color: schedule.color }}>
                  {next.minsAway} min
                </div>
                <div style={{ fontSize: '9px', color: '#94A3B8' }}>
                  Next: {next.next}
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
            style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '10px' }}>⏱️</span>
            <span style={{ fontSize: '10px', color: '#92400E', fontWeight: 600 }}>
              Frequency: {s1.frequency} · Loop time: {s1.loopTime}–{s2.loopTime} min
            </span>
          </div>
        </div>
      </motion.div>

      {/* AUTO LABEL */}
      <div className="px-3 md:px-0 mb-1.5 flex-shrink-0">
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#9B7070', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          🛺 Auto Rickshaw
        </span>
      </div>

      {/* AUTO CARD */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="mx-3 md:mx-0 mb-3 rounded-2xl overflow-hidden flex-shrink-0"
        style={{ background: 'white', border: '1.5px solid #E8E0E0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      >
        {/* Header always visible */}
        <div className="flex items-center gap-3 px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #F8F5F5' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FEF9C3', border: '1.5px solid #FDE68A' }}>
            <span style={{ fontSize: '20px' }}>🛺</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>Auto Rickshaw</span>
              <span className="px-1.5 py-0.5 rounded-full"
                style={{ fontSize: '9px', fontWeight: 700, color: '#92400E', background: '#FEF3C7' }}>
                SHARED
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#6B6B6B' }}>
              ~3 min wait · Campus routes
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400E', lineHeight: 1.1 }}>
              {autoT.main}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', opacity: 0.7 }}>
              {autoT.sub}
            </div>
          </div>
        </div>

        {/* Ad gate or revealed content */}
        {!autoAdWatched ? (
          /* ─── AD GATE ─── */
          <div className="px-3 py-3">
            {!adPlaying ? (
              <div className="flex flex-col items-center gap-2.5 py-2">
                
                <button
                  onClick={startAd}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg,#F59E0B,#D97706)',
                    boxShadow: '0 6px 20px rgba(245,158,11,0.3)',
                  }}
                >
                  <Play size={14} color="white" fill="white" strokeWidth={2} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    🎬 Watch 5s Ad to View Info
                  </span>
                </button>
                <p style={{ fontSize: '10px', color: '#9B7070', textAlign: 'center' }}>
                  Free app — ads keep campus transit data running!
                </p>
              </div>
            ) : (
              /* ─── AD PLAYING ─── */
              <div className="flex flex-col gap-2">
                {/* Mock Ad Creative */}
                <div className="rounded-2xl overflow-hidden relative"
                  style={{ background: currentAdBrand.bg, border: `1.5px solid ${currentAdBrand.color}22`, minHeight: '100px' }}>
                  <div className="px-4 py-4 flex flex-col items-center justify-center gap-2">
                    <span style={{ fontSize: '32px' }}>{currentAdBrand.emoji}</span>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: currentAdBrand.color }}>{currentAdBrand.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{currentAdBrand.tagline}</div>
                    <div className="px-3 py-1.5 rounded-full mt-1"
                      style={{ background: currentAdBrand.color }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>Learn More</span>
                    </div>
                  </div>
                  {/* AD badge */}
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'white' }}>AD</span>
                  </div>
                  {/* Countdown badge */}
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'white' }}>{adCountdown}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#F0EEEE' }}>
                  <motion.div
                    style={{ width: `${adProgress * 100}%`, background: currentAdBrand.color, height: '100%', borderRadius: '999px' }}
                  />
                </div>
                <p style={{ fontSize: '10px', color: '#9B7070', textAlign: 'center' }}>
                  Ad plays… {adCountdown}s remaining
                </p>
              </div>
            )}
          </div>
        ) : (
          /* ─── REVEALED AUTO DETAILS ─── */
          <div className="px-3 py-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <div style={{ fontSize: '11px', color: '#9B7070', marginBottom: '2px' }}>
                  {formatDist(dist)} · 20 km/h · +3 min wait
                </div>
                {/* Nearest autos */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {[
                    { seats: '2 seats free', driver: 'Ramesh K.', rating: 4.8, ev: true, dist: '120m' },
                    { seats: '1 seat free', driver: 'Suresh Y.', rating: 4.6, ev: true, dist: '280m' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-xl"
                      style={{ background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                      <span style={{ fontSize: '16px' }}>🛺</span>
                      <div className="flex-1">
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#1A1A1A' }}>
                          {a.driver} · {a.seats}
                        </div>
                        <div style={{ fontSize: '10px', color: '#92400E' }}>
                          ⭐ {a.rating} · {a.dist} away {a.ev ? '· 🔋 EV' : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {[
                  { icon: '💰', val: `₹${autoFare(dist)}`, lbl: 'Fare' },
                  { icon: '💨', val: '0.12kg', lbl: 'CO₂' },
                ].map((s, i) => (
                  <div key={i} className="px-2 py-2 rounded-xl text-center"
                    style={{ background: '#FBF5F5', border: '1px solid #EDE0E0', minWidth: '52px' }}>
                    <div style={{ fontSize: '13px' }}>{s.icon}</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#1A1A1A' }}>{s.val}</div>
                    <div style={{ fontSize: '9px', color: '#9B9B9B' }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg,#8B1A1A,#A52A2A)', boxShadow: '0 3px 12px rgba(139,26,26,0.25)' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>🛺 Find Auto on Map</span>
              <ArrowRight size={12} color="white" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </motion.div>

      {/* INFO STRIP */}
      <div className="mx-3 md:mx-0 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl flex-shrink-0"
        style={{ background: '#FDF4F4', border: '1px solid #E8D0D0' }}>
        <Info size={12} color="#8B1A1A" strokeWidth={2.5} className="flex-shrink-0" />
        <p style={{ fontSize: '10px', color: '#6B1A1A', lineHeight: 1.4 }}>
          <strong>Walk or Cycle</strong> → slide to confirm and get a live checkpoint route!
        </p>
      </div>

      </div>{/* end max-w wrapper */}

      </div>{/* end scrollable */}

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50"
            style={{ background: 'rgba(44,10,10,0.55)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}
              className="w-full max-w-lg mx-auto rounded-b-3xl overflow-hidden"
              style={{ background: 'white', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
              <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid #F0EEEE' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                  style={{ background: '#FBF5F5', border: '1.5px solid #E8D0D0' }}>
                  <Search size={15} color="#8B1A1A" strokeWidth={2.5} />
                  <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search campus destination…"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: '13px', color: '#1A1A1A' }} />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                    <X size={15} color="#9B7070" />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {filteredLocations.map(loc => {
                  const isCurrent = loc.id === destId;
                  return (
                    <button key={loc.id}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      style={{ borderBottom: '1px solid #F8F5F5', background: isCurrent ? '#FDF4F4' : 'white' }}
                      onClick={() => { setDestId(loc.id); setSearchOpen(false); setSearchQuery(''); setSelected(null); }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#FDF4F4', border: '1.5px solid #E8D0D0' }}>
                        <span style={{ fontSize: '16px' }}>{loc.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div style={{ fontSize: '13px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#8B1A1A' : '#1A1A1A' }}>
                          {loc.name}
                        </div>
                        <div style={{ fontSize: '10px', color: '#9B7070' }}>{loc.description}</div>
                      </div>
                      {isCurrent && <CheckCircle2 size={14} color="#8B1A1A" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}