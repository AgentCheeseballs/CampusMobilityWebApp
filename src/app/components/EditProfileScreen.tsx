import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Check, Bike } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PROFILE_EMOJIS = [
  '😊', '🦁', '🐯', '🚀', '⚡', '🌟', '🔥', '🎯',
  '💡', '🏆', '🌈', '🎓', '💻', '⚽', '🎵', '🌿',
  '🏃', '🚲', '🎨', '🔬', '🦅', '🌺', '🎸', '🧠',
];

const DEPARTMENTS = ['CSE', 'EE', 'ME', 'CE', 'CH', 'PH', 'BB', 'MA', 'MT', 'TT', 'MS', 'DD'];
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'PhD', 'Faculty'];
const HOSTELS = [
  'Karakoram', 'Aravali', 'Himadri', 'Jwalamukhi', 'Vindhyachal',
  'Udaigiri', 'Nilgiri', 'Shivalik', 'Kailash', 'Zanskar',
  'Girnar', 'Kumaon', 'Satpura', 'Nalanda (Girls)', 'Day Scholar',
];

export function EditProfileScreen() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();

  const [nickname, setNickname] = useState(user?.nickname ?? user?.name ?? '');
  const [selectedEmoji, setSelectedEmoji] = useState(user?.profileEmoji ?? '');
  const [department, setDepartment] = useState(user?.department ?? 'CSE');
  const [year, setYear] = useState(user?.year ?? '1st Year');
  const [hostel, setHostel] = useState(user?.hostel ?? '');
  const [hasCycle, setHasCycle] = useState(user?.hasCycle ?? false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    setSaveError(null);

    const result = await updateProfile({
      nickname: nickname.trim(),
      profileEmoji: selectedEmoji,
      department,
      year,
      hostel,
      hasCycle,
    });

    if (!result.success) {
      setSaveError(result.error ?? 'Failed to save profile.');
      setSaving(false);
      return;
    }

    // Immediately show success state and clear saving
    setSaved(true);
    setSaving(false);
    
    // After delay, reset and navigate
    setTimeout(() => {
      setSaved(false);
      navigate(-1);
    }, 1200);
  };

  const displayAvatar = selectedEmoji || user?.avatar || 'U';

  return (
    <div className="w-full h-full flex flex-col overflow-y-auto" style={{ background: '#F8F5F5' }}>

      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 md:px-6 pt-4 pb-3 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #2C0A0A, #4A1212)' }}>
        <div className="w-full max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={18} color="white" strokeWidth={2.5} />
          </button>
          <div className="flex-1">
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'white' }}>Edit Profile</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>Customize your campus identity</div>
          </div>
          <AnimatePresence>
            {saved && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="w-9 h-9 flex items-center justify-center rounded-xl"
                style={{ background: '#22C55E' }}
              >
                <Check size={16} color="white" strokeWidth={3} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* AVATAR SECTION */}
      <div className="flex flex-col items-center py-5 flex-shrink-0"
        style={{ background: 'linear-gradient(180deg, #2C0A0A 0%, #F8F5F5 100%)' }}>
        <button
          onClick={() => setShowEmojiPicker(o => !o)}
          className="relative"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8B1A1A, #C44B4B)',
              boxShadow: '0 8px 32px rgba(139,26,26,0.4)',
              border: '3px solid rgba(255,255,255,0.2)',
            }}>
            <span style={{ fontSize: selectedEmoji ? '36px' : '28px', fontWeight: 800, color: 'white' }}>
              {displayAvatar}
            </span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center"
            style={{ background: '#8B1A1A', border: '2px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '14px' }}>✏️</span>
          </div>
        </button>
        <div className="mt-3 text-center">
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>
            {nickname || user?.name}
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
            {user?.rollNo} · {department}
          </div>
        </div>
        <button
          onClick={() => setShowEmojiPicker(o => !o)}
          className="mt-2 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
            {showEmojiPicker ? '✕ Close Picker' : '🎨 Change Avatar'}
          </span>
        </button>
      </div>

      {/* EMOJI PICKER */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-4 mb-3 rounded-2xl overflow-hidden flex-shrink-0 max-w-2xl md:mx-auto w-full md:w-auto"
            style={{ background: 'white', border: '1.5px solid #E8D0D0' }}
          >
            <div className="p-3">
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#9B7070', marginBottom: '8px' }}>
                CHOOSE YOUR AVATAR
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(8, 1fr)' }}>
                {/* No emoji option */}
                <button
                  onClick={() => { setSelectedEmoji(''); setShowEmojiPicker(false); }}
                  className="w-full aspect-square rounded-xl flex items-center justify-center"
                  style={{
                    background: !selectedEmoji ? '#FDF4F4' : '#F8F5F5',
                    border: !selectedEmoji ? '2px solid #8B1A1A' : '1.5px solid #E8D0D0',
                    fontSize: '10px', color: '#9B7070', fontWeight: 600,
                  }}>
                  A
                </button>
                {PROFILE_EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => { setSelectedEmoji(emoji); setShowEmojiPicker(false); }}
                    className="w-full aspect-square rounded-xl flex items-center justify-center"
                    style={{
                      background: selectedEmoji === emoji ? '#FDF4F4' : '#F8F5F5',
                      border: selectedEmoji === emoji ? '2px solid #8B1A1A' : '1.5px solid #E8D0D0',
                      fontSize: '20px',
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FORM */}
      <div className="px-4 pb-6 flex flex-col gap-3 flex-shrink-0 max-w-2xl mx-auto w-full">
        {/* Nickname */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid #EDE0E0' }}>
          <div className="px-4 pt-3 pb-1">
            <div style={{ fontSize: '10px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>
              DISPLAY NICKNAME
            </div>
          </div>
          <input
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            placeholder="How should others see your name?"
            className="w-full px-4 pb-3 bg-transparent outline-none"
            style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A' }}
            maxLength={24}
          />
        </div>

        {/* Department */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid #EDE0E0' }}>
          <div className="px-4 pt-3 pb-1">
            <div style={{ fontSize: '10px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>
              DEPARTMENT
            </div>
          </div>
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {DEPARTMENTS.map(dept => (
              <button
                key={dept}
                onClick={() => setDepartment(dept)}
                className="px-3 py-1.5 rounded-xl"
                style={{
                  background: department === dept ? '#8B1A1A' : '#FBF5F5',
                  border: `1.5px solid ${department === dept ? '#8B1A1A' : '#E8D0D0'}`,
                  fontSize: '12px', fontWeight: 700,
                  color: department === dept ? 'white' : '#6B6B6B',
                  transition: 'all 0.15s',
                }}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Year */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid #EDE0E0' }}>
          <div className="px-4 pt-3 pb-1">
            <div style={{ fontSize: '10px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>
              YEAR / PROGRAM
            </div>
          </div>
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {YEARS.map(y => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className="px-3 py-1.5 rounded-xl"
                style={{
                  background: year === y ? '#8B1A1A' : '#FBF5F5',
                  border: `1.5px solid ${year === y ? '#8B1A1A' : '#E8D0D0'}`,
                  fontSize: '11px', fontWeight: 700,
                  color: year === y ? 'white' : '#6B6B6B',
                  transition: 'all 0.15s',
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* Hostel */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid #EDE0E0' }}>
          <div className="px-4 pt-3 pb-1">
            <div style={{ fontSize: '10px', color: '#9B7070', fontWeight: 700, letterSpacing: '0.06em' }}>
              🏠 HOSTEL
            </div>
          </div>
          <div className="px-3 pb-3 flex flex-wrap gap-1.5">
            {HOSTELS.map(h => (
              <button
                key={h}
                onClick={() => setHostel(h)}
                className="px-3 py-1.5 rounded-xl"
                style={{
                  background: hostel === h ? '#8B1A1A' : '#FBF5F5',
                  border: `1.5px solid ${hostel === h ? '#8B1A1A' : '#E8D0D0'}`,
                  fontSize: '11px', fontWeight: 600,
                  color: hostel === h ? 'white' : '#6B6B6B',
                  transition: 'all 0.15s',
                }}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* Has Cycle toggle */}
        <button
          onClick={() => setHasCycle(v => !v)}
          className="rounded-2xl overflow-hidden flex items-center gap-4 px-4 py-4"
          style={{
            background: hasCycle ? 'linear-gradient(135deg, #F0FDF4, #ECFDF5)' : 'white',
            border: `1.5px solid ${hasCycle ? '#86EFAC' : '#EDE0E0'}`,
            transition: 'all 0.2s',
          }}
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: hasCycle ? '#DCFCE7' : '#FBF5F5', border: `1.5px solid ${hasCycle ? '#86EFAC' : '#E8D0D0'}` }}>
            <Bike size={22} color={hasCycle ? '#16A34A' : '#9B9B9B'} strokeWidth={2} />
          </div>
          <div className="flex-1 text-left">
            <div style={{ fontSize: '14px', fontWeight: 700, color: hasCycle ? '#15803D' : '#1A1A1A' }}>
              I have a cycle 🚲
            </div>
            <div style={{ fontSize: '11px', color: hasCycle ? '#16A34A' : '#9B7070' }}>
              {hasCycle ? 'Great! You\'ll earn bonus eco points for cycling' : 'Tap to indicate you own/rent a cycle'}
            </div>
          </div>
          <div className="w-12 h-7 rounded-full flex-shrink-0 flex items-center transition-all"
            style={{ background: hasCycle ? '#22C55E' : '#D1D5DB', padding: '2px' }}>
            <motion.div
              animate={{ x: hasCycle ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-6 h-5 rounded-full"
              style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
            />
          </div>
        </button>

        {/* Save button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 mt-2"
          style={{
            background: saved
              ? 'linear-gradient(135deg, #16A34A, #22C55E)'
              : 'linear-gradient(135deg, #8B1A1A, #A52A2A)',
            boxShadow: saved
              ? '0 6px 20px rgba(22,163,74,0.3)'
              : '0 6px 20px rgba(139,26,26,0.3)',
            transition: 'all 0.3s',
            opacity: saving && !saved ? 0.85 : 1,
          }}
        >
          {saved ? (
            <>
              <Check size={18} color="white" strokeWidth={3} />
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Saved! ✓</span>
            </>
          ) : saving ? (
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Saving...</span>
          ) : (
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'white' }}>Save Profile</span>
          )}
        </motion.button>

        {saveError && (
          <div className="px-3 py-2.5 rounded-xl"
            style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: 600 }}>
              {saveError}
            </span>
          </div>
        )}

        {/* Info */}
        {user?.hostel && (
          <div className="px-3 py-2.5 rounded-xl flex items-center gap-2"
            style={{ background: '#FDF4F4', border: '1px solid #E8D0D0' }}>
            <span style={{ fontSize: '14px' }}>🏠</span>
            <span style={{ fontSize: '11px', color: '#8B1A1A', fontWeight: 600 }}>
              Hostel: {user.hostel} · Routes calculated from hostel gate
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
