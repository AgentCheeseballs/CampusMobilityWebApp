import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LogOut, TrendingUp, Award, Leaf, Battery, Zap,
  ChevronRight, Star, Trophy, Users, BarChart3, Flame, X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { BASE_LEADERBOARD, ACHIEVEMENTS, getDeptColor } from '../data/mockData';

function DeptBadge({ dept }: { dept: string }) {
  const c = getDeptColor(dept);
  return (
    <span className="px-2 py-0.5 rounded-lg"
      style={{ fontSize: '10px', fontWeight: 700, color: c.text, background: c.bg, border: `1px solid ${c.border}` }}>
      {dept}
    </span>
  );
}

const RANK_COLORS = [
  { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', text: '#78350F', glow: '0 4px 16px rgba(245,158,11,0.4)' },
  { bg: 'linear-gradient(135deg, #94A3B8, #64748B)', text: '#1E293B', glow: '0 4px 16px rgba(148,163,184,0.4)' },
  { bg: 'linear-gradient(135deg, #D97706, #B45309)', text: '#78350F', glow: '0 4px 16px rgba(217,119,6,0.35)' },
];

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<'stats' | 'leaderboard'>('stats');
  const [selectedAchievement, setSelectedAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);

  const fullLeaderboard = useMemo(() => {
    if (!user) return BASE_LEADERBOARD;
    const userEntry = {
      id: 999,
      name: user.name,
      dept: user.department,
      year: user.year,
      rollNo: user.rollNo,
      walkKm: Math.round(user.stats.walkKm * 10) / 10,
      cycleKm: Math.round(user.stats.cycleKm * 10) / 10,
      autoRides: user.stats.autoRides,
      co2Saved: Math.round((user.stats.walkKm + user.stats.cycleKm) * 0.12 * 10) / 10,
      streak: user.stats.streak,
      ecoScore: Math.round((user.stats.walkKm + user.stats.cycleKm) * 10) / 10,
      avatar: user.avatar,
    };
    const without = BASE_LEADERBOARD.filter(e => e.ecoScore !== userEntry.ecoScore);
    return [...without, userEntry].sort((a, b) => b.ecoScore - a.ecoScore).slice(0, 20);
  }, [user]);

  const userRank = fullLeaderboard.findIndex(e => e.id === 999) + 1;

  const donutData = [
    { name: 'Eco Trips', value: Math.round((user?.stats.walkKm ?? 0) + (user?.stats.cycleKm ?? 0)), color: '#22C55E' },
    { name: 'Auto Rides', value: (user?.stats.autoRides ?? 0) * 3, color: '#0EA5E9' },
  ];
  const totalEco = donutData[0].value + donutData[1].value || 1;

  const earned = ACHIEVEMENTS.filter(a => {
    if (a.id === 'eco_starter')  return (user?.stats.ecoScore ?? 0) >= a.threshold;
    if (a.id === 'first_steps')  return (user?.stats.walkKm ?? 0) >= a.threshold;
    if (a.id === 'walker_10')    return (user?.stats.walkKm ?? 0) >= a.threshold;
    if (a.id === 'walker_25')    return (user?.stats.walkKm ?? 0) >= a.threshold;
    if (a.id === 'walker_50')    return (user?.stats.walkKm ?? 0) >= a.threshold;
    if (a.id === 'cyclist')      return (user?.stats.cycleKm ?? 0) >= a.threshold;
    if (a.id === 'pedal_10')     return (user?.stats.cycleKm ?? 0) >= a.threshold;
    if (a.id === 'cyclist_25')   return (user?.stats.cycleKm ?? 0) >= a.threshold;
    if (a.id === 'cyclist_50')   return (user?.stats.cycleKm ?? 0) >= a.threshold;
    if (a.id === 'streak_7')     return (user?.stats.streak ?? 0) >= a.threshold;
    if (a.id === 'streak_14')    return (user?.stats.streak ?? 0) >= a.threshold;
    if (a.id === 'streak_30')    return (user?.stats.streak ?? 0) >= a.threshold;
    if (a.id === 'auto_5')       return (user?.stats.autoRides ?? 0) >= a.threshold;
    if (a.id === 'auto_20')      return (user?.stats.autoRides ?? 0) >= a.threshold;
    if (a.id === 'co2_hero')     return (user?.stats.co2Saved ?? 0) >= a.threshold;
    if (a.id === 'co2_10')       return (user?.stats.co2Saved ?? 0) >= a.threshold;
    if (a.id === 'co2_25')       return (user?.stats.co2Saved ?? 0) >= a.threshold;
    if (a.id === 'eco_25')       return (user?.stats.ecoScore ?? 0) >= a.threshold;
    if (a.id === 'eco_50')       return (user?.stats.ecoScore ?? 0) >= a.threshold;
    if (a.id === 'top_10')       return userRank > 0 && userRank <= 10;
    if (a.id === 'top_5')        return userRank > 0 && userRank <= 5;
    if (a.id === 'top_3')        return userRank > 0 && userRank <= 3;
    if (a.id === 'ev_backer')    return (user?.stats.ecoScore ?? 0) >= a.threshold;
    if (a.id === 'centurion')    return (user?.stats.ecoScore ?? 0) >= 100;
    if (a.id === 'eco_200')      return (user?.stats.ecoScore ?? 0) >= a.threshold;
    return false;
  });

  if (!user) return null;

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto" style={{ background: '#F8FAFF' }}>

      {/* PROFILE HEADER */}
      <div className="relative flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #2C0A0A 0%, #4A1212 100%)', paddingBottom: '24px' }}>
        {/* Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-16 -top-16 w-40 h-40 rounded-full" style={{ background: 'rgba(14,165,233,0.1)' }} />
          <div className="absolute -left-8 bottom-0 w-28 h-28 rounded-full" style={{ background: 'rgba(99,102,241,0.08)' }} />
        </div>

        <div className="relative px-5 pt-5 max-w-3xl mx-auto">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #0EA5E9, #6366F1)', boxShadow: '0 4px 16px rgba(14,165,233,0.4)' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{user.avatar}</span>
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: 'white' }}>{user.name}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <DeptBadge dept={user.department} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{user.year}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '1px' }}>{user.rollNo}</div>
              </div>
            </div>
            <button onClick={logout}
              className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: 'rgba(255,255,255,0.1)' }}>
              <LogOut size={15} color="rgba(255,255,255,0.7)" />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-2">
            {[
              { icon: '🌿', value: `${user.stats.ecoScore.toFixed(1)} km`, label: 'Eco Score', color: '#4ADE80' },
              { icon: '🏆', value: userRank > 0 ? `#${userRank}` : '--', label: 'Campus Rank', color: '#FCD34D' },
              { icon: '🔥', value: `${user.stats.streak}d`, label: 'Streak', color: '#FCA5A5' },
              { icon: '🌍', value: `${user.stats.co2Saved.toFixed(1)}kg`, label: 'CO₂ Saved', color: '#93C5FD' },
            ].map((s, i) => (
              <div key={i} className="flex-1 py-2.5 px-1 rounded-2xl flex flex-col items-center"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: '14px' }}>{s.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.value}</span>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TAB BAR */}
      <div className="flex mx-4 mt-4 mb-3 rounded-2xl p-1 flex-shrink-0 max-w-3xl md:mx-auto"
        style={{ background: '#F5F0F0' }}>
        {([
          { id: 'stats', label: 'My Stats', icon: <BarChart3 size={14} strokeWidth={2.5} /> },
          { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} strokeWidth={2.5} /> },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all"
            style={{
              background: tab === t.id ? 'white' : 'transparent',
              boxShadow: tab === t.id ? '0 2px 8px rgba(139,26,26,0.1)' : 'none',
              fontSize: '13px', fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? '#8B1A1A' : '#9B7070',
            }}
          >
            <span style={{ color: tab === t.id ? '#8B1A1A' : '#9B7070' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── STATS TAB ─── */}
      {tab === 'stats' && (
        <div className="px-4 pb-6 max-w-3xl mx-auto w-full">
          {/* Eco donut */}
          <div className="rounded-3xl p-4 mb-3"
            style={{ background: 'white', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Mobility Balance</div>
                <div style={{ fontSize: '11px', color: '#94A3B8' }}>Eco km vs auto rides</div>
              </div>
              <span className="px-2 py-1 rounded-lg"
                style={{ fontSize: '10px', fontWeight: 700, color: '#15803D', background: '#DCFCE7' }}>
                This Month
              </span>
            </div>
            <div className="flex items-center">
              <div style={{ width: '130px', height: '130px', position: 'relative', flexShrink: 0 }}>
                <PieChart width={130} height={130}>
                    <Pie data={donutData} cx={65} cy={65} innerRadius={38} outerRadius={58}
                      paddingAngle={4} dataKey="value" strokeWidth={0} startAngle={90} endAngle={-270}>
                      {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v} km`, '']} />
                </PieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ pointerEvents: 'none' }}>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                    {Math.round((donutData[0].value / totalEco) * 100)}%
                  </span>
                  <span style={{ fontSize: '9px', color: '#22C55E', fontWeight: 700 }}>ECO</span>
                </div>
              </div>
              <div className="flex-1 pl-4">
                {donutData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>{d.value} km</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{d.name}</div>
                    </div>
                  </div>
                ))}
                <div className="p-2 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div className="flex items-center gap-1">
                    <TrendingUp size={11} color="#16A34A" strokeWidth={2.5} />
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D' }}>
                      {user.stats.co2Saved.toFixed(1)}kg CO₂ saved total
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            {[
              { icon: '🚶', value: `${user.stats.walkKm.toFixed(1)} km`, label: 'Total Walked', color: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
              { icon: '🚲', value: `${user.stats.cycleKm.toFixed(1)} km`, label: 'Total Cycled', color: '#FDF4F4', border: '#E8D0D0', text: '#8B1A1A' },
              { icon: '🛺', value: `${user.stats.autoRides}`, label: 'Auto Rides', color: '#FEF9C3', border: '#FDE68A', text: '#92400E' },
              { icon: '⚡', value: `${user.stats.ecoScore.toFixed(1)}`, label: 'Eco Score', color: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
            ].map((s, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className="p-3 rounded-2xl"
                style={{ background: s.color, border: `1.5px solid ${s.border}` }}>
                <div style={{ fontSize: '20px', marginBottom: '3px' }}>{s.icon}</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: s.text }}>{s.value}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          {/* EV Battery Fund */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-3xl overflow-hidden mb-3 relative"
            style={{ background: 'linear-gradient(135deg, #064E3B, #065F46)', boxShadow: '0 6px 24px rgba(6,78,59,0.3)' }}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Battery size={18} color="#86EFAC" />
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#86EFAC' }}>EV BATTERY FUND</span>
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '12px', lineHeight: 1.5 }}>
                Your eco trips funded{' '}
                <span style={{ fontWeight: 800, color: '#6EE7B7' }}>
                  {Math.min(100, Math.round((user.stats.co2Saved / 20) * 100))}%
                </span>
                {' '}of an EV battery swap this month! 🌿
              </p>
              <div className="h-2.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(255,255,255,0.15)' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, Math.round((user.stats.co2Saved / 20) * 100))}%` }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #4ADE80, #86EFAC)' }}
                />
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                {Math.min(100, Math.round((user.stats.co2Saved / 20) * 100))}% of ₹12,000 EV battery goal
              </div>
            </div>
          </motion.div>

          {/* Achievements */}
          <div className="rounded-3xl p-4"
            style={{ background: 'white', border: '1.5px solid #E2E8F0', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Award size={16} color="#F59E0B" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#1E293B' }}>Achievements</span>
              <span style={{ fontSize: '12px', color: '#94A3B8', marginLeft: 'auto' }}>
                {earned.length}/{ACHIEVEMENTS.length}
              </span>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {ACHIEVEMENTS.map(a => {
                const isEarned = earned.some(e => e.id === a.id);
                return (
                  <button key={a.id} onClick={() => setSelectedAchievement(a)} className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background: isEarned ? '#FFF7ED' : '#F8FAFC',
                        border: `1.5px solid ${isEarned ? '#FED7AA' : '#E2E8F0'}`,
                        filter: isEarned ? 'none' : 'grayscale(1)',
                        opacity: isEarned ? 1 : 0.4,
                      }}>
                      <span style={{ fontSize: '20px' }}>{a.icon}</span>
                    </div>
                    <span style={{ fontSize: '8px', color: isEarned ? '#64748B' : '#CBD5E1', fontWeight: 600, textAlign: 'center', lineHeight: 1.2 }}>
                      {a.label}
                    </span>
                    {isEarned && <Star size={8} color="#F59E0B" fill="#F59E0B" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── LEADERBOARD TAB ─── */}
      {tab === 'leaderboard' && (
        <div className="px-4 pb-6 max-w-3xl mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} color="#6366F1" strokeWidth={2.5} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
              Campus Walking & Cycling Leaderboard
            </span>
          </div>

          {/* Podium – top 3 */}
          <div className="flex items-end justify-center gap-2 mb-4" style={{ height: '120px' }}>
            {[1, 0, 2].map((pos) => {
              const entry = fullLeaderboard[pos];
              if (!entry) return null;
              const rank = pos + 1;
              const rc = RANK_COLORS[pos];
              // heights indexed by pos: rank1(center)=100, rank2(left)=84, rank3(right)=70
              const heights = [100, 84, 70];
              const isUser = entry.id === 999;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: pos * 0.1 }}
                  className="flex flex-col items-center rounded-2xl overflow-hidden flex-1"
                  style={{
                    height: `${heights[pos]}px`,
                    background: rc.bg,
                    boxShadow: rc.glow,
                    border: isUser ? '2px solid #0EA5E9' : 'none',
                  }}
                >
                  <div className="flex-1 flex flex-col items-center justify-center px-1 py-2">
                    <span style={{ fontSize: '16px' }}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mt-1"
                      style={{ background: 'rgba(255,255,255,0.4)' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: rc.text }}>{entry.avatar}</span>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: rc.text, textAlign: 'center', marginTop: '2px', lineHeight: 1.2 }}>
                      {entry.name.split(' ')[0]}
                    </span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: rc.text }}>
                      {entry.ecoScore.toFixed(0)} km
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Leaderboard list */}
          <div className="flex flex-col gap-2">
            {fullLeaderboard.map((entry, idx) => {
              const isUser = entry.id === 999;
              const rank = idx + 1;
              const dc = getDeptColor(entry.dept);
              if (rank <= 3) return null;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                  style={{
                    background: isUser ? 'linear-gradient(135deg, #FDF4F4, #FFF8F8)' : 'white',
                    border: isUser ? '2px solid #8B1A1A' : '1.5px solid #F5F0F0',
                    boxShadow: isUser ? '0 4px 16px rgba(139,26,26,0.12)' : 'none',
                  }}
                >
                  {/* Rank */}
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isUser ? '#8B1A1A' : '#F5F0F0' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: isUser ? 'white' : '#9B7070' }}>
                      {rank}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isUser ? 'linear-gradient(135deg, #8B1A1A, #C44B4B)' : dc.bg, border: `1px solid ${dc.border}` }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: isUser ? 'white' : dc.text }}>
                      {entry.avatar}
                    </span>
                  </div>

                  {/* Name + dept */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span style={{ fontSize: '12px', fontWeight: isUser ? 800 : 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.name}{isUser ? ' (You)' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <DeptBadge dept={entry.dept} />
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>{entry.year}</span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <Leaf size={10} color="#22C55E" />
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>
                        {entry.ecoScore.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame size={9} color="#F97316" />
                      <span style={{ fontSize: '10px', color: '#94A3B8' }}>{entry.streak}d</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 p-3 rounded-xl flex items-start gap-2"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
            <Leaf size={14} color="#16A34A" className="flex-shrink-0 mt-0.5" />
            <p style={{ fontSize: '11px', color: '#15803D', lineHeight: 1.5 }}>
              <strong>Eco Score</strong> = Walk km + Cycle km. Use the Compare screen to log trips and climb the leaderboard!
            </p>
          </div>
        </div>
      )}

      {/* ACHIEVEMENT DETAIL MODAL */}
      <AnimatePresence>
        {selectedAchievement && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={() => setSelectedAchievement(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="w-full rounded-3xl overflow-hidden"
              style={{ background: 'white', boxShadow: '0 24px 60px rgba(0,0,0,0.3)', maxWidth: '320px' }}
            >
              {(() => {
                const a = selectedAchievement;
                const isEarned = earned.some(e => e.id === a.id);
                return (
                  <>
                    <div className="px-5 pt-5 pb-4 flex flex-col items-center"
                      style={{ background: isEarned ? 'linear-gradient(135deg, #FFF7ED, #FFFBF0)' : 'linear-gradient(135deg, #F8FAFC, #F1F5F9)' }}>
                      <button onClick={() => setSelectedAchievement(null)}
                        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full"
                        style={{ background: 'rgba(0,0,0,0.06)' }}>
                        <X size={14} color="#64748B" />
                      </button>
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
                        style={{
                          background: isEarned ? '#FFF7ED' : '#F1F5F9',
                          border: `2px solid ${isEarned ? '#FED7AA' : '#E2E8F0'}`,
                          filter: isEarned ? 'none' : 'grayscale(1)',
                          opacity: isEarned ? 1 : 0.5,
                        }}>
                        <span style={{ fontSize: '32px' }}>{a.icon}</span>
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#1E293B' }}>{a.label}</div>
                      {isEarned ? (
                        <div className="flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full"
                          style={{ background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
                          <Star size={10} color="#F59E0B" fill="#F59E0B" />
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#15803D' }}>UNLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 mt-1 px-2.5 py-1 rounded-full"
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <span style={{ fontSize: '10px' }}>🔒</span>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626' }}>LOCKED</span>
                        </div>
                      )}
                    </div>
                    <div className="px-5 py-4">
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B', marginBottom: '8px' }}>
                        How to unlock
                      </div>
                      <div className="px-3 py-2.5 rounded-xl mb-3"
                        style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                        <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>{a.desc}</span>
                      </div>
                      <button onClick={() => setSelectedAchievement(null)}
                        className="w-full py-2.5 rounded-xl"
                        style={{ background: isEarned ? '#F0FDF4' : '#FDF4F4', border: `1.5px solid ${isEarned ? '#BBF7D0' : '#E8D0D0'}`, fontSize: '13px', fontWeight: 700, color: isEarned ? '#15803D' : '#8B1A1A' }}>
                        {isEarned ? 'Awesome!' : 'Got it'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}