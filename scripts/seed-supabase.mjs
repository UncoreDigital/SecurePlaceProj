// Seed a default Supabase user and matching user_profiles row
// Requirements (set in your environment before running):
// - NEXT_PUBLIC_SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY (server key)
// - DEFAULT_ADMIN_EMAIL
// - DEFAULT_ADMIN_PASSWORD
// - DEFAULT_ADMIN_FIRST_NAME (optional, default: Admin)
// - DEFAULT_ADMIN_LAST_NAME (optional, default: User)
// - DEFAULT_FIRM_NAME (optional, default: Default Firm)

import { createClient } from "@supabase/supabase-js";

function getEnv(name, required = true, fallback) {
  const value = process.env[name] ?? fallback;
  if (required && !value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRole = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = getEnv("DEFAULT_ADMIN_EMAIL");
  const password = getEnv("DEFAULT_ADMIN_PASSWORD");
  const firstName = getEnv("DEFAULT_ADMIN_FIRST_NAME", false, "Admin");
  const lastName = getEnv("DEFAULT_ADMIN_LAST_NAME", false, "User");
  const firmName = getEnv("DEFAULT_FIRM_NAME", false, "Default Firm");
  const defaultRole = getEnv("DEFAULT_ADMIN_ROLE", false, "super_admin");

  const admin = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("Creating/ensuring default firm ...");
  // Try to find an existing firm first
  let firmId;
  {
    const { data: firms, error: findFirmErr } = await admin
      .from("firms")
      .select("id")
      .ilike("name", firmName)
      .limit(1);
    if (findFirmErr) throw findFirmErr;
    if (firms && firms.length > 0) {
      firmId = firms[0].id;
    } else {
      const { data: createdFirm, error: createFirmErr } = await admin
        .from("firms")
        .insert({ name: firmName })
        .select("id")
        .single();
      if (createFirmErr) throw createFirmErr;
      firmId = createdFirm.id;
    }
  }

  console.log("Creating/ensuring default admin auth user ...");
  // Create auth user if not exists
  const { data: existingUserLookup } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = existingUserLookup?.users?.find((u) => u.email === email);

  let userId;
  if (existing) {
    userId = existing.id;
    console.log(`Auth user already exists: ${email}`);
  } else {
    const { data: created, error: createUserErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (createUserErr) throw createUserErr;
    userId = created.user.id;
    console.log(`Created auth user: ${email}`);
  }

  console.log("Creating/ensuring user_profiles row ...");
  // Upsert profile row (RLS may block anon; service role bypasses)
  const { error: upsertErr } = await admin.from("user_profiles").upsert(
    {
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
      role: defaultRole,
      firm_id: firmId,
      is_active: true,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (upsertErr) throw upsertErr;

  console.log("\nSeed complete ✔\n");
  console.log("Admin credentials:");
  console.log(`  Email: ${email}`);
  console.log(`  Password: (hidden)`);
  console.log(`  Role: super_admin`);
  console.log(`  Firm: ${firmName}`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});


