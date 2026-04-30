import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, ChevronRight, X, Navigation, Search, Clock, Zap, ArrowRight } from 'lucide-react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IITDelhiMap, RouteConfig } from './IITDelhiMap';
import { MOCK_AUTOS, MOCK_BUSES, BUS_STOPS, MockAuto, CAMPUS_LOCATIONS, ARAVALI_HOSTEL } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { haversine, formatDist, formatTimeExact, walkTimeSeconds, cycleTimeSeconds, autoTimeSeconds, campusDistance } from '../utils/geo';
import { SUPABASE_URL, publicAnonKey } from '../../../utils/supabase/info';

function seatBadgeStyle(used: number, total: number) {
  if (used === total) return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
  if (used >= 2) return { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' };
  return { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' };
}

const ECO_FACTS = [
  'Walking 1 km saves ~0.12 kg of CO₂ vs an auto! 🌍',
  'Cycling to class burns ~38 kcal per km — stay fit for free! 💪',
  'IIT Delhi\'s campus is just 2×2 km — most places are a 10-min walk!',
  'Regular campus cyclists rank 2× higher on the eco leaderboard 🏆',
  'Walking daily reduces stress and improves focus for exams 🧠',
];

type LiveLocationRow = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
};

type LiveUserProfile = {
  name: string;
  emoji: string;
};

// LHC is the default destination for locate preview
const LHC = CAMPUS_LOCATIONS.find(l => l.id === 'lhc')!;
const LIVE_USER_FRESHNESS_SECONDS = 30;
const LIVE_PUBLISH_INTERVAL_MS = 8000;
const LIVE_PUBLISH_MIN_MOVE_METERS = 10;

const SUPABASE_CLIENT_KEY = '__iitd_home_supabase_client';
function getSupabase(): SupabaseClient {
  if (!(globalThis as any)[SUPABASE_CLIENT_KEY]) {
    (globalThis as any)[SUPABASE_CLIENT_KEY] = createClient(SUPABASE_URL, publicAnonKey);
  }
  return (globalThis as any)[SUPABASE_CLIENT_KEY];
}

export function HomeScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [userLoc, setUserLoc] = useState<[number, number]>(ARAVALI_HOSTEL);
  const [autos, setAutos] = useState<MockAuto[]>(MOCK_AUTOS);
  const [buses, setBuses] = useState(MOCK_BUSES);
  const [mapUnlocked, setMapUnlocked] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [pingRadius, setPingRadius] = useState(0);
  const [pingSuccess, setPingSuccess] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [showPingConfirm, setShowPingConfirm] = useState(false);
  const [gpsWarning, setGpsWarning] = useState('');
  const [liveSyncWarning, setLiveSyncWarning] = useState('');
  const [selectedAuto, setSelectedAuto] = useState<MockAuto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [route, setRoute] = useState<RouteConfig | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);
  const [motivationFact] = useState(() => ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)]);
  const [selectedDestination, setSelectedDestination] = useState<typeof CAMPUS_LOCATIONS[0] | null>(null);
  const [liveLocations, setLiveLocations] = useState<Record<string, LiveLocationRow>>({});
  const [liveProfiles, setLiveProfiles] = useState<Record<string, LiveUserProfile>>({});

  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const staleCleanupRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const lastPublishedRef = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const liveChannelRef = useRef<any>(null);
  const activeUserIdRef = useRef<string | null>(null);

  // Show motivation popup once per session
  useEffect(() => {
    if (!sessionStorage.getItem('iitd_eco_motivated')) {
      const timer = setTimeout(() => {
        setShowMotivation(true);
        sessionStorage.setItem('iitd_eco_motivated', '1');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  // Accept route from compare/search navigation
  useEffect(() => {
    const state = location.state as { destId?: string; mode?: 'walk' | 'cycle' } | null;
    if (state?.destId && state?.mode) {
      const loc = CAMPUS_LOCATIONS.find(l => l.id === state.destId);
      if (loc) {
        setRoute({ destination: [loc.lat, loc.lng], destinationName: loc.name, mode: state.mode });
      }
      window.history.replaceState({}, '');
    }
  }, [location.state]);

  // Simulate auto movement
  useEffect(() => {
    const interval = setInterval(() => {
      setAutos(prev => prev.map(a => ({
        ...a,
        lat: a.lat + (Math.random() - 0.5) * 0.0003,
        lng: a.lng + (Math.random() - 0.5) * 0.0003,
      })));
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Simulate bus movement
  useEffect(() => {
    const interval = setInterval(() => {
      setBuses(prev => prev.map(b => ({
        ...b,
        lat: b.lat + (Math.random() - 0.5) * 0.0004,
        lng: b.lng + (Math.random() - 0.5) * 0.0004,
        minutesToIITD: Math.max(1, b.minutesToIITD + (Math.random() > 0.7 ? -1 : 0)),
      })));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Times to selected destination (or LHC default)
  const locateDest = selectedDestination ?? LHC;
  const distToDest = campusDistance(userLoc[0], userLoc[1], locateDest.lat, locateDest.lng);
  const walkToDest = formatTimeExact(walkTimeSeconds(distToDest));
  const cycleToDest = formatTimeExact(cycleTimeSeconds(distToDest));

  const nearestAuto = [...autos].sort((a, b) => {
    return haversine(userLoc[0], userLoc[1], a.lat, a.lng)
      - haversine(userLoc[0], userLoc[1], b.lat, b.lng);
  })[0];

  const isLocationFresh = (updatedAt: string) => {
    const ts = Date.parse(updatedAt);
    if (!Number.isFinite(ts)) return false;
    return (Date.now() - ts) / 1000 <= LIVE_USER_FRESHNESS_SECONDS;
  };

  const deleteLiveLocationByUserId = async (userId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('user_live_locations').delete().eq('user_id', userId);
      if (error) {
        console.error('Failed to remove live location row:', error);
      }
    } catch (err) {
      console.error('Failed to remove live location row:', err);
    }
  };

  const loadProfilesForUsers = async (userIds: string[]) => {
    const missingIds = userIds.filter(id => !liveProfiles[id]);
    if (missingIds.length === 0) return;
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('profiles')
        .select('id,name,profile_emoji,avatar')
        .in('id', missingIds);
      if (error) {
        console.error('Failed to load live user profiles:', error);
        return;
      }
      if (!data) return;
      setLiveProfiles(prev => {
        const next = { ...prev };
        for (const p of data) {
          next[p.id] = {
            name: p.name || 'Campus User',
            emoji: p.profile_emoji || p.avatar || '🙂',
          };
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to load live user profiles:', err);
    }
  };

  const loadInitialLiveLocations = async () => {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('user_live_locations')
        .select('user_id,lat,lng,updated_at');
      if (error) {
        console.error('Failed to load initial live user locations:', error);
        setLiveSyncWarning('Unable to load live users right now. Please try Locate again.');
        return;
      }
      if (!data) return;

      setLiveSyncWarning('');

      const rows = data as LiveLocationRow[];
      setLiveLocations(() => {
        const next: Record<string, LiveLocationRow> = {};
        for (const row of rows) {
          if (isLocationFresh(row.updated_at)) {
            next[row.user_id] = row;
          }
        }
        return next;
      });
      void loadProfilesForUsers(rows.map(r => r.user_id));
    } catch (err) {
      console.error('Failed to load live user locations:', err);
    }
  };

  const publishMyLocation = async (lat: number, lng: number, force = false) => {
    if (!user?.id) return;
    const last = lastPublishedRef.current;
    const now = Date.now();
    const movedMeters = last ? haversine(last.lat, last.lng, lat, lng) * 1000 : Infinity;
    const elapsedMs = last ? now - last.at : Infinity;
    if (!force && movedMeters < LIVE_PUBLISH_MIN_MOVE_METERS && elapsedMs < LIVE_PUBLISH_INTERVAL_MS) {
      return;
    }

    setUserLoc([lat, lng]);
    lastPublishedRef.current = { lat, lng, at: now };
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from('user_live_locations').upsert({
        user_id: user.id,
        lat,
        lng,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Failed to publish live location:', error);
        setLiveSyncWarning('Live location publish failed. Check Supabase policies/network and try again.');
        return;
      }
      setLiveSyncWarning('');
    } catch (err) {
      console.error('Failed to publish live location:', err);
      setLiveSyncWarning('Live location publish failed. Check connection and try again.');
    }
  };

  const startLiveLocationSharing = async (): Promise<boolean> => {
    if (!user?.id) {
      setGpsWarning('Please log in before using Locate.');
      return false;
    }
    if (!navigator.geolocation) {
      setGpsWarning('Location services are not supported in this browser.');
      return false;
    }

    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async pos => {
          setGpsWarning('');
          await publishMyLocation(pos.coords.latitude, pos.coords.longitude, true);
          if (geoWatchRef.current === null) {
            geoWatchRef.current = navigator.geolocation.watchPosition(
              watchPos => {
                void publishMyLocation(watchPos.coords.latitude, watchPos.coords.longitude);
              },
              () => {
                setGpsWarning('Live location permission denied or unavailable.');
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
            );
          }
          resolve(true);
        },
        () => {
          setGpsWarning('Could not access your location. Enable GPS and try again.');
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const stopLiveLocationSharing = async (userIdToRemove?: string) => {
    if (geoWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geoWatchRef.current);
      geoWatchRef.current = null;
    }
    lastPublishedRef.current = null;
    if (userIdToRemove) {
      await deleteLiveLocationByUserId(userIdToRemove);
    }
  };

  const startPing = async () => {
    setShowPingConfirm(false);
    const sharingStarted = await startLiveLocationSharing();
    if (!sharingStarted) return;
    setMapUnlocked(true);
    setPinging(true);
    setPingRadius(0);
    setPingSuccess(false);
    let r = 0;
    pingIntervalRef.current = setInterval(() => {
      r += 18;
      setPingRadius(r);
      if (r >= 480) {
        clearInterval(pingIntervalRef.current!);
        setTimeout(() => {
          setPinging(false);
          setPingRadius(0);
          setPingSuccess(true);
          setPingCount(Math.max(1, Object.keys(liveLocations).length));
          setTimeout(() => setPingSuccess(false), 4000);
        }, 300);
      }
    }, 45);
  };

  useEffect(() => {
    if (!user?.id) {
      setLiveLocations({});
      setLiveProfiles({});
      setLiveSyncWarning('');
      return;
    }
    const supabase = getSupabase();
    void loadInitialLiveLocations();

    const channel = supabase
      .channel('user_live_locations_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_live_locations' },
        payload => {
          const evt = payload.eventType;
          if (evt === 'DELETE') {
            const oldRow = payload.old as { user_id?: string };
            if (!oldRow?.user_id) return;
            setLiveLocations(prev => {
              if (!prev[oldRow.user_id]) return prev;
              const next = { ...prev };
              delete next[oldRow.user_id];
              return next;
            });
            return;
          }

          const newRow = payload.new as LiveLocationRow;
          if (!newRow?.user_id) return;
          setLiveLocations(prev => ({ ...prev, [newRow.user_id]: newRow }));
          void loadProfilesForUsers([newRow.user_id]);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Live locations realtime subscribed');
          setLiveSyncWarning('');
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          console.error('Live locations realtime subscription issue:', status, err);
          setLiveSyncWarning('Live updates disconnected. Please refresh or tap Locate again.');
        }
      });

    liveChannelRef.current = channel;
    return () => {
      if (liveChannelRef.current) {
        void supabase.removeChannel(liveChannelRef.current);
        liveChannelRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    staleCleanupRef.current = setInterval(() => {
      setLiveLocations(prev => {
        const next: Record<string, LiveLocationRow> = {};
        for (const [userId, row] of Object.entries(prev)) {
          if (isLocationFresh(row.updated_at)) next[userId] = row;
        }
        return next;
      });
    }, 10000);
    return () => {
      if (staleCleanupRef.current) clearInterval(staleCleanupRef.current);
    };
  }, []);

  useEffect(() => {
    const previousUserId = activeUserIdRef.current;
    const currentUserId = user?.id ?? null;
    if (previousUserId && previousUserId !== currentUserId) {
      void stopLiveLocationSharing(previousUserId);
    }
    if (!currentUserId) {
      if (geoWatchRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      lastPublishedRef.current = null;
    }
    activeUserIdRef.current = currentUserId;
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      const currentUserId = activeUserIdRef.current;
      void stopLiveLocationSharing(currentUserId ?? undefined);
    };
  }, []);

  const filteredLocations = CAMPUS_LOCATIONS.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedAutos = [...autos].sort((a, b) => {
    return haversine(userLoc[0], userLoc[1], a.lat, a.lng)
      - haversine(userLoc[0], userLoc[1], b.lat, b.lng);
  });

  const displayAvatar = user?.profileEmoji ?? user?.avatar ?? 'U';
  const liveUserMarkers = Object.values(liveLocations)
    .filter(row => row.user_id !== user?.id && isLocationFresh(row.updated_at))
    .map(row => ({
      id: row.user_id,
      lat: row.lat,
      lng: row.lng,
      name: liveProfiles[row.user_id]?.name || 'Campus User',
      emoji: liveProfiles[row.user_id]?.emoji || '🙂',
    }));

  return (
    <div className="relative w-full h-full" style={{ background: '#FBF5F5' }}>

      {/* FULL MAP — blurred until map unlocked */}
      <div
        className="absolute inset-0"
        style={{
          filter: mapUnlocked ? 'none' : 'blur(7px)',
          transition: 'filter 0.8s ease',
          pointerEvents: mapUnlocked ? 'auto' : 'none',
          transform: 'scale(1.04)', // prevents blur edge artifacts
        }}
      >
        <IITDelhiMap
          autos={mapUnlocked ? autos : []}
          buses={mapUnlocked ? buses : []}
          busStops={mapUnlocked ? BUS_STOPS : []}
          userLocation={userLoc}
          pinging={pinging}
          pingRadius={pingRadius}
          onAutoClick={a => { setSelectedAuto(a); setSheetOpen(false); }}
          onLocationUpdate={setUserLoc}
          selectedAutoId={selectedAuto?.id}
          route={route}
          liveUsers={mapUnlocked ? liveUserMarkers : []}
        />
      </div>

      {/* LOCK OVERLAY — shown when map is blurred */}
      <AnimatePresence>
        {!mapUnlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center"
            style={{ pointerEvents: 'none' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              className="px-7 py-6 rounded-3xl text-center"
              style={{ background: 'rgba(10,4,4,0.72)', backdropFilter: 'blur(2px)', maxWidth: '300px' }}
            >
              <div style={{ fontSize: '44px', marginBottom: '10px' }}>🗺️</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>Map Locked</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                Press the <span style={{ color: '#FF9999', fontWeight: 700 }}>LOCATE</span> button below to locate nearby autos and unlock the map
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="absolute top-0 left-0 right-0 z-20 px-3 md:px-6 pt-2 pb-2"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(139,26,26,0.08)' }}>
        <div className="flex justify-end max-w-3xl mx-auto mb-2">
        </div>
        <div className="flex items-center gap-2 max-w-3xl mx-auto">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 px-3 py-2 rounded-2xl text-left"
            style={{ background: '#FBF5F5', border: '1.5px solid #E8D0D0' }}
          >
            <Search size={14} color="#9B7070" strokeWidth={2.5} />
            <span style={{ fontSize: '13px', color: '#9B7070', fontWeight: 500 }}>
              {route ? `📍 ${route.destinationName}` : 'Search IIT Delhi campus…'}
            </span>
          </button>
          {route && (
            <button onClick={() => setRoute(null)}
              className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: '#FDF4F4', border: '1.5px solid #E8D0D0' }}>
              <X size={14} color="#8B1A1A" />
            </button>
          )}
          <button
            onClick={() => navigate('/edit-profile')}
            className="hidden w-9 h-9 rounded-xl items-center justify-center flex-shrink-0 relative"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)' }}
          >
            <span style={{ fontSize: user?.profileEmoji ? '18px' : '13px', fontWeight: 800, color: 'white' }}>
              {displayAvatar}
            </span>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: '#22C55E', border: '1.5px solid white', fontSize: '6px' }}>
              ✏️
            </div>
          </button>
        </div>
        {route && (
          <div className="mt-2 flex items-center gap-2 px-2 py-1.5 rounded-xl max-w-3xl mx-auto"
            style={{ background: route.mode === 'walk' ? '#F0FDF4' : '#FDF4F4', border: `1px solid ${route.mode === 'walk' ? '#BBF7D0' : '#E8D0D0'}` }}>
            <span style={{ fontSize: '14px' }}>{route.mode === 'walk' ? '🚶' : '🚲'}</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: route.mode === 'walk' ? '#15803D' : '#8B1A1A' }}>
              {route.mode === 'walk' ? 'Walking' : 'Cycling'} to {route.destinationName}
            </span>
            <button onClick={() => navigate('/compare')} className="ml-auto">
              <span style={{ fontSize: '10px', color: '#6B6B6B', textDecoration: 'underline' }}>Change</span>
            </button>
          </div>
        )}
      </div>

      {/* Status pills — only when unlocked */}
      <AnimatePresence>
        {mapUnlocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute z-10 flex items-center gap-1.5"
            style={{ top: route ? '84px' : '58px', right: '12px' }}
          >
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#065F46' }}>
                {autos.filter(a => a.seatsUsed < a.seatsTotal).length} autos
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#3B82F6' }} />
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#1D4ED8' }}>
                {buses.length} shuttles
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map controls */}
      <div className="absolute z-10 flex flex-col gap-1.5" style={{ top: route ? '84px' : '58px', left: '12px' }}>
        {[
          { label: '+', action: () => {} },
          { label: '−', action: () => {} },
          { label: <Navigation size={15} color="#8B1A1A" strokeWidth={2.5} />, action: () => {} },
        ].map((btn, i) => (
          <button key={i} onClick={btn.action}
            className="w-9 h-9 flex items-center justify-center rounded-xl"
            style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '18px', color: '#374151' }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Ping success toast */}
      <AnimatePresence>
        {pingSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute z-30 px-4 py-3 rounded-2xl flex items-center gap-2"
            style={{
              top: '68px', left: '50%', transform: 'translateX(-50%)',
              background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)',
              boxShadow: '0 8px 24px rgba(139,26,26,0.4)', whiteSpace: 'nowrap',
            }}
          >
            <Zap size={14} color="white" fill="white" />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'white' }}>
              🛺 {pingCount} autos found nearby!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!!gpsWarning && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute z-30 px-4 py-2.5 rounded-2xl"
            style={{
              top: pingSuccess ? '112px' : '68px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.96)',
              border: '1.5px solid #F59E0B',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              maxWidth: '88%',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#B45309' }}>
              {gpsWarning}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!!liveSyncWarning && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="absolute z-30 px-4 py-2.5 rounded-2xl"
            style={{
              top: (!!gpsWarning || pingSuccess) ? '112px' : '68px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(255,255,255,0.96)',
              border: '1.5px solid #F97316',
              boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
              maxWidth: '90%',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#C2410C' }}>
              {liveSyncWarning}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto detail */}
      <AnimatePresence>
        {selectedAuto && !sheetOpen && mapUnlocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute z-20 rounded-2xl overflow-hidden"
            style={{ bottom: '130px', left: '12px', right: '12px', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto', background: 'rgba(255,255,255,0.98)', boxShadow: '0 8px 32px rgba(139,26,26,0.12)', border: '1.5px solid #E8D0D0' }}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: '22px' }}>🛺</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>{selectedAuto.driver}</div>
                    <div style={{ fontSize: '11px', color: '#6B6B6B' }}>{selectedAuto.vehicleNo} · {selectedAuto.isEV ? '⚡ EV' : '🔧 CNG'}</div>
                  </div>
                </div>
                <button onClick={() => setSelectedAuto(null)}><X size={18} color="#9B7070" /></button>
              </div>
              <div className="flex gap-2 mb-3">
                {[
                  { label: 'Seats', value: selectedAuto.seats, ...seatBadgeStyle(selectedAuto.seatsUsed, selectedAuto.seatsTotal) },
                  { label: 'ETA', value: formatTimeExact(autoTimeSeconds(campusDistance(userLoc[0], userLoc[1], selectedAuto.lat, selectedAuto.lng))), bg: '#FDF4F4', text: '#8B1A1A', border: '#E8D0D0' },
                  { label: 'Dist', value: formatDist(haversine(userLoc[0], userLoc[1], selectedAuto.lat, selectedAuto.lng)), bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
                ].map((item, i) => (
                  <div key={i} className="flex-1 py-2 rounded-xl text-center"
                    style={{ background: item.bg, border: `1.5px solid ${item.border}` }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: item.text }}>{item.value}</div>
                    <div style={{ fontSize: '9px', color: '#9B9B9B' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { navigate('/compare'); setSelectedAuto(null); }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)', boxShadow: '0 4px 16px rgba(139,26,26,0.3)' }}
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Compare Routes</span>
                <ChevronRight size={14} color="white" strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PING CONFIRM MODAL — new design showing LHC times */}
      <AnimatePresence>
        {showPingConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 flex items-end justify-center"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowPingConfirm(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg rounded-t-3xl overflow-hidden"
              style={{ background: 'white', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            >
              {/* Header */}
              <div className="px-5 pt-5 pb-4"
                style={{ background: 'linear-gradient(135deg, #1A4A1A, #2E6B2E)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <span style={{ fontSize: '24px' }}>📡</span>
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>Before You Locate…</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                      Could you walk or cycle instead?
                    </div>
                  </div>
                </div>

                {/* LHC travel times */}
                <div className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.06em' }}>
                    📚 TIME TO REACH {locateDest.name.toUpperCase()} FROM HERE
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 py-2.5 px-3 rounded-xl"
                      style={{ background: 'rgba(34,197,94,0.18)', border: '1px solid rgba(34,197,94,0.25)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#4ADE80' }}>🚶 {walkToDest}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>by foot</div>
                    </div>
                    <div className="flex-1 py-2.5 px-3 rounded-xl"
                      style={{ background: 'rgba(251,191,36,0.18)', border: '1px solid rgba(251,191,36,0.25)' }}>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#FCD34D' }}>🚲 {cycleToDest}</div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '1px' }}>by cycle</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '8px', textAlign: 'center' }}>
                    Distance: {formatDist(distToDest)} via campus road
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 flex flex-col gap-2">
                {/* Eco options */}
                <div className="flex gap-2 mb-1">
                  <button
                    onClick={() => { setShowPingConfirm(false); navigate('/compare', { state: { mode: 'walk' } }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl"
                    style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC' }}
                  >
                    <span style={{ fontSize: '14px' }}>🚶</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#15803D' }}>Walk Instead</span>
                  </button>
                  <button
                    onClick={() => { setShowPingConfirm(false); navigate('/compare', { state: { mode: 'cycle' } }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl"
                    style={{ background: '#FDF4F4', border: '1.5px solid #E8D0D0' }}
                  >
                    <span style={{ fontSize: '14px' }}>🚲</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#8B1A1A' }}>Cycle Instead</span>
                  </button>
                </div>

                {/* Confirm ping */}
                <button
                  onClick={startPing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl"
                  style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)', boxShadow: '0 6px 20px rgba(139,26,26,0.3)' }}
                >
                  <Radio size={16} color="white" strokeWidth={2.5} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Confirm Locate & Show Map 🛺</span>
                </button>
                <button onClick={() => setShowPingConfirm(false)}
                  className="w-full py-2 rounded-xl"
                  style={{ fontSize: '13px', color: '#9B7070' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEARCH OVERLAY */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50"
            style={{ background: 'rgba(44,10,10,0.6)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="w-full max-w-lg mx-auto rounded-b-3xl overflow-hidden"
              style={{ background: 'white', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}
            >
              <div className="px-4 pt-4 pb-2" style={{ borderBottom: '1px solid #F0EEEE' }}>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl"
                  style={{ background: '#FBF5F5', border: '1.5px solid #E8D0D0' }}>
                  <Search size={16} color="#8B1A1A" strokeWidth={2.5} />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search campus locations…"
                    className="flex-1 bg-transparent outline-none"
                    style={{ fontSize: '14px', color: '#1A1A1A' }}
                  />
                  <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                    <X size={16} color="#9B7070" />
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredLocations.length === 0 ? (
                  <div className="py-8 text-center" style={{ color: '#9B7070', fontSize: '13px' }}>No locations found</div>
                ) : (
                  filteredLocations.map(loc => {
                    const dist = haversine(userLoc[0], userLoc[1], loc.lat, loc.lng);
                    return (
                      <button
                        key={loc.id}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left"
                        style={{ borderBottom: '1px solid #F8F5F5' }}
                        onClick={() => {
                          setSearchOpen(false);
                          setSearchQuery('');
                          setSelectedDestination(loc);
                          setMapUnlocked(false);
                          setShowPingConfirm(true);
                        }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#FDF4F4', border: '1.5px solid #E8D0D0' }}>
                          <span style={{ fontSize: '18px' }}>{loc.icon}</span>
                        </div>
                        <div className="flex-1">
                          <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A' }}>{loc.name}</div>
                          <div style={{ fontSize: '11px', color: '#9B7070' }}>{loc.description}</div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span style={{ fontSize: '11px', color: '#8B1A1A', fontWeight: 600 }}>{formatDist(dist)}</span>
                          <ArrowRight size={12} color="#C8B0B0" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PING FAB */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => !pinging && setShowPingConfirm(true)}
        className="absolute z-20 flex flex-col items-center justify-center rounded-3xl"
        style={{
          bottom: sheetOpen ? '300px' : '130px', right: '14px',
          width: '62px', height: '62px',
          background: pinging
            ? 'linear-gradient(135deg, #22C55E, #16A34A)'
            : 'linear-gradient(135deg, #8B1A1A, #A52A2A)',
          boxShadow: pinging
            ? '0 0 0 8px rgba(34,197,94,0.18), 0 8px 28px rgba(34,197,94,0.45)'
            : '0 0 0 8px rgba(139,26,26,0.12), 0 8px 28px rgba(139,26,26,0.4)',
          transition: 'bottom 0.3s ease, background 0.3s ease',
        }}
      >
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2.2, repeat: Infinity }}
          className="absolute inset-0 rounded-3xl"
          style={{ background: pinging ? 'rgba(34,197,94,0.3)' : 'rgba(139,26,26,0.25)' }}
        />
        <Radio size={20} color="white" strokeWidth={2.5} />
        <span style={{ fontSize: '8px', fontWeight: 800, color: 'white', marginTop: '2px' }}>
          {pinging ? 'LOCATING' : 'LOCATE'}
        </span>
      </motion.button>

      {/* BOTTOM SHEET */}
      <motion.div
        animate={{ height: sheetOpen ? '290px' : '112px' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="absolute bottom-0 left-0 right-0 z-20 rounded-t-3xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', boxShadow: '0 -4px 24px rgba(139,26,26,0.08)' }}
      >
        <button onClick={() => setSheetOpen(o => !o)} className="w-full flex flex-col items-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: '#D4B8B8' }} />
        </button>
        <div className="px-4 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: mapUnlocked ? '#22C55E' : '#9B9B9B' }} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A1A' }}>
                  {mapUnlocked
                    ? `${autos.filter(a => a.seatsUsed < a.seatsTotal).length} Autos Live`
                    : 'Tap LOCATE to reveal autos'}
                </span>
              </div>
              {mapUnlocked && nearestAuto && (
                <span style={{ fontSize: '11px', color: '#8B1A1A', fontWeight: 600 }}>
                  Nearest: {formatDist(haversine(userLoc[0], userLoc[1], nearestAuto.lat, nearestAuto.lng))}
                </span>
              )}
            </div>
            <button
              onClick={() => navigate('/compare')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl"
              style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)', boxShadow: '0 3px 10px rgba(139,26,26,0.3)' }}
            >
              <Clock size={12} color="white" strokeWidth={2.5} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>Compare</span>
            </button>
          </div>

          <AnimatePresence>
            {sheetOpen && mapUnlocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-2 overflow-y-auto"
                style={{ maxHeight: '200px' }}
              >
                {sortedAutos.map((auto, idx) => {
                  const dist = haversine(userLoc[0], userLoc[1], auto.lat, auto.lng);
                  const sc = seatBadgeStyle(auto.seatsUsed, auto.seatsTotal);
                  const eta = formatTimeExact(autoTimeSeconds(campusDistance(userLoc[0], userLoc[1], auto.lat, auto.lng)));
                  return (
                    <motion.button
                      key={auto.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => { setSelectedAuto(auto); setSheetOpen(false); }}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left"
                      style={{ background: '#FBF5F5', border: '1.5px solid #EDE0E0' }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#FEF9C3', border: '1.5px solid #FDE68A' }}>
                        <span style={{ fontSize: '18px' }}>🛺</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A' }}>{auto.driver}</span>
                        {auto.isEV && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded-md"
                            style={{ fontSize: '9px', fontWeight: 700, color: '#15803D', background: '#DCFCE7' }}>⚡ EV</span>
                        )}
                        <div style={{ fontSize: '11px', color: '#9B9B9B' }}>ETA: {eta} · {formatDist(dist)}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ fontSize: '10px', fontWeight: 700, color: sc.text, background: sc.bg, border: `1px solid ${sc.border}` }}>
                        {auto.seats}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
            {sheetOpen && !mapUnlocked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-6 gap-2">
                <span style={{ fontSize: '28px' }}>🔒</span>
                <span style={{ fontSize: '12px', color: '#9B7070', textAlign: 'center' }}>
                  Press LOCATE to unlock auto locations
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ECO MOTIVATION POPUP */}
      <AnimatePresence>
        {showMotivation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(10,4,4,0.7)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="w-full rounded-3xl overflow-hidden"
              style={{ background: 'white', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', maxWidth: '440px' }}
            >
              <div className="px-5 pt-5 pb-4 relative"
                style={{ background: 'linear-gradient(135deg, #064E3B, #065F46)' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '28px' }}>🌿</span>
                    <div>
                      <div style={{ fontSize: '17px', fontWeight: 800, color: 'white' }}>Go Green Today!</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>IIT Delhi Campus Mobility</div>
                    </div>
                  </div>
                  <button onClick={() => setShowMotivation(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.12)' }}>
                    <X size={14} color="white" />
                  </button>
                </div>
                <div className="px-3 py-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>
                    💡 {motivationFact}
                  </span>
                </div>
              </div>
              <div className="px-4 pt-3 pb-2">
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#9B7070', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  WHY WALK OR CYCLE TODAY?
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { icon: '🏃', title: 'Stay Fit', desc: 'Burn calories & boost energy for class', color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
                    { icon: '🌍', title: 'Save Carbon', desc: '0.12 kg CO₂ saved per km on foot', color: '#0369A1', bg: '#F0F9FF', border: '#BAE6FD' },
                    { icon: '🏆', title: 'Climb Leaderboard', desc: 'Earn eco points — beat your batchmates!', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
                  ].map((b, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                      style={{ background: b.bg, border: `1.5px solid ${b.border}` }}>
                      <span style={{ fontSize: '20px', flexShrink: 0 }}>{b.icon}</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: b.color }}>{b.title}</div>
                        <div style={{ fontSize: '10px', color: '#6B6B6B' }}>{b.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowMotivation(false); navigate('/compare', { state: { mode: 'walk' } }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)', boxShadow: '0 4px 16px rgba(22,163,74,0.3)' }}
                  >
                    <span style={{ fontSize: '16px' }}>🚶</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Let's Walk!</span>
                  </button>
                  <button
                    onClick={() => { setShowMotivation(false); navigate('/compare', { state: { mode: 'cycle' } }); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl"
                    style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)', boxShadow: '0 4px 16px rgba(139,26,26,0.3)' }}
                  >
                    <span style={{ fontSize: '16px' }}>🚲</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Let's Cycle!</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowMotivation(false)}
                  className="w-full py-2.5 rounded-2xl"
                  style={{ background: '#F8F5F5', border: '1px solid #E8E0E0' }}
                >
                  <span style={{ fontSize: '12px', color: '#9B7070', fontWeight: 600 }}>Maybe Later</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
