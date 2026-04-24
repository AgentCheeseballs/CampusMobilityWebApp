import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MockAuto, MockBus, BusStop, ARAVALI_HOSTEL, CAMPUS_LOCATIONS } from '../data/mockData';
import { haversine, generateRoutePoints, campusDistance, formatDist, formatTimeExact, walkTimeSeconds, cycleTimeSeconds } from '../utils/geo';

export interface RouteConfig {
  destination: [number, number];
  destinationName: string;
  mode: 'walk' | 'cycle';
}

interface Props {
  autos: MockAuto[];
  buses?: MockBus[];
  busStops?: BusStop[];
  userLocation: [number, number] | null;
  pinging: boolean;
  pingRadius: number;
  onAutoClick?: (auto: MockAuto) => void;
  onLocationUpdate?: (loc: [number, number]) => void;
  selectedAutoId?: number | null;
  route?: RouteConfig | null;
}

const IITD_RED = '#8B1A1A';
const WALK_COLOR = '#15803D';
const CYCLE_COLOR = '#8B1A1A';

function seatColor(used: number, total: number): string {
  if (used === total) return '#EF4444';
  if (used >= 2) return '#F97316';
  return '#22C55E';
}

function capacityColor(cap: MockBus['capacity']) {
  if (cap === 'high') return '#EF4444';
  if (cap === 'medium') return '#F97316';
  return '#22C55E';
}

function createAutoIcon(auto: MockAuto) {
  const col = seatColor(auto.seatsUsed, auto.seatsTotal);
  return L.divIcon({
    html: `
      <div style="position:relative;cursor:pointer">
        <div style="
          background:white;border:2px solid #E5E0E0;border-radius:12px;
          padding:5px 9px;display:flex;align-items:center;gap:4px;
          box-shadow:0 4px 16px rgba(139,26,26,0.15);white-space:nowrap;
          font-family:'Plus Jakarta Sans',sans-serif;
        ">
          <span style="font-size:16px">🛺</span>
          <div>
            <div style="font-size:10px;font-weight:700;color:#1A1A1A">${auto.driver.split(' ')[0]}</div>
            <div style="font-size:9px;color:#6B6B6B">${auto.isEV ? '⚡ EV' : 'CNG'}</div>
          </div>
        </div>
        <div style="
          position:absolute;top:-8px;right:-4px;
          background:${col};color:white;border-radius:10px;
          padding:2px 6px;font-size:9px;font-weight:800;
          font-family:'Plus Jakarta Sans',sans-serif;
          border:1.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);
        ">${auto.seats}</div>
        <div style="
          width:8px;height:8px;background:white;border:2px solid #E5E0E0;
          transform:rotate(45deg);position:absolute;bottom:-5px;left:50%;margin-left:-4px;
          box-shadow:2px 2px 4px rgba(0,0,0,0.1);
        "></div>
      </div>`,
    className: '',
    iconSize: [96, 48],
    iconAnchor: [48, 52],
    popupAnchor: [0, -54],
  });
}

function createBusIcon(bus: MockBus) {
  const capCol = capacityColor(bus.capacity);
  const capLabel = bus.capacity === 'low' ? 'Empty' : bus.capacity === 'medium' ? 'Mod.' : 'Full';
  return L.divIcon({
    html: `
      <div style="position:relative;cursor:pointer">
        <div style="
          background:white;border:2px solid ${bus.color};border-radius:12px;
          padding:5px 9px;display:flex;align-items:center;gap:4px;
          box-shadow:0 4px 16px rgba(0,0,0,0.15);white-space:nowrap;
          font-family:'Plus Jakarta Sans',sans-serif;
        ">
          <span style="font-size:16px">🚌</span>
          <div>
            <div style="font-size:10px;font-weight:700;color:${bus.color}">Route ${bus.routeNo}</div>
            <div style="font-size:9px;color:#6B6B6B">${bus.via}</div>
          </div>
        </div>
        <div style="
          position:absolute;top:-8px;right:-4px;
          background:${capCol};color:white;border-radius:10px;
          padding:2px 6px;font-size:9px;font-weight:800;
          font-family:'Plus Jakarta Sans',sans-serif;
          border:1.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);
        ">${bus.minutesToIITD}m</div>
        <div style="
          width:8px;height:8px;background:white;border:2px solid ${bus.color};
          transform:rotate(45deg);position:absolute;bottom:-5px;left:50%;margin-left:-4px;
          box-shadow:2px 2px 4px rgba(0,0,0,0.1);
        "></div>
      </div>`,
    className: '',
    iconSize: [96, 48],
    iconAnchor: [48, 52],
    popupAnchor: [0, -54],
  });
}

function createBusStopIcon(stop: BusStop) {
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="
          background:#1D4ED8;color:white;border-radius:50%;
          width:22px;height:22px;display:flex;align-items:center;justify-content:center;
          font-size:12px;border:2.5px solid white;box-shadow:0 2px 8px rgba(29,78,216,0.4);
        ">🚏</div>
        <div style="
          background:rgba(255,255,255,0.95);border:1px solid #93C5FD;border-radius:8px;
          padding:2px 6px;font-size:8px;font-weight:600;color:#1D4ED8;
          margin-top:2px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.15);
          font-family:'Plus Jakarta Sans',sans-serif;
        ">${stop.name}</div>
      </div>`,
    className: '',
    iconSize: [100, 40],
    iconAnchor: [11, 11],
  });
}

function createUserIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:44px;height:44px">
        <div style="position:absolute;width:44px;height:44px;background:rgba(139,26,26,0.12);border-radius:50%;animation:iitd-pulse 2.2s ease-in-out infinite"></div>
        <div style="position:absolute;width:28px;height:28px;background:rgba(139,26,26,0.18);border-radius:50%;animation:iitd-pulse 2.2s ease-in-out 0.4s infinite"></div>
        <div style="width:14px;height:14px;background:#8B1A1A;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(139,26,26,0.5);position:relative;z-index:2"></div>
      </div>
      <style>
        @keyframes iitd-pulse{0%,100%{transform:scale(0.8);opacity:0.6}50%{transform:scale(1.1);opacity:0.2}}
      </style>`,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createCheckpointIcon(n: number, mode: 'walk' | 'cycle', label: string) {
  const color = mode === 'walk' ? WALK_COLOR : CYCLE_COLOR;
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;cursor:default">
        <div style="
          background:${color};color:white;border-radius:50%;
          width:22px;height:22px;display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:800;border:2px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          font-family:'Plus Jakarta Sans',sans-serif;
        ">${n}</div>
        ${label ? `<div style="
          background:white;border:1.5px solid ${color};border-radius:8px;
          padding:2px 6px;font-size:9px;font-weight:600;color:${color};
          margin-top:2px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.1);
          font-family:'Plus Jakarta Sans',sans-serif;
        ">${label}</div>` : ''}
      </div>`,
    className: '',
    iconSize: [80, label ? 44 : 26],
    iconAnchor: [11, 11],
  });
}

function createDestinationIcon(name: string, mode: 'walk' | 'cycle') {
  const color = mode === 'walk' ? WALK_COLOR : CYCLE_COLOR;
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center">
        <div style="
          background:${color};color:white;border-radius:12px;
          padding:5px 10px;font-size:11px;font-weight:700;
          box-shadow:0 4px 16px rgba(0,0,0,0.25);white-space:nowrap;
          font-family:'Plus Jakarta Sans',sans-serif;
          border:2px solid white;
        ">🏁 ${name}</div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};margin-top:-1px"></div>
      </div>`,
    className: '',
    iconSize: [140, 40],
    iconAnchor: [70, 40],
  });
}

export function IITDelhiMap({
  autos, buses = [], busStops = [], userLocation, pinging, pingRadius, onAutoClick,
  onLocationUpdate, selectedAutoId, route
}: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const autoMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const busMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const pingCircleRef = useRef<L.Circle | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ARAVALI_HOSTEL,
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Satellite-style basemap
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles © Esri',
    }).addTo(map);

    // Campus boundary
    L.polygon([
      [28.5398, 77.1875], [28.5398, 77.2005],
      [28.5515, 77.2005], [28.5515, 77.1875],
    ], {
      color: '#FFD700', fillColor: '#FFD700', fillOpacity: 0.03,
      weight: 2, dashArray: '6,5', opacity: 0.6,
    }).addTo(map);

    // IIT Delhi label
    L.marker([28.5540, 77.1930], {
      icon: L.divIcon({
        html: `<div style="
          background:linear-gradient(135deg,#8B1A1A,#A52A2A);
          color:white;padding:4px 10px;border-radius:20px;
          font-size:11px;font-weight:700;white-space:nowrap;
          font-family:'Plus Jakarta Sans',sans-serif;
          box-shadow:0 2px 8px rgba(139,26,26,0.5);
          border:1px solid rgba(255,255,255,0.3);
        ">🎓 IIT Delhi Campus</div>`,
        className: '', iconSize: [140, 24], iconAnchor: [70, 12],
      }),
    }).addTo(map);

    // Bus stops (static)
    busStops.forEach(stop => {
      L.marker([stop.lat, stop.lng], { icon: createBusStopIcon(stop) }).addTo(map);
    });

    routeLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // GPS — fall back to Aravali Hostel
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => onLocationUpdate?.([pos.coords.latitude, pos.coords.longitude]),
        () => onLocationUpdate?.(ARAVALI_HOSTEL),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      onLocationUpdate?.(ARAVALI_HOSTEL);
    }

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // User marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLocation);
    } else {
      userMarkerRef.current = L.marker(userLocation, { icon: createUserIcon(), zIndexOffset: 1000 }).addTo(map);
    }
  }, [userLocation]);

  // Auto markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    autos.forEach(auto => {
      const pos: [number, number] = [auto.lat, auto.lng];
      const existing = autoMarkersRef.current.get(auto.id);
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(createAutoIcon(auto));
      } else {
        const m = L.marker(pos, { icon: createAutoIcon(auto) })
          .addTo(map)
          .on('click', () => onAutoClick?.(auto));
        const distText = userLocation
          ? `${(haversine(userLocation[0], userLocation[1], auto.lat, auto.lng) * 1000).toFixed(0)} m away`
          : '';
        m.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:160px">
            <div style="font-weight:700;color:#1A1A1A;margin-bottom:4px">🛺 ${auto.driver}</div>
            <div style="font-size:12px;color:#6B6B6B;margin-bottom:2px">${auto.vehicleNo}</div>
            <div style="font-size:12px;margin-bottom:6px">Seats: <strong style="color:${seatColor(auto.seatsUsed, auto.seatsTotal)}">${auto.seats}</strong></div>
            ${distText ? `<div style="font-size:11px;color:#8B1A1A;font-weight:600">📍 ${distText}</div>` : ''}
            ${auto.isEV ? '<div style="font-size:11px;color:#16A34A;font-weight:600;margin-top:2px">⚡ Electric Vehicle</div>' : ''}
          </div>
        `, { maxWidth: 200 });
        autoMarkersRef.current.set(auto.id, m);
      }
    });
  }, [autos, userLocation]);

  // Bus markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    buses.forEach(bus => {
      const pos: [number, number] = [bus.lat, bus.lng];
      const existing = busMarkersRef.current.get(bus.id);
      if (existing) {
        existing.setLatLng(pos);
        existing.setIcon(createBusIcon(bus));
      } else {
        const m = L.marker(pos, { icon: createBusIcon(bus), zIndexOffset: 500 }).addTo(map);
        m.bindPopup(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;min-width:170px">
            <div style="font-weight:700;color:${bus.color};margin-bottom:4px">🚌 Route ${bus.routeNo}</div>
            <div style="font-size:12px;color:#1A1A1A;margin-bottom:2px">To: <strong>${bus.destination}</strong></div>
            <div style="font-size:11px;color:#6B6B6B;margin-bottom:6px">via ${bus.via}</div>
            <div style="font-size:11px;font-weight:700;color:#059669">~${bus.minutesToIITD} min to IIT Main Gate</div>
            <div style="font-size:10px;margin-top:3px">Crowd: <strong style="color:${capacityColor(bus.capacity)}">${bus.capacity === 'low' ? 'Empty 😊' : bus.capacity === 'medium' ? 'Moderate' : 'Crowded 😬'}</strong></div>
          </div>
        `, { maxWidth: 210 });
        busMarkersRef.current.set(bus.id, m);
      }
    });
  }, [buses]);

  // Selected auto
  useEffect(() => {
    if (!selectedAutoId) return;
    const marker = autoMarkersRef.current.get(selectedAutoId);
    if (marker) { marker.openPopup(); mapRef.current?.setView(marker.getLatLng(), 17, { animate: true }); }
  }, [selectedAutoId]);

  // Ping animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;
    if (pinging && pingRadius > 0) {
      if (pingCircleRef.current) {
        pingCircleRef.current.setRadius(pingRadius);
        pingCircleRef.current.setStyle({ opacity: Math.max(0, 1 - pingRadius / 500) * 0.7, fillOpacity: Math.max(0, 1 - pingRadius / 500) * 0.08 });
      } else {
        pingCircleRef.current = L.circle(userLocation, {
          radius: pingRadius, color: IITD_RED, fillColor: IITD_RED,
          fillOpacity: 0.08, weight: 2, opacity: 0.7,
        }).addTo(map);
      }
    } else {
      pingCircleRef.current?.remove();
      pingCircleRef.current = null;
    }
  }, [pinging, pingRadius, userLocation]);

  // Route drawing
  useEffect(() => {
    const map = mapRef.current;
    const layer = routeLayerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    if (!route || !userLocation) return;

    const { destination, destinationName, mode } = route;
    const color = mode === 'walk' ? WALK_COLOR : CYCLE_COLOR;
    const routePoints = generateRoutePoints(userLocation, destination, 5);

    // Shadow polyline
    L.polyline(routePoints, {
      color: 'rgba(0,0,0,0.2)',
      weight: 7,
      opacity: 1,
      lineCap: 'round',
    }).addTo(layer);

    // Main polyline
    L.polyline(routePoints, {
      color,
      weight: 4.5,
      opacity: 0.9,
      dashArray: mode === 'walk' ? '10,8' : undefined,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(layer);

    // Checkpoints
    const totalDist = campusDistance(userLocation[0], userLocation[1], destination[0], destination[1]);
    const segmentDist = totalDist / (routePoints.length - 1);

    routePoints.slice(1, -1).forEach((pt, i) => {
      const distSoFar = segmentDist * (i + 1);
      const secSoFar = mode === 'walk' ? walkTimeSeconds(distSoFar) : cycleTimeSeconds(distSoFar);

      let cpLabel = formatDist(distSoFar);
      let nearestDist = Infinity;
      CAMPUS_LOCATIONS.forEach(loc => {
        const d = haversine(pt[0], pt[1], loc.lat, loc.lng) * 1000;
        if (d < 180 && d < nearestDist) {
          nearestDist = d;
          cpLabel = loc.name.split(' ').slice(0, 2).join(' ');
        }
      });

      L.marker(pt, { icon: createCheckpointIcon(i + 1, mode, '') })
        .addTo(layer)
        .bindTooltip(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif">
            <div style="font-weight:700;color:${color}">Checkpoint ${i + 1}</div>
            <div style="font-size:11px;color:#1A1A1A">${cpLabel}</div>
            <div style="font-size:11px;color:#6B6B6B">${formatTimeExact(secSoFar)} from start</div>
          </div>
        `, { permanent: false, direction: 'top', className: 'iitd-tooltip' });
    });

    // Destination marker
    L.marker(destination, { icon: createDestinationIcon(destinationName, mode) }).addTo(layer);

    const bounds = L.latLngBounds([userLocation, destination]);
    map.fitBounds(bounds, { padding: [60, 60], animate: true, duration: 0.8 });
  }, [route, userLocation]);

  return <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />;
}