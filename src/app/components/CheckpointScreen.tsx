import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Trophy, Flag, MapPin, Navigation, Clock, Zap, ArrowLeft, MoreHorizontal, Mic, Volume2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CAMPUS_LOCATIONS, ARAVALI_HOSTEL } from '../data/mockData';
import {
  generateRoutePoints, campusDistance, haversine,
  walkTimeSeconds, cycleTimeSeconds, formatDist,
  co2Saved, walkCalories, cycleCalories, formatTimeExact
} from '../utils/geo';
import { useAuth } from '../context/AuthContext';

interface CheckpointData {
  id: number;
  name: string;
  lat: number;
  lng: number;
  distFromStart: number;
  targetSec: number;
  ecoPoints: number;
  completed: boolean;
  completedOnTime: boolean;
  isDestination: boolean;
}

function formatElapsed(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime12(sec: number) {
  const now = new Date();
  now.setSeconds(now.getSeconds() + sec);
  const h = now.getHours();
  const m = now.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${m} ${ampm}`;
}

export function CheckpointScreen() {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { updateStats } = useAuth();

  const state = routerLocation.state as {
    destId?: string;
    mode?: 'walk' | 'cycle';
    dist?: number;
    totalSec?: number;
  } | null;

  const destId = state?.destId ?? 'lhc';
  const mode = state?.mode ?? 'walk';
  const destination = CAMPUS_LOCATIONS.find(l => l.id === destId) ?? CAMPUS_LOCATIONS[0];
  const modeEmoji = mode === 'walk' ? '🚶' : '🚲';
  const routeColor = mode === 'walk' ? '#15803D' : '#8B1A1A';

  const [fromLoc, setFromLoc] = useState<[number, number]>(ARAVALI_HOSTEL);
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [journeyDone, setJourneyDone] = useState(false);
  const [totalEcoEarned, setTotalEcoEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recenterRef = useRef<() => void>(() => {});

  // Build checkpoints
  useEffect(() => {
    const dest: [number, number] = [destination.lat, destination.lng];
    const dist = campusDistance(fromLoc[0], fromLoc[1], dest[0], dest[1]);
    const totalSec = mode === 'walk' ? walkTimeSeconds(dist) : cycleTimeSeconds(dist);
    const routePoints = generateRoutePoints(fromLoc, dest, 4);
    const numSeg = routePoints.length - 1;
    const segDist = dist / numSeg;

    const cps: CheckpointData[] = routePoints.slice(1).map((pt, i) => {
      const isLast = i === routePoints.length - 2;
      const distSoFar = segDist * (i + 1);
      const targetSec = Math.round((totalSec / numSeg) * (i + 1) * 1.15);

      let name = isLast ? destination.name : `Checkpoint ${i + 1}`;
      if (!isLast) {
        let nearestDist = Infinity;
        CAMPUS_LOCATIONS.forEach(loc => {
          const d = haversine(pt[0], pt[1], loc.lat, loc.lng) * 1000;
          if (d < 280 && d < nearestDist) {
            nearestDist = d;
            name = loc.name.split(' ').slice(0, 3).join(' ');
          }
        });
      }

      return {
        id: i + 1,
        name,
        lat: pt[0],
        lng: pt[1],
        distFromStart: distSoFar,
        targetSec,
        ecoPoints: isLast ? 30 : 15,
        completed: false,
        completedOnTime: false,
        isDestination: isLast,
      };
    });

    setCheckpoints(cps);
  }, [fromLoc, destId, mode]);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: fromLoc,
      zoom: 17,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    recenterRef.current = () => {
      map.setView(fromLoc, 18, { animate: true });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setFromLoc([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Draw route and markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || checkpoints.length === 0) return;

    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const dest: [number, number] = [destination.lat, destination.lng];
    const routePoints = generateRoutePoints(fromLoc, dest, 4);

    // Route shadow
    L.polyline(routePoints, {
      color: 'rgba(0,0,0,0.15)',
      weight: 12,
      lineCap: 'round',
    }).addTo(map);

    // Route path
    L.polyline(routePoints, {
      color: 'white',
      weight: 9,
      lineCap: 'round',
    }).addTo(map);

    L.polyline(routePoints, {
      color: routeColor,
      weight: 6,
      dashArray: mode === 'walk' ? '1, 12' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Checkpoints
    checkpoints.forEach((cp) => {
      if (cp.isDestination) {
        L.marker([cp.lat, cp.lng], {
          icon: L.divIcon({
            html: `
              <div style="display:flex;flex-direction:column;align-items:center">
                <div style="
                  width:32px;height:32px;background:#EA4335;border-radius:50% 50% 50% 0;
                  transform:rotate(-45deg);border:3.5px solid white;
                  box-shadow:0 4px 15px rgba(234,67,53,0.6);
                  display:flex;align-items:center;justify-content:center;
                ">
                  <div style="transform:rotate(45deg);color:white;font-size:14px;font-weight:900">🏁</div>
                </div>
              </div>`,
            className: '',
            iconSize: [32, 40],
            iconAnchor: [16, 40],
          }),
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        L.circleMarker([cp.lat, cp.lng], {
          radius: 10,
          color: 'white',
          fillColor: cp.completed ? '#22C55E' : routeColor,
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);
      }
    });

    // User Position Marker (Navigation Arrow Style)
    L.marker(fromLoc, {
      icon: L.divIcon({
        html: `
          <div style="
            width:0;height:0;
            border-left:14px solid transparent;
            border-right:14px solid transparent;
            border-bottom:32px solid #4285F4;
            filter:drop-shadow(0 4px 10px rgba(66,133,244,0.7));
          "></div>`,
        className: '',
        iconSize: [28, 32],
        iconAnchor: [14, 16],
      }),
      zIndexOffset: 2000,
    }).addTo(map);

    map.fitBounds(L.latLngBounds([fromLoc, dest]), { padding: [80, 80], animate: true });
  }, [checkpoints, fromLoc]);

  // Journey timer
  useEffect(() => {
    if (journeyDone) return;
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [journeyDone]);

  // Simulation: Auto-complete checkpoints
  useEffect(() => {
    if (journeyDone) return;
    setCheckpoints(prev => {
      const updated = [...prev];
      let changed = false;
      for (let i = 0; i < updated.length; i++) {
        // Fast-forward simulation (5x speed)
        if (!updated[i].completed && elapsedSec >= updated[i].targetSec * 0.15) {
          updated[i] = { ...updated[i], completed: true, completedOnTime: true };
          changed = true;
          break; // One at a time for effect
        }
      }
      return changed ? updated : prev;
    });
  }, [elapsedSec, journeyDone]);

  // Handle journey completion
  useEffect(() => {
    if (checkpoints.length > 0 && checkpoints.every(cp => cp.completed) && !journeyDone) {
      const earned = checkpoints.reduce((s, cp) => s + (cp.completedOnTime ? cp.ecoPoints : Math.ceil(cp.ecoPoints * 0.5)), 0);
      setTotalEcoEarned(earned);
      setJourneyDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      
      const dist = campusDistance(fromLoc[0], fromLoc[1], destination.lat, destination.lng);
      updateStats({ 
        walkKm: mode === 'walk' ? dist : 0, 
        cycleKm: mode === 'cycle' ? dist : 0, 
        ecoScore: earned / 10, 
        co2Saved: co2Saved(dist) 
      });
      
      setTimeout(() => setShowCelebration(true), 600);
    }
  }, [checkpoints]);

  const handleMarkReached = (cpId: number) => {
    setCheckpoints(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(cp => cp.id === cpId);
      if (idx >= 0 && !updated[idx].completed) {
        updated[idx] = { ...updated[idx], completed: true, completedOnTime: true };
      }
      return updated;
    });
  };

  const distVal = state?.dist ?? campusDistance(fromLoc[0], fromLoc[1], destination.lat, destination.lng);
  const totalSec = state?.totalSec ?? (mode === 'walk' ? walkTimeSeconds(distVal) : cycleTimeSeconds(distVal));
  const remainingSec = Math.max(0, totalSec - elapsedSec * 6); // Accelerated for demo
  const completedCount = checkpoints.filter(cp => cp.completed).length;
  const earnedSoFar = checkpoints.filter(cp => cp.completed).reduce((s, cp) => s + (cp.completedOnTime ? cp.ecoPoints : Math.ceil(cp.ecoPoints * 0.5)), 0);
  const nextCheckpoint = checkpoints.find(cp => !cp.completed);
  const instruction = nextCheckpoint ? `Head towards ${nextCheckpoint.name}` : `Arriving at ${destination.name}`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: '#F8FAFC' }}>
      
      {/* ── TOP NAV HEADER ── */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3">
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ 
            background: 'linear-gradient(135deg, #1E293B, #0F172A)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)' }}>
            <Navigation size={18} color="white" strokeWidth={2.5} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: '14px', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
              {instruction}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                {formatDist(distVal * (1 - completedCount / (checkpoints.length || 1)))} left
              </span>
              <div className="w-1 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                {modeEmoji} {mode === 'walk' ? 'Walking' : 'Cycling'}
              </span>
            </div>
          </div>

          <button onClick={() => setIsMuted(!isMuted)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {isMuted ? <Volume2 size={15} color="#94A3B8" /> : <Mic size={15} color="white" />}
          </button>
        </motion.div>
      </div>

      {/* ── MAP CONTAINER ── */}
      <div className="flex-1 relative min-h-0">
        <div ref={mapContainerRef} className="w-full h-full" />
        
        {/* FABs */}
        <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-2">
          <button onClick={() => recenterRef.current()} className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'white', boxShadow: '0 3px 12px rgba(0,0,0,0.12)' }}>
            <Navigation size={16} color="#4285F4" fill="#4285F4" />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'white', boxShadow: '0 3px 12px rgba(0,0,0,0.12)' }}>
            <MoreHorizontal size={16} color="#64748B" />
          </button>
        </div>

        {/* Floating Stats Bar */}
        <div className="absolute left-3 right-3 bottom-4 z-20">
          <div className="px-4 py-3 rounded-2xl flex items-center justify-between"
            style={{ 
              background: 'white', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              border: '1px solid #F1F5F9'
            }}
          >
            <div className="flex flex-col">
              <span style={{ fontSize: '24px', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
                {Math.max(1, Math.round(remainingSec / 60))}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', marginTop: 1 }}>MIN</span>
            </div>
            
            <div className="h-8 w-px bg-slate-100" />
            
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1">
                <Zap size={11} color="#F59E0B" fill="#F59E0B" />
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{earnedSoFar}</span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B' }}>ECO PTS</span>
            </div>

            <div className="h-8 w-px bg-slate-100" />

            <div className="flex flex-col items-end">
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                {formatTime12(remainingSec)}
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#64748B', marginTop: 1 }}>ARRIVAL</span>
            </div>

            <button 
              onClick={() => navigate(-1)}
              className="ml-3 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}
            >
              <ArrowLeft size={16} color="#EF4444" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM DRAWER: CHECKPOINT LIST ── */}
      <div className="h-[200px] bg-white rounded-t-3xl flex flex-col px-4 pt-4 pb-3 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] border-t border-slate-100">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Flag size={14} color={routeColor} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>Checkpoints</span>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
            {completedCount}/{checkpoints.length}
          </span>
        </div>

        <div className="flex-1 overflow-x-auto flex gap-3 pb-1 scrollbar-hide">
          {checkpoints.map((cp, idx) => {
            const isNext = !cp.completed && (idx === 0 || checkpoints[idx-1].completed);
            return (
              <motion.div
                key={cp.id}
                initial={false}
                animate={{ 
                  scale: isNext ? 1.03 : 1,
                  opacity: cp.completed ? 0.7 : 1
                }}
                className="flex-shrink-0 w-[115px] rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden"
                style={{
                  background: cp.completed ? '#F0FDF4' : isNext ? '#EFF6FF' : '#F8FAFC',
                  border: `1.5px solid ${cp.completed ? '#86EFAC' : isNext ? '#3B82F6' : '#E2E8F0'}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: cp.completed ? '#22C55E' : isNext ? '#3B82F6' : '#94A3B8' }}>
                    {cp.completed ? <CheckCircle2 size={13} color="white" /> : <span className="text-white text-[10px] font-black">{cp.id}</span>}
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: cp.completed ? '#16A34A' : '#64748B' }}>
                    +{cp.ecoPoints}
                  </span>
                </div>
                
                <div className="min-h-[26px]">
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1E293B', lineHeight: 1.2 }}>{cp.name}</div>
                  <div style={{ fontSize: '9px', color: '#64748B', marginTop: 1 }}>{formatDist(cp.distFromStart)}</div>
                </div>

                {isNext && (
                  <button 
                    onClick={() => handleMarkReached(cp.id)}
                    className="w-full py-1 rounded-md text-center"
                    style={{ background: '#3B82F6', color: 'white', fontSize: '9px', fontWeight: 800 }}
                  >
                    REACHED
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── CELEBRATION MODAL ── */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            style={{ background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xs rounded-3xl p-6 text-center"
              style={{ background: 'white', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}
            >
              <div className="w-18 h-18 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4" style={{ width: '72px', height: '72px' }}>
                <Trophy size={36} color="#22C55E" strokeWidth={2.5} />
              </div>
              
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', marginBottom: '6px' }}>Trip Completed!</h2>
              <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>
                You reached <strong>{destination.name}</strong> on time.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-6">
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-50">
                  <Zap size={15} color="#F59E0B" fill="#F59E0B" />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', marginTop: 3 }}>{totalEcoEarned}</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#94A3B8' }}>PTS</span>
                </div>
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-50">
                  <Clock size={15} color="#3B82F6" />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', marginTop: 3 }}>{Math.floor(elapsedSec/60)}m</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#94A3B8' }}>TIME</span>
                </div>
                <div className="flex flex-col items-center p-2.5 rounded-xl bg-slate-50">
                  <MapPin size={15} color="#10B981" />
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E293B', marginTop: 3 }}>{formatDist(distVal)}</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, color: '#94A3B8' }}>DIST</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full py-3 rounded-xl"
                  style={{ background: '#0F172A', color: 'white', fontWeight: 800, fontSize: '13px' }}
                >
                  View Achievement 🏆
                </button>
                <button 
                  onClick={() => navigate('/')}
                  className="w-full py-3 rounded-xl"
                  style={{ background: '#F1F5F9', color: '#475569', fontWeight: 800, fontSize: '13px' }}
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}