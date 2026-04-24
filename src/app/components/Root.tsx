import { Outlet, NavLink } from 'react-router';
import { Map, Scale, User, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from './LoginScreen';

const NAV_ITEMS = [
  { to: '/', icon: Map, label: 'Map', end: true },
  { to: '/compare', icon: Scale, label: 'Compare', end: false },
  { to: '/profile', icon: User, label: 'Profile', end: false },
] as const;

function DesktopNav() {
  const { user } = useAuth();
  const displayAvatar = user?.profileEmoji ?? user?.avatar ?? 'U';

  return (
    <header
      className="hidden md:flex items-center justify-between px-6 h-16 flex-shrink-0 z-50 border-b"
      style={{
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(139,26,26,0.08)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)' }}
        >
          <span style={{ fontSize: '20px' }}>🎓</span>
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#1A1A1A', letterSpacing: '0.04em', lineHeight: 1 }}>
            IIT DELHI
          </div>
          <div style={{ fontSize: '10px', color: '#9B7070', letterSpacing: '0.06em' }}>
            CAMPUS MOBILITY
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-1">
        {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}>
            {({ isActive }) => (
              <div
                className="flex items-center gap-2 px-5 py-2 rounded-xl transition-all duration-200"
                style={{
                  background: isActive ? 'rgba(139,26,26,0.08)' : 'transparent',
                  color: isActive ? '#8B1A1A' : '#6B6B6B',
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span style={{ fontSize: '14px', fontWeight: isActive ? 700 : 500 }}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User chip */}
      <NavLink to="/edit-profile">
        <div className="flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-full"
          style={{ background: '#FBF5F5', border: '1.5px solid #E8D0D0' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #A52A2A)' }}>
            <span style={{ fontSize: user?.profileEmoji ? '16px' : '12px', fontWeight: 800, color: 'white' }}>
              {displayAvatar}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', lineHeight: 1.1 }}>
              {user?.nickname ?? user?.name}
            </div>
            <div style={{ fontSize: '10px', color: '#9B7070' }}>{user?.department} · {user?.year}</div>
          </div>
        </div>
      </NavLink>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <div
      className="md:hidden flex items-center justify-around px-4 pb-5 pt-2 flex-shrink-0 z-40 border-t"
      style={{
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(139,26,26,0.08)',
      }}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
        <NavLink key={to} to={to} end={end}>
          {({ isActive }) => (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className="flex items-center justify-center rounded-2xl transition-all duration-200"
                style={{
                  width: '48px', height: '36px',
                  background: isActive ? 'rgba(139,26,26,0.1)' : 'transparent',
                }}
              >
                <Icon size={22} color={isActive ? '#8B1A1A' : '#9B9B9B'} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span style={{
                fontSize: '10px', fontWeight: 600,
                color: isActive ? '#8B1A1A' : '#9B9B9B',
              }}>{label}</span>
            </div>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Root() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center"
        style={{ background: 'linear-gradient(165deg, #2C0A0A, #4A1212, #1A0505)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #C44B4B)', boxShadow: '0 8px 32px rgba(139,26,26,0.5)' }}>
            <span style={{ fontSize: '36px' }}>🎓</span>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '0.1em' }}>
              IIT DELHI
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', letterSpacing: '0.08em' }}>
              CAMPUS MOBILITY
            </div>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.4)', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#F0F4FF' }}
    >
      <DesktopNav />
      <div className="flex-1 overflow-hidden min-h-0">
        <Outlet />
      </div>
      <MobileBottomNav />
    </div>
  );
}
