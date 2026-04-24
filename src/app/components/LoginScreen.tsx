import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DEPARTMENTS = ['CSE', 'EE', 'ME', 'CE', 'CH', 'PH', 'BB', 'MA', 'MS', 'HS', 'MnC'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year (Dual)', 'PhD'];

// IIT Delhi official emblem – text-based
function IITDEmblem() {
  return (
    <div className="flex flex-col items-center">
      {/* Crest ring */}
      <div className="relative flex items-center justify-center mb-1"
        style={{ width: '72px', height: '72px' }}>
        <div className="absolute inset-0 rounded-full"
          style={{ border: '3px solid rgba(255,255,255,0.35)' }} />
        <div className="absolute"
          style={{ inset: '6px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)' }} />
        {/* Spokes – simplified chakra */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => (
          <div key={deg}
            style={{
              position: 'absolute', width: '1.5px', height: '22px', background: 'rgba(255,255,255,0.3)',
              bottom: '50%', left: 'calc(50% - 0.75px)', transformOrigin: 'bottom center',
              transform: `rotate(${deg}deg) translateY(2px)`,
            }} />
        ))}
        <span style={{ fontSize: '24px', zIndex: 2 }}>🎓</span>
      </div>
      <div className="flex flex-col items-center">
        <span style={{ fontSize: '18px', fontWeight: 900, color: 'white', letterSpacing: '0.12em', lineHeight: 1 }}>
          IIT DELHI
        </span>
        <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.08em', marginTop: '2px' }}>
          ज्ञान · कर्म · उपासना
        </span>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

function Field({ label, type = 'text', value, onChange, placeholder, error }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="mb-3">
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A3A3A', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl outline-none transition-all"
          style={{
            padding: '10px 40px 10px 12px',
            background: error ? '#FFF1F2' : '#FBF5F5',
            border: `1.5px solid ${error ? '#FDA4AF' : '#E8D0D0'}`,
            fontSize: '13px',
            color: '#1A1A1A',
          }}
          onFocus={e => { e.target.style.borderColor = '#8B1A1A'; e.target.style.background = '#FDF8F8'; }}
          onBlur={e => { e.target.style.borderColor = error ? '#FDA4AF' : '#E8D0D0'; e.target.style.background = error ? '#FFF1F2' : '#FBF5F5'; }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: '#9B7070', opacity: 0.6 }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize: '11px', color: '#E11D48', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="mb-3">
      <label style={{ fontSize: '11px', fontWeight: 700, color: '#5A3A3A', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl outline-none"
        style={{ padding: '10px 12px', background: '#FBF5F5', border: '1.5px solid #E8D0D0', fontSize: '13px', color: value ? '#1A1A1A' : '#9B7070' }}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async () => {
    setError('');
    if (!loginEmail.trim() || !loginPassword) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    const res = await login(loginEmail, loginPassword);
    setLoading(false);
    if (!res.success) setError(res.error ?? 'Login failed.');
  };

  const handleSignup = async () => {
    setError('');
    if (!name || !email || !rollNo || !dept || !year || !password) { setError('Please fill in all fields.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    const res = await signup({ name, email, rollNo, department: dept, year, password });
    setLoading(false);
    if (!res.success) setError(res.error ?? 'Signup failed.');
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Left panel — branding (full bg on mobile, side panel on desktop) */}
      <div className="relative lg:w-[480px] xl:w-[560px] flex-shrink-0 flex flex-col items-center justify-center py-8 lg:py-0"
        style={{ background: 'linear-gradient(165deg, #2C0A0A 0%, #4A1212 40%, #3A0E0E 70%, #1A0505 100%)' }}>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }} />
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(139,26,26,0.4), transparent)' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(200,60,60,0.15), transparent)' }} />

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex flex-col items-center"
        >
          <IITDEmblem />
          <div className="mt-3 text-center">
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Indian Institute of Technology Delhi
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.12)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em' }}>CAMPUS MOBILITY</span>
              <div className="h-px w-12" style={{ background: 'rgba(255,255,255,0.12)' }} />
            </div>
          </div>

          {/* Desktop-only description */}
          <div className="hidden lg:block mt-8 max-w-xs text-center">
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
              Compare walking, cycling, auto-rickshaws and campus buses. Track your trips, earn eco points, and climb the leaderboard.
            </p>
            <div className="flex justify-center gap-4 mt-6">
              {[
                { emoji: '🚶', label: 'Walk' },
                { emoji: '🚲', label: 'Cycle' },
                { emoji: '🛺', label: 'Auto' },
                { emoji: '🚌', label: 'Bus' },
              ].map(m => (
                <div key={m.label} className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ fontSize: '22px' }}>{m.emoji}</span>
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-start lg:items-center justify-center px-4 py-6 lg:py-0 overflow-y-auto"
        style={{ background: 'white' }}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="w-full max-w-md"
        >
          {/* Red accent top bar */}
          <div className="h-1 w-full rounded-t-xl" style={{ background: 'linear-gradient(90deg, #8B1A1A, #C44B4B, #8B1A1A)' }} />

          {/* Tab switcher */}
          <div className="flex mt-6 rounded-2xl p-1" style={{ background: '#F5F0F0' }}>
            {(['login', 'signup'] as const).map(tab => (
              <button key={tab} onClick={() => { setMode(tab); setError(''); }}
                className="flex-1 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: mode === tab ? 'white' : 'transparent',
                  boxShadow: mode === tab ? '0 2px 8px rgba(139,26,26,0.1)' : 'none',
                  fontSize: '14px', fontWeight: mode === tab ? 700 : 500,
                  color: mode === tab ? '#8B1A1A' : '#9B7070',
                }}>
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Form body */}
          <div className="pt-6 pb-2">
            <AnimatePresence mode="wait">
              {mode === 'login' ? (
                <motion.div key="login"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A1A', marginBottom: '20px' }}>Welcome back</h2>
                  <Field label="IITD Email" type="email" value={loginEmail}
                    onChange={setLoginEmail} placeholder="yourname@iitd.ac.in" />
                  <Field label="Password" type="password" value={loginPassword}
                    onChange={setLoginPassword} placeholder="Enter password" />
                  {error && (
                    <div className="mb-3 p-3 rounded-xl flex items-center gap-2"
                      style={{ background: '#FFF1F2', border: '1px solid #FDA4AF' }}>
                      <AlertCircle size={14} color="#E11D48" />
                      <span style={{ fontSize: '12px', color: '#E11D48' }}>{error}</span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="signup"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}>
                  <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#1A1A1A', marginBottom: '18px' }}>
                    Join IIT Delhi Mobility 🎓
                  </h2>
                  <Field label="Full Name" value={name} onChange={setName} placeholder="e.g. Arjun Sharma" />
                  <Field label="IITD Email" type="email" value={email} onChange={setEmail} placeholder="yourname@iitd.ac.in" />
                  <Field label="Roll Number" value={rollNo} onChange={setRollNo} placeholder="2022CS001" />
                  <div className="flex gap-2">
                    <div className="flex-1"><SelectField label="Department" value={dept} onChange={setDept} options={DEPARTMENTS} /></div>
                    <div className="flex-1"><SelectField label="Year" value={year} onChange={setYear} options={YEARS} /></div>
                  </div>
                  <Field label="Password (min 6 chars)" type="password" value={password} onChange={setPassword} placeholder="Create password" />
                  <Field label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm password" />
                  {error && (
                    <div className="mb-3 p-3 rounded-xl flex items-center gap-2"
                      style={{ background: '#FFF1F2', border: '1px solid #FDA4AF' }}>
                      <AlertCircle size={14} color="#E11D48" />
                      <span style={{ fontSize: '12px', color: '#E11D48' }}>{error}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buttons */}
          <div className="pt-2 pb-4" style={{ borderTop: '1px solid #F5F0F0' }}>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={mode === 'login' ? handleLogin : handleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl mb-2"
              style={{
                background: loading ? '#C8B0B0' : 'linear-gradient(135deg, #8B1A1A, #A52A2A)',
                boxShadow: loading ? 'none' : '0 6px 20px rgba(139,26,26,0.35)',
                transition: 'all 0.2s',
              }}
            >
              {loading
                ? <Loader2 size={16} color="white" className="animate-spin" />
                : <ChevronRight size={16} color="white" strokeWidth={2.5} />
              }
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
              </span>
            </motion.button>

          </div>

          {/* Footer */}
          <div className="py-3 text-center">
            <span style={{ fontSize: '10px', color: 'rgba(0,0,0,0.25)', letterSpacing: '0.05em' }}>
              IIT DELHI CAMPUS MOBILITY PLATFORM
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}