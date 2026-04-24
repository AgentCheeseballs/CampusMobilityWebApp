# Supabase Database Setup

This document explains how to set up your Supabase database to support the EditProfileScreen profile updates.

## Quick Setup (Choose One)

### Option 1: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://app.supabase.com
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Copy the contents of `supabase/migrations/001_create_profiles_table.sql`
5. Paste it into the SQL editor
6. Click **"Run"** (or press `Ctrl+Enter`)

This will:
- Create `profiles` table with all required columns
- Create `stats` table (if missing)
- Add `nickname`, `has_cycle`, `profile_emoji` columns
- Set up Row Level Security (RLS) policies

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase migration up
```

Or manually run the migration:

```bash
supabase db pull  # Pull current schema
supabase db push  # Push migrations
```

---

## What Gets Created/Updated

The migration script:

1. **Profiles table** - User profile data
   - `id` (UUID, user ID from auth)
   - `name` (user's full name)
   - `nickname` (display name, editable)
   - `email` (user's email)
   - `roll_no` (student roll number)
   - `department` (CSE, EE, ME, etc.)
   - `year` (1st Year, 2nd Year, etc.)
   - `hostel` (hostel name, optional)
   - `has_cycle` (boolean, editable)
   - `profile_emoji` (emoji avatar, editable)
   - `avatar` (2-letter initials)

2. **Stats table** - User statistics
   - `user_id` (UUID, links to auth user)
   - `walk_km`, `cycle_km`, `auto_rides`, `co2_saved`, `streak`, `eco_score`

3. **Row Level Security (RLS)**
   - Users can view all profiles
   - Users can only update their own profile
   - Users can only update their own stats

---

## Testing the Save Flow

After running the migration:

1. Start the dev server: `npm run dev`
2. Log in / sign up
3. Go to **Profile → Edit Profile** (`/edit-profile`)
4. Make changes:
   - Change your nickname
   - Select an emoji avatar
   - Change department/year/hostel
   - Toggle "I have a cycle"
5. Click **"Save Profile"**
6. You should see **"Saved! ✓"** with a green checkmark
7. Go back and return to Edit Profile — your changes should persist!

---

## Troubleshooting

### Save button shows "Failed to save profile"

**Check:**
- Are all the required columns in your `profiles` table? (`nickname`, `profile_emoji`, `has_cycle`)
- Is RLS enabled and configured correctly?
- Are you logged in?

**Fix:**
- Run the migration again (it's idempotent)
- Check Supabase dashboard → Table Editor → profiles to see columns

### Changes aren't persisting

- Check browser console (F12) for errors
- Check Supabase → Logs for database errors
- Ensure you're viewing the Edit Profile screen for the logged-in user

---

## Code Overview

The save flow works like this:

```
EditProfileScreen (form inputs)
        ↓
    handleSave()
        ↓
    useAuth().updateProfile(data)
        ↓
    AuthContext.updateProfile()
        ↓ (maps camelCase to snake_case)
        ↓
    supabase.from('profiles').update(dbFields)
        ↓
    Supabase Database
```

Field mapping (camelCase → snake_case):
- `nickname` → `nickname`
- `profileEmoji` → `profile_emoji`
- `hasCycle` → `has_cycle`
- `department` → `department`
- `year` → `year`
- `hostel` → `hostel`
