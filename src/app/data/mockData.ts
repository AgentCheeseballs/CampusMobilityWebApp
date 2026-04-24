export interface CampusLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon: string;
  description: string;
}

export interface MockAuto {
  id: number;
  lat: number;
  lng: number;
  seats: string;
  seatsUsed: number;
  seatsTotal: number;
  driver: string;
  rating: number;
  vehicleNo: string;
  isEV: boolean;
}

export interface MockBus {
  id: number;
  lat: number;
  lng: number;
  routeNo: string;
  destination: string;
  via: string;
  minutesToIITD: number;
  capacity: 'low' | 'medium' | 'high';
  color: string;
}

export interface BusStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  routes: string[];
}

export interface LeaderboardEntry {
  id: number;
  name: string;
  dept: string;
  year: string;
  rollNo: string;
  walkKm: number;
  cycleKm: number;
  autoRides: number;
  co2Saved: number;
  streak: number;
  ecoScore: number;
  avatar: string;
}

export const IIT_DELHI_CENTER: [number, number] = [28.5457, 77.1926];
export const ARAVALI_HOSTEL: [number, number] = [28.5428, 77.1898];

export const CAMPUS_LOCATIONS: CampusLocation[] = [
  { id: 'main_gate', name: 'Main Gate (Gate 1)', lat: 28.5482, lng: 77.1931, icon: '🏛️', description: 'Main entrance, Hauz Khas' },
  { id: 'lhc', name: 'Lecture Hall Complex', lat: 28.5456, lng: 77.1928, icon: '📚', description: 'Central academic hub' },
  { id: 'library', name: 'Nalanda Library', lat: 28.5440, lng: 77.1919, icon: '📖', description: 'Central research library' },
  { id: 'sac', name: 'SAC (Student Activity Centre)', lat: 28.5478, lng: 77.1951, icon: '⚽', description: 'Student clubs & activities' },
  { id: 'metro', name: 'IIT Delhi Metro Station', lat: 28.5450, lng: 77.1874, icon: '🚇', description: 'Yellow Line, Gate 4' },
  { id: 'sports', name: 'Sports Complex', lat: 28.5408, lng: 77.1922, icon: '🏃', description: 'Gymnasium & cricket ground' },
  { id: 'karakoram', name: 'Karakoram Hostel', lat: 28.5501, lng: 77.1904, icon: '🏠', description: 'North hostel zone' },
  { id: 'aravali', name: 'Aravali Hostel', lat: 28.5428, lng: 77.1898, icon: '🏠', description: 'South hostel zone' },
  { id: 'bharti', name: 'Bharti Building (CSE)', lat: 28.5470, lng: 77.1971, icon: '💻', description: 'CS & AI departments' },
  { id: 'gate2', name: 'South Gate (Gate 2)', lat: 28.5400, lng: 77.1934, icon: '🚪', description: 'IIT Road entrance' },
  { id: 'dogra', name: 'Dogra Hall', lat: 28.5493, lng: 77.1954, icon: '🏢', description: 'Administrative block' },
  { id: 'nilgiri', name: 'Nilgiri Hostel', lat: 28.5436, lng: 77.1899, icon: '🏠', description: 'Old hostel complex' },
];

export const BUS_STOPS: BusStop[] = [
  { id: 'lhc_stop', name: 'LHC Circle', lat: 28.5456, lng: 77.1930, routes: ['S1', 'S2'] },
  { id: 'main_gate_stop', name: 'Main Gate', lat: 28.5490, lng: 77.1932, routes: ['S1', 'S2'] },
  { id: 'hostel_stop', name: 'Hostel Area', lat: 28.5430, lng: 77.1900, routes: ['S1'] },
  { id: 'sac_stop', name: 'SAC Stop', lat: 28.5478, lng: 77.1950, routes: ['S2'] },
  { id: 'bharti_stop', name: 'Bharti Building', lat: 28.5470, lng: 77.1970, routes: ['S1', 'S2'] },
];

