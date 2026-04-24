import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper: get authenticated user from access token
async function getAuthUser(request: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const accessToken = request.headers.get("Authorization")?.split(" ")[1];
  if (!accessToken) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data?.user?.id) return null;
  return data.user;
}

// Health check endpoint
app.get("/make-server-a578ca2f/health", (c) => {
  return c.json({ status: "ok" });
});

// ─── SIGNUP ───
// Creates a Supabase auth user + initializes profile & stats in KV
app.post("/make-server-a578ca2f/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { name, email, rollNo, department, year, password } = body;

    if (!name || !email || !rollNo || !department || !year || !password) {
      return c.json({ error: "Signup error: All fields are required." }, 400);
    }
    if (password.length < 6) {
      return c.json({ error: "Signup error: Password must be at least 6 characters." }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Create user with Supabase Auth admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, rollNo, department, year },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (error) {
      console.log("Signup auth error:", error.message);
      return c.json({ error: `Signup error while creating auth user: ${error.message}` }, 400);
    }

    const userId = data.user.id;
    const avatar = name.trim().split(" ").map((n: string) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2);

    // Prepare profile object for Postgres
    const profile = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      rollNo: rollNo.toUpperCase().trim(),
      department,
      year,
      avatar,
      nickname: null,
      hostel: null,
      hasCycle: false,
      profileEmoji: null,
      createdAt: new Date().toISOString(),
    };

    // Store initial stats in KV
    const stats = {
      walkKm: 0,
      cycleKm: 0,
      autoRides: 0,
      co2Saved: 0,
      streak: 0,
      ecoScore: 0,
    };

    // Persist to Postgres tables `profiles` and `stats` using service role
    await supabase.from('profiles').upsert([{
      id: profile.id,
      name: profile.name,
      email: profile.email,
      roll_no: rollNo.toUpperCase().trim(),
      department: profile.department,
      year: profile.year,
      avatar: profile.avatar,
      nickname: profile.nickname,
      hostel: profile.hostel,
      has_cycle: profile.hasCycle,
      profile_emoji: profile.profileEmoji,
      created_at: profile.createdAt,
    }], { onConflict: ['id'] });

    await supabase.from('stats').upsert([{
      user_id: userId,
      walk_km: 0,
      cycle_km: 0,
      auto_rides: 0,
      co2_saved: 0,
      streak: 0,
      eco_score: 0,
    }], { onConflict: ['user_id'] });

    console.log(`Signup success for user ${userId} (${email})`);
    return c.json({ success: true, userId, profile, stats });
  } catch (err) {
    console.log("Signup unexpected error:", err);
    return c.json({ error: `Signup unexpected error: ${err}` }, 500);
  }
});

// ─── GET PROFILE ───
// Returns profile + stats for authenticated user
app.get("/make-server-a578ca2f/profile", async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: "Authorization error while fetching profile: not authenticated" }, 401);
    }

    // Read profile + stats from Postgres
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    const { data: statsRow } = await supabase.from('stats').select('*').eq('user_id', user.id).maybeSingle();

    if (!profileRow) {
      // Profile doesn't exist yet — create from auth metadata
      const meta = user.user_metadata ?? {};
      const name = meta.name ?? user.email?.split("@")[0] ?? "User";
      const avatar = name.trim().split(" ").map((n: string) => n[0]?.toUpperCase() ?? "").join("").slice(0, 2);

      const newProfile = {
        id: user.id,
        name,
        email: user.email ?? "",
        rollNo: meta.rollNo ?? "",
        department: meta.department ?? "CSE",
        year: meta.year ?? "1st Year",
        avatar,
        nickname: null,
        hostel: null,
        hasCycle: false,
        profileEmoji: null,
        createdAt: new Date().toISOString(),
      };
      const newStats = { walkKm: 0, cycleKm: 0, autoRides: 0, co2Saved: 0, streak: 0, ecoScore: 0 };
      await supabase.from('profiles').upsert([{
        id: newProfile.id,
        name: newProfile.name,
        email: newProfile.email,
        roll_no: newProfile.rollNo,
        department: newProfile.department,
        year: newProfile.year,
        avatar: newProfile.avatar,
        nickname: newProfile.nickname,
        hostel: newProfile.hostel,
        has_cycle: newProfile.hasCycle,
        profile_emoji: newProfile.profileEmoji,
        created_at: newProfile.createdAt,
      }], { onConflict: ['id'] });
      await supabase.from('stats').upsert([{
        user_id: user.id,
        walk_km: 0,
        cycle_km: 0,
        auto_rides: 0,
        co2_saved: 0,
        streak: 0,
        eco_score: 0,
      }], { onConflict: ['user_id'] });

      return c.json({ profile: newProfile, stats: newStats });
    }

    // Map DB field names back to legacy shape expected by client
    const mappedProfile = {
      id: profileRow.id,
      name: profileRow.name,
      email: profileRow.email,
      rollNo: profileRow.roll_no ?? "",
      department: profileRow.department,
      year: profileRow.year,
      avatar: profileRow.avatar,
      nickname: profileRow.nickname,
      hostel: profileRow.hostel,
      hasCycle: profileRow.has_cycle,
      profileEmoji: profileRow.profile_emoji,
      createdAt: profileRow.created_at,
    };

    const mappedStats = statsRow ? {
      walkKm: Number(statsRow.walk_km ?? 0),
      cycleKm: Number(statsRow.cycle_km ?? 0),
      autoRides: Number(statsRow.auto_rides ?? 0),
      co2Saved: Number(statsRow.co2_saved ?? 0),
      streak: Number(statsRow.streak ?? 0),
      ecoScore: Number(statsRow.eco_score ?? 0),
    } : { walkKm: 0, cycleKm: 0, autoRides: 0, co2Saved: 0, streak: 0, ecoScore: 0 };

    return c.json({ profile: mappedProfile, stats: mappedStats });
  } catch (err) {
    console.log("Get profile error:", err);
    return c.json({ error: `Error fetching profile: ${err}` }, 500);
  }
});

// ─── UPDATE PROFILE ───
// Partial update of profile fields
app.put("/make-server-a578ca2f/profile", async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: "Authorization error while updating profile: not authenticated" }, 401);
    }

    const updates = await c.req.json();

    // Update profile in Postgres
    const { error } = await supabase.from('profiles').update({
      ...updates,
    }).eq('id', user.id);

    if (error) {
      console.error('Profile update error:', error.message);
      return c.json({ error: `Error updating profile: ${error.message}` }, 500);
    }

    // Return the merged profile
    const { data: updatedRow } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();

    const resp = {
      id: updatedRow.id,
      name: updatedRow.name,
      email: updatedRow.email,
      rollNo: updatedRow.roll_no ?? "",
      department: updatedRow.department,
      year: updatedRow.year,
      avatar: updatedRow.avatar,
      nickname: updatedRow.nickname,
      hostel: updatedRow.hostel,
      hasCycle: updatedRow.has_cycle,
      profileEmoji: updatedRow.profile_emoji,
      createdAt: updatedRow.created_at,
    };

    console.log(`Profile updated for user ${user.id}`);
    return c.json({ profile: resp });
  } catch (err) {
    console.log("Update profile error:", err);
    return c.json({ error: `Error updating profile: ${err}` }, 500);
  }
});

// ─── UPDATE STATS ───
// Accepts delta values and adds them to current stats
app.put("/make-server-a578ca2f/stats", async (c) => {
  try {
    const user = await getAuthUser(c.req.raw);
    if (!user) {
      return c.json({ error: "Authorization error while updating stats: not authenticated" }, 401);
    }

    const delta = await c.req.json();

    // Read existing stats from Postgres
    const { data: existingRow } = await supabase.from('stats').select('*').eq('user_id', user.id).maybeSingle();

    const updated = {
      walk_km: Number((existingRow?.walk_km ?? 0)) + Number(delta.walkKm ?? 0),
      cycle_km: Number((existingRow?.cycle_km ?? 0)) + Number(delta.cycleKm ?? 0),
      auto_rides: Number((existingRow?.auto_rides ?? 0)) + Number(delta.autoRides ?? 0),
      co2_saved: Number((existingRow?.co2_saved ?? 0)) + Number(delta.co2Saved ?? 0),
      streak: delta.streak !== undefined ? Number(delta.streak) : Number((existingRow?.streak ?? 0)),
      eco_score: Number((existingRow?.eco_score ?? 0)) + Number(delta.ecoScore ?? 0),
      updated_at: new Date().toISOString(),
    };

    await supabase.from('stats').upsert([{ user_id: user.id, ...updated }], { onConflict: ['user_id'] });

    const resp = {
      walkKm: Number(updated.walk_km),
      cycleKm: Number(updated.cycle_km),
      autoRides: Number(updated.auto_rides),
      co2Saved: Number(updated.co2_saved),
      streak: Number(updated.streak),
      ecoScore: Number(updated.eco_score),
    };

    console.log(`Stats updated for user ${user.id}:`, resp);
    return c.json({ stats: resp });
  } catch (err) {
    console.log("Update stats error:", err);
    return c.json({ error: `Error updating stats: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);
