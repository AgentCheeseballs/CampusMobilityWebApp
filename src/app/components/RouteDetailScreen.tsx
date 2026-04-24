import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Trophy, Flag } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { CAMPUS_LOCATIONS, ARAVALI_HOSTEL } from '../data/mockData';
import {
  generateRoutePoints, campusDistance, haversine,
  walkTimeSeconds, cycleTimeSeconds, formatDist,
  co2Saved, walkCalories, cycleCalories
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

export function RouteDetailScreen() {
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
  const routeColor = '#4285F4'; // Google Maps blue

  const [fromLoc, setFromLoc] = useState<[number, number]>(ARAVALI_HOSTEL);
  const [checkpoints, setCheckpoints] = useState<CheckpointData[]>([]);
  const [journeyStarted, setJourneyStarted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [journeyDone, setJourneyDone] = useState(false);
  const [totalEcoEarned, setTotalEcoEarned] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

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
        ecoPoints: isLast ? 20 : 10,
        completed: false,
        completedOnTime: false,
        isDestination: isLast,
      };
    });

    setCheckpoints(cps);
  }, [fromLoc, destId, mode]);

  // Init map — Google Maps navigation style
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: fromLoc,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // CartoDB Voyager tiles — looks like Google Maps
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    mapRef.current = map;

    recenterRef.current = () => {
      map.setView(fromLoc, 17, { animate: true });
    };

    // GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setFromLoc([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true, timeout: 6000 }
      );
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Draw route when checkpoints ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || checkpoints.length === 0) return;

    // Clear previous drawn layers
    map.eachLayer(layer => {
      if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
    });

    const dest: [number, number] = [destination.lat, destination.lng];
    const routePoints = generateRoutePoints(fromLoc, dest, 4);

    // Outer shadow line
    L.polyline(routePoints, {
      color: 'rgba(0,0,0,0.18)',
      weight: 10,
      lineCap: 'round',
    }).addTo(map);

    // White backing
    L.polyline(routePoints, {
      color: 'white',
      weight: 8,
      lineCap: 'round',
    }).addTo(map);

    // Blue dotted walking route — matches Google Maps walking style
    L.polyline(routePoints, {
      color: routeColor,
      weight: 5,
      dashArray: mode === 'walk' ? '1, 10' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Checkpoint circle markers (like Google Maps waypoints)
    checkpoints.slice(0, -1).forEach((cp, i) => {
      L.circleMarker([cp.lat, cp.lng], {
        radius: 9,
        color: 'white',
        fillColor: cp.completed ? '#22C55E' : routeColor,
        fillOpacity: 1,
        weight: 2.5,
      }).addTo(map)
        .bindTooltip(`<b>CP${cp.id}:</b> ${cp.name} (+${cp.ecoPoints} pts)`, { direction: 'top' });
    });

    // Destination red pin (Google Maps style)
    L.marker(dest, {
      icon: L.divIcon({
        html: `
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="
              width:28px;height:28px;background:#EA4335;border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);border:3px solid white;
              box-shadow:0 3px 12px rgba(234,67,53,0.5);
            "></div>
          </div>`,
        className: '',
        iconSize: [28, 35],
        iconAnchor: [14, 35],
      }),
      zIndexOffset: 1000,
    }).addTo(map);

    // Blue navigation arrow at current position (Google Maps style)
    L.marker(fromLoc, {
      icon: L.divIcon({
        html: `
          <div style="
            width:0;height:0;
            border-left:12px solid transparent;
            border-right:12px solid transparent;
            border-bottom:28px solid #4285F4;
            filter:drop-shadow(0 3px 8px rgba(66,133,244,0.6));
          "></div>`,
        className: '',
        iconSize: [24, 28],
        iconAnchor: [12, 14],
      }),
      zIndexOffset: 2000,
    }).addTo(map);

    // "You" label under arrow
    L.marker(fromLoc, {
      icon: L.divIcon({
        html: `<div style="
          background:white;border:1.5px solid #4285F4;border-radius:10px;
          padding:2px 7px;font-size:9px;font-weight:700;color:#1A73E8;
          white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.12);
          font-family:sans-serif;margin-top:32px;
        ">You</div>`,
        className: '',
        iconSize: [40, 18],
        iconAnchor: [20, -10],
      }),
    }).addTo(map);

    map.fitBounds(L.latLngBounds([fromLoc, dest]), { padding: [70, 50], animate: true });
  }, [checkpoints, fromLoc]);

  // Timer
  useEffect(() => {
    if (!journeyStarted || journeyDone) return;
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [journeyStarted, journeyDone]);

  // Auto-complete checkpoints (at demo speed ~20% real time)
  useEffect(() => {
    if (!journeyStarted || journeyDone) return;
    setCheckpoints(prev => {
      const updated = [...prev];
      for (let i = 0; i < updated.length; i++) {
        if (!updated[i].completed && elapsedSec >= updated[i].targetSec * 0.2) {
          updated[i] = { ...updated[i], completed: true, completedOnTime: true };
          return updated;
        }
      }
      return prev;
    });
  }, [elapsedSec, journeyStarted]);

  // Check completion
  useEffect(() => {
    if (checkpoints.length > 0 && checkpoints.every(cp => cp.completed) && journeyStarted) {
      const earned = checkpoints.reduce((s, cp) => s + (cp.completedOnTime ? cp.ecoPoints : Math.ceil(cp.ecoPoints * 0.5)), 0);
      setTotalEcoEarned(earned);
      setJourneyDone(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const dist = campusDistance(fromLoc[0], fromLoc[1], destination.lat, destination.lng);
      if (mode === 'walk') updateStats({ walkKm: dist, ecoScore: earned / 10, co2Saved: co2Saved(dist) });
      if (mode === 'cycle') updateStats({ cycleKm: dist, ecoScore: earned / 10, co2Saved: co2Saved(dist) });
      setTimeout(() => setShowCelebration(true), 300);
    }
  }, [checkpoints, journeyStarted]);

  const handleMarkReached = (cpId: number) => {
    setCheckpoints(prev => {
      const updated = [...prev];
      const idx = updated.findIndex(cp => cp.id === cpId);
      if (idx >= 0 && !updated[idx].completed) {
        if (idx === 0 || updated[idx - 1].completed) {
          updated[idx] = { ...updated[idx], completed: true, completedOnTime: elapsedSec <= updated[idx].targetSec };
        }
      }
      return updated;
    });
  };

  const dist = campusDistance(fromLoc[0], fromLoc[1], destination.lat, destination.lng);
  const totalSec = mode === 'walk' ? walkTimeSeconds(dist) : cycleTimeSeconds(dist);
  const remainingSec = Math.max(0, totalSec - elapsedSec * 5); // demo speed
  const completedCount = checkpoints.filter(cp => cp.completed).length;
  const earnedSoFar = checkpoints.filter(cp => cp.completed).reduce((s, cp) => s + (cp.completedOnTime ? cp.ecoPoints : Math.ceil(cp.ecoPoints * 0.5)), 0);
  const nextCheckpoint = checkpoints.find(cp => !cp.completed);
  const nextStreetName = nextCheckpoint?.name ?? destination.name;
  const totalPoints = checkpoints.reduce((s, cp) => s + cp.ecoPoints, 0);

  return (
    <div className="w-full h-full flex flex-col" style={{ background: '#E8EDF0' }}>

      {/* MAP — takes majority of screen */}
      <div className="relative flex-1 min-h-0" style={{ minHeight: '55%' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* ── Google Maps style Navigation Header ── */}
        {journeyStarted && !journeyDone && (
          <div className="absolute top-3 left-3 right-3 z-20 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              {/* Direction arrow */}
              <div className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.15)' }}>
                <div style={{
                  width: 0, height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '18px solid white',
                }} />
              </div>
              {/* Street name */}
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: '15px', fontWeight: 800, color: 'white', lineHeight: 1.1 }}>
                  {nextStreetName}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)' }}>
                  Continue straight · {formatDist(dist - (dist * completedCount / checkpoints.length))} ahead
                </div>
              </div>
              {/* Mic button */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <span style={{ fontSize: '16px' }}>🎤</span>
              </div>
            </div>
          </div>
        )}

        {/* Before journey — simple header */}
        {!journeyStarted && !journeyDone && (
          <div className="absolute top-3 left-3 right-3 z-20 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.96)', boxShadow: '0 2px 12px rgba(0,0,0,0.15)', border: '1px solid #E8E8E8' }}>
              <button onClick={() => navigate(-1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background: '#F5F5F5' }}>
                ←
              </button>
              <div className="flex-1">
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A' }}>
                  {modeEmoji} {mode === 'walk' ? 'Walking' : 'Cycling'} to {destination.name}
                </div>
                <div style={{ fontSize: '10px', color: '#9B9B9B' }}>{formatDist(dist)} via campus roads</div>
              </div>
              <div className="px-2.5 py-1 rounded-xl flex-shrink-0"
                style={{ background: '#4285F4', fontSize: '10px', fontWeight: 700, color: 'white' }}>
                {Math.round(totalSec / 60)} min
              </div>
            </div>
          </div>
        )}

        {/* Right-side controls (Google Maps style) */}
        {journeyStarted && !journeyDone && (
          <div className="absolute right-3 z-20 flex flex-col gap-2"
            style={{ top: '80px' }}>
            {[
              { icon: '📍', title: 'Location' },
              { icon: '🔍', title: 'Search' },
              { icon: '🔇', title: 'Mute' },
            ].map((btn, i) => (
              <button key={i}
                className="w-11 h-11 rounded-full flex items-center justify-center"
                style={{ background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.18)', fontSize: '18px' }}>
                {btn.icon}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar overlay (during journey) */}
        {journeyStarted && !journeyDone && (
          <div className="absolute left-3 right-3 z-20" style={{ bottom: '80px' }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '11px' }}>{modeEmoji}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#E0E0E0' }}>
                <motion.div
                  animate={{ width: `${(completedCount / checkpoints.length) * 100}%` }}
                  transition={{ duration: 0.5 }}
                  className="h-full rounded-full"
                  style={{ background: routeColor }}
                />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: routeColor }}>
                {completedCount}/{checkpoints.length} CPs · +{earnedSoFar}pts
              </span>
            </div>
          </div>
        )}

        {/* Re-centre button (bottom-left, Google Maps style) */}
        {journeyStarted && !journeyDone && (
          <div className="absolute z-20" style={{ bottom: '12px', left: '12px' }}>
            <button
              onClick={() => recenterRef.current()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full"
              style={{ background: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.22)', border: '1px solid #E8E8E8' }}
            >
              <span style={{ fontSize: '14px' }}>⬆</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A' }}>Re-centre</span>
            </button>
          </div>
        )}

        {/* Bottom info panel — Google Maps style (only during journey) */}
        {journeyStarted && !journeyDone && (
          <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-3 px-4 py-4"
            style={{ background: 'white', boxShadow: '0 -4px 20px rgba(0,0,0,0.15)', borderTop: '1px solid #F0F0F0' }}>
            {/* X button */}
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#F5F5F5', border: '1.5px solid #E8E8E8', fontSize: '16px', fontWeight: 700, color: '#6B6B6B' }}
            >
              ✕
            </button>

            {/* Time + distance */}
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span style={{ fontSize: '28px', fontWeight: 900, color: '#1A1A1A', lineHeight: 1 }}>
                  {Math.max(1, Math.round(remainingSec / 60))}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A1A' }}>min</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B6B6B', marginTop: '1px' }}>
                {formatDist(dist)} · {formatTime12(remainingSec)}
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl flex-shrink-0"
              style={{ background: '#F0F9FF', border: '1.5px solid #BAE6FD' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: '#0369A1', fontFamily: 'monospace' }}>
                ⏱ {formatElapsed(elapsedSec)}
              </span>
            </div>

            {/* Route options button */}
            <button
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#F5F5F5', border: '1.5px solid #E8E8E8' }}
            >
              <span style={{ fontSize: '18px' }}>↕</span>
            </button>
          </div>
        )}
      </div>

      {/* BOTTOM PANEL — checkpoint list */}
      <div className="flex-shrink-0" style={{
        maxHeight: journeyStarted && !journeyDone ? '38%' : '45%',
        overflowY: 'auto',
        background: 'white',
        borderTop: '1px solid #F0EEEE',
      }}>

        {/* Not started */}
        {!journeyStarted && !journeyDone && (
          <div className="px-4 pt-3 pb-4">
            {/* Route summary strip */}
            <div className="flex gap-2 mb-3">
              {[
                { icon: mode === 'walk' ? '🚶' : '🚲', label: mode === 'walk' ? 'Walk' : 'Cycle', col: routeColor },
                { icon: '⏱️', label: `${Math.round(totalSec / 60)} min`, col: '#6B6B6B' },
                { icon: '📍', label: formatDist(dist), col: '#6B6B6B' },
                { icon: '⚡', label: `${totalPoints} pts max`, col: '#F59E0B' },
              ].map((s, i) => (
                <div key={i} className="flex-1 py-2 rounded-xl text-center"
                  style={{ background: '#F8F8F8', border: '1.5px solid #EAEAEA' }}>
                  <div style={{ fontSize: '14px' }}>{s.icon}</div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: s.col }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Checkpoint list */}
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B9B9B', letterSpacing: '0.06em', marginBottom: '8px' }}>
              ROUTE CHECKPOINTS
            </div>
            <div className="flex flex-col gap-1.5 mb-3">
              {checkpoints.map(cp => (
                <div key={cp.id} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                  style={{ background: '#F8F8F8', border: '1.5px solid #EAEAEA' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: cp.isDestination ? '#EA4335' : routeColor, border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
                    <span style={{ fontSize: cp.isDestination ? '12px' : '11px', fontWeight: 800, color: 'white' }}>
                      {cp.isDestination ? '🏁' : cp.id}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#1A1A1A' }}>{cp.name}</div>
                    <div style={{ fontSize: '10px', color: '#9B9B9B' }}>
                      {formatDist(cp.distFromStart)} · within {Math.round(cp.targetSec / 60)} min
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full"
                    style={{ fontSize: '10px', fontWeight: 700, color: 'white', background: cp.isDestination ? '#F59E0B' : routeColor }}>
                    +{cp.ecoPoints}
                  </span>
                </div>
              ))}
            </div>

            {/* Start button */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setJourneyStarted(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
              style={{
                background: `linear-gradient(135deg, #1B5E20, #2E7D32)`,
                boxShadow: '0 6px 20px rgba(27,94,32,0.4)',
              }}
            >
              <span style={{ fontSize: '16px' }}>▶</span>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>
                Start Navigation {modeEmoji}
              </span>
            </motion.button>
          </div>
        )}

        {/* Journey in progress — checkpoint status */}
        {journeyStarted && !journeyDone && (
          <div className="px-4 pt-2 pb-2">
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9B9B9B', letterSpacing: '0.06em', marginBottom: '6px' }}>
              ROUTE PROGRESS
            </div>
            <div className="flex flex-col gap-1.5">
              {checkpoints.map(cp => {
                const isNext = !cp.completed && checkpoints.findIndex(c => !c.completed) === checkpoints.indexOf(cp);
                return (
                  <div key={cp.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
                    style={{
                      background: cp.completed ? '#F0FDF4' : isNext ? '#EFF6FF' : '#F8F8F8',
                      border: cp.completed ? '1.5px solid #86EFAC' : isNext ? `1.5px solid ${routeColor}` : '1.5px solid #EAEAEA',
                    }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: cp.completed ? '#22C55E' : isNext ? routeColor : '#D1D5DB' }}>
                      {cp.completed
                        ? <CheckCircle2 size={12} color="white" strokeWidth={3} />
                        : <span style={{ fontSize: '10px', fontWeight: 800, color: 'white' }}>{cp.id}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: '11px', fontWeight: 600, color: cp.completed ? '#15803D' : isNext ? '#1D4ED8' : '#9B9B9B' }}>
                        {cp.name}
                      </div>
                      {cp.completed && (
                        <div style={{ fontSize: '9px', color: '#16A34A', fontWeight: 600 }}>
                          ✓ {cp.completedOnTime ? 'On time!' : 'Late'} · +{cp.completedOnTime ? cp.ecoPoints : Math.ceil(cp.ecoPoints * 0.5)} pts
                        </div>
                      )}
                    </div>
                    {isNext && (
                      <button onClick={() => handleMarkReached(cp.id)}
                        className="px-2.5 py-1.5 rounded-xl flex-shrink-0"
                        style={{ background: routeColor, fontSize: '10px', fontWeight: 700, color: 'white' }}>
                        I'm Here!
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Celebration */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3 pb-5">
              {/* Celebration card */}
              <motion.div
                initial={{ scale: 0.85 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 350, damping: 20 }}
                className="rounded-3xl p-4 mb-3 text-center"
                style={{ background: 'linear-gradient(135deg, #1B5E20, #2E7D32)', boxShadow: '0 8px 30px rgba(27,94,32,0.4)' }}
              >
                <div style={{ fontSize: '40px', marginBottom: '6px' }}>🎉</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'white', marginBottom: '3px' }}>Journey Complete!</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '12px' }}>
                  You {mode === 'walk' ? 'walked' : 'cycled'} to {destination.name}!
                </div>
                <div className="flex justify-center gap-6">
                  <div className="text-center">
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'white' }}>{totalEcoEarned}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>ECO PTS</div>
                  </div>
                  <div className="w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <div className="text-center">
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'white' }}>{formatElapsed(elapsedSec)}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>TIME</div>
                  </div>
                  <div className="w-px" style={{ background: 'rgba(255,255,255,0.2)' }} />
                  <div className="text-center">
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'white' }}>{formatDist(dist)}</div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>DIST</div>
                  </div>
                </div>
              </motion.div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { icon: '🔥', v: `${mode === 'walk' ? walkCalories(dist) : cycleCalories(dist)} kcal`, l: 'Burned', bg: '#FFF7ED', border: '#FED7AA', c: '#F97316' },
                  { icon: '🌿', v: `${co2Saved(dist)} kg`, l: 'CO₂ Saved', bg: '#F0FDF4', border: '#86EFAC', c: '#16A34A' },
                  { icon: '⚡', v: `+${totalEcoEarned} pts`, l: 'Eco Points', bg: '#FFFBEB', border: '#FDE68A', c: '#F59E0B' },
                  { icon: '🏁', v: `${completedCount}/${checkpoints.length}`, l: 'Checkpoints', bg: '#EFF6FF', border: '#BFDBFE', c: '#1D4ED8' },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.07 }}
                    className="p-3 rounded-2xl"
                    style={{ background: s.bg, border: `1.5px solid ${s.border}` }}>
                    <div style={{ fontSize: '18px', marginBottom: '3px' }}>{s.icon}</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: '10px', color: '#6B6B6B' }}>{s.l}</div>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => navigate('/profile')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#1B5E20,#2E7D32)', boxShadow: '0 4px 16px rgba(27,94,32,0.3)' }}>
                  <Trophy size={16} color="white" strokeWidth={2.5} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>View Leaderboard</span>
                </button>
                <button onClick={() => navigate('/')}
                  className="w-full py-3 rounded-2xl"
                  style={{ background: 'white', border: '1.5px solid #E8D0D0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B1A1A' }}>← Back to Map</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}