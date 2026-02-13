import { createClient } from "@supabase/supabase-js";

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY",
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProjects() {
  const { data, error } = await supabase.from("projects").select("*").limit(2);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkProjects();
