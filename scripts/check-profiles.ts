import { createClient } from "@supabase/supabase-js";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  const { data, error: _error } = await supabase
    .from("profiles")
    .select("*")
    .limit(10);

  console.log(JSON.stringify(data, null, 2));
}

checkProfiles();