export const CAMPUS_SHUTTLE_SCHEDULE = {
  S1: {
    name: 'Blue Line S1',
    color: '#2563EB',
    emoji: '🔵',
    route: ['Main Gate', 'LHC Circle', 'Bharti Building', 'Hostel Area', 'Main Gate'],
    departures: ['07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '17:30', '18:00', '18:30', '19:00'],
    frequency: '~30 min',
    loopTime: 15,
  },
  S2: {
    name: 'Green Line S2',
    color: '#16A34A',
    emoji: '🟢',
    route: ['Main Gate', 'SAC Stop', 'Bharti Building', 'LHC Circle', 'Main Gate'],
    departures: ['07:45', '08:15', '08:45', '09:15', '09:45', '10:15', '10:45', '11:15', '12:15', '13:15', '14:15', '15:15', '16:15', '17:15', '17:45', '18:15', '18:45', '19:15'],
    frequency: '~30 min',
    loopTime: 12,
  },
};

export const MOCK_BUSES: MockBus[] = [
  {
    id: 101, lat: 28.5470, lng: 77.1940, routeNo: 'S1',
    destination: 'Hostel Area', via: 'LHC → Bharti', minutesToIITD: 4,
    capacity: 'medium', color: '#2563EB',
  },
  {
    id: 102, lat: 28.5485, lng: 77.1955, routeNo: 'S2',
    destination: 'LHC Circle', via: 'SAC → Bharti', minutesToIITD: 6,
    capacity: 'low', color: '#16A34A',
  },
];

export const MOCK_AUTOS: MockAuto[] = [
  {
    id: 1, lat: 28.5481, lng: 77.1929, seats: '2/3',
    seatsUsed: 2, seatsTotal: 3, driver: 'Ramesh Kumar',
    rating: 4.8, vehicleNo: 'DL 1RA 2341', isEV: true,
  },
  {
    id: 2, lat: 28.5452, lng: 77.1876, seats: '1/3',
    seatsUsed: 1, seatsTotal: 3, driver: 'Suresh Yadav',
    rating: 4.6, vehicleNo: 'DL 1RA 8823', isEV: true,
  },
  {
    id: 3, lat: 28.5454, lng: 77.1927, seats: '3/3',
    seatsUsed: 3, seatsTotal: 3, driver: 'Prakash Lal',
    rating: 4.9, vehicleNo: 'DL 1RA 5512', isEV: false,
  },
  {
    id: 4, lat: 28.5499, lng: 77.1906, seats: '2/3',
    seatsUsed: 2, seatsTotal: 3, driver: 'Vinod Singh',
    rating: 4.7, vehicleNo: 'DL 1RA 1190', isEV: true,
  },
  {
    id: 5, lat: 28.5406, lng: 77.1924, seats: '1/3',
    seatsUsed: 1, seatsTotal: 3, driver: 'Manoj Sharma',
    rating: 4.5, vehicleNo: 'DL 1RA 7743', isEV: false,
  },
];

const makeEntry = (
  id: number, name: string, dept: string, year: string,
  rollNo: string, walkKm: number, cycleKm: number,
  autoRides: number, streak: number
): LeaderboardEntry => ({
  id, name, dept, year, rollNo,
  walkKm: Math.round(walkKm * 10) / 10,
  cycleKm: Math.round(cycleKm * 10) / 10,
  autoRides,
  co2Saved: Math.round((walkKm + cycleKm) * 0.12 * 10) / 10,
  streak,
  ecoScore: Math.round((walkKm + cycleKm) * 10) / 10,
  avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2),
});

export const BASE_LEADERBOARD: LeaderboardEntry[] = [
  makeEntry(1,  'Priya Sharma',       'EE',  '4th Year', '2020EE014', 145.2, 102.1, 8,  24),
  makeEntry(2,  'Arjun Mehta',        'CSE', '3rd Year', '2021CS032', 138.5, 97.8,  12, 21),
  makeEntry(3,  'Rohan Verma',        'ME',  '2nd Year', '2022ME007', 131.0, 91.4,  15, 18),
  makeEntry(4,  'Anjali Singh',       'CE',  '3rd Year', '2021CE021', 128.3, 84.7,  10, 16),
  makeEntry(5,  'Vikram Nair',        'CH',  '4th Year', '2020CH003', 122.8, 79.3,  19, 14),
  makeEntry(6,  'Neha Patel',         'PH',  '1st Year', '2023PH018', 118.5, 72.6,  9,  13),
  makeEntry(7,  'Karthik Rajan',      'BB',  '3rd Year', '2021BB011', 113.2, 68.9,  11, 12),
  makeEntry(8,  'Shreya Jain',        'CSE', '2nd Year', '2022CS044', 109.7, 65.4,  14, 11),
  makeEntry(9,  'Amit Kumar',         'EE',  '4th Year', '2020EE028', 105.3, 77.1,  7,  10),
  makeEntry(10, 'Divya Krishnan',     'ME',  '3rd Year', '2021ME033', 102.0, 62.8,  13, 9),
  makeEntry(11, 'Siddharth Rao',      'CE',  '2nd Year', '2022CE015', 98.4,  58.3,  16, 9),
  makeEntry(12, 'Meera Iyer',         'CH',  '1st Year', '2023CH009', 94.1,  54.7,  8,  8),
  makeEntry(13, 'Rahul Gupta',        'PH',  '4th Year', '2020PH022', 89.8,  61.2,  11, 8),
  makeEntry(14, 'Tanvi Agarwal',      'BB',  '3rd Year', '2021BB028', 85.6,  49.8,  9,  7),
  makeEntry(15, 'Harsh Pandey',       'CSE', '2nd Year', '2022CS061', 81.3,  45.4,  17, 7),
  makeEntry(16, 'Pooja Mishra',       'EE',  '1st Year', '2023EE037', 77.0,  41.9,  6,  6),
  makeEntry(17, 'Nikhil Bansal',      'ME',  '3rd Year', '2021ME051', 72.8,  38.3,  14, 5),
  makeEntry(18, 'Riya Kapoor',        'CE',  '4th Year', '2020CE019', 68.5,  34.7,  10, 5),
  makeEntry(19, 'Aryan Sharma',       'CH',  '2nd Year', '2022CH026', 64.2,  31.1,  8,  4),
  makeEntry(20, 'Sneha Reddy',        'PH',  '1st Year', '2023PH041', 59.9,  27.5,  5,  3),
];

export const ACHIEVEMENTS = [
  { id: 'eco_starter',  icon: '🌱', label: 'Eco Starter',      desc: 'Complete your first eco trip (walk or cycle)',         threshold: 1   },
  { id: 'first_steps',  icon: '👣', label: 'First Steps',      desc: 'Walk your first 1 km on campus',                      threshold: 1   },
  { id: 'walker_10',    icon: '🚶', label: 'Walker 10K',       desc: 'Walk a cumulative 10 km on campus',                   threshold: 10  },
  { id: 'walker_25',    icon: '🥾', label: 'Trekker',          desc: 'Walk a cumulative 25 km on campus',                   threshold: 25  },
  { id: 'walker_50',    icon: '🏃', label: 'Distance Walker',  desc: 'Walk a cumulative 50 km on campus',                   threshold: 50  },
  { id: 'cyclist',      icon: '🚲', label: 'Cyclist',          desc: 'Cycle a cumulative 5 km on campus',                   threshold: 5   },
  { id: 'pedal_10',     icon: '🚴', label: 'Pedal Power',      desc: 'Cycle a cumulative 10 km on campus',                  threshold: 10  },
  { id: 'cyclist_25',   icon: '🏅', label: 'Cycling Pro',      desc: 'Cycle a cumulative 25 km on campus',                  threshold: 25  },
  { id: 'cyclist_50',   icon: '🏆', label: 'Cycle Champion',   desc: 'Cycle a cumulative 50 km on campus',                  threshold: 50  },
  { id: 'streak_7',     icon: '🔥', label: 'Week Streak',      desc: 'Maintain an active streak for 7 days straight',       threshold: 7   },
  { id: 'streak_14',    icon: '💥', label: 'Fortnight Fire',   desc: 'Maintain an active streak for 14 days straight',      threshold: 14  },
  { id: 'streak_30',    icon: '🌟', label: 'Monthly Blazer',   desc: 'Maintain an active streak for 30 days straight',      threshold: 30  },
  { id: 'auto_5',       icon: '🛺', label: 'Auto Rider',       desc: 'Take 5 auto rickshaw rides on campus',                threshold: 5   },
  { id: 'auto_20',      icon: '🚕', label: 'Auto Veteran',     desc: 'Take 20 auto rickshaw rides on campus',               threshold: 20  },
  { id: 'co2_hero',     icon: '🌍', label: 'CO₂ Hero',         desc: 'Save a cumulative 5 kg CO₂ via eco travel',           threshold: 5   },
  { id: 'co2_10',       icon: '🌳', label: 'Green Guardian',   desc: 'Save a cumulative 10 kg CO₂ via eco travel',          threshold: 10  },
  { id: 'co2_25',       icon: '🌲', label: 'Eco Champion',     desc: 'Save a cumulative 25 kg CO₂ via eco travel',          threshold: 25  },
  { id: 'eco_25',       icon: '⚡', label: 'Eco Warrior',      desc: 'Reach an eco score of 25 km (walk + cycle total)',     threshold: 25  },
  { id: 'eco_50',       icon: '🦾', label: 'Eco Machine',      desc: 'Reach an eco score of 50 km (walk + cycle total)',     threshold: 50  },
  { id: 'top_10',       icon: '🏆', label: 'Top 10',           desc: 'Appear in the top 10 on the campus leaderboard',      threshold: 10  },
  { id: 'top_5',        icon: '🥇', label: 'Campus Elite',     desc: 'Appear in the top 5 on the campus leaderboard',       threshold: 5   },
  { id: 'top_3',        icon: '👑', label: 'Podium Star',      desc: 'Reach the top 3 on the campus leaderboard',           threshold: 3   },
  { id: 'ev_backer',    icon: '🔋', label: 'EV Backer',        desc: 'Fund 10 % of an EV battery via eco trips',            threshold: 10  },
  { id: 'centurion',    icon: '💯', label: 'Centurion',        desc: 'Reach an eco score of 100 km total',                  threshold: 100 },
  { id: 'eco_200',      icon: '💎', label: 'Eco Legend',       desc: 'Reach a legendary eco score of 200 km total',         threshold: 200 },
];

export function getDeptColor(dept: string): { bg: string; text: string; border: string } {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    CSE: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    EE:  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
    ME:  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
    CE:  { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE' },
    CH:  { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3' },
    PH:  { bg: '#F0F9FF', text: '#075985', border: '#BAE6FD' },
    BB:  { bg: '#FEFCE8', text: '#A16207', border: '#FDE68A' },
    MA:  { bg: '#FDF4FF', text: '#7E22CE', border: '#E9D5FF' },
  };
  return map[dept] ?? { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}