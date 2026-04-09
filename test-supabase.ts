import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if(!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Starting upsert test...");
  try {
    const { data, error } = await supabase.from('user_profiles').upsert({
      user_id: 'test_user_id',
      last_sync_timestamp: new Date().toISOString(),
      current_age: 28,
      target_retirement_age: 45,
      dependents: 2,
      risk_appetite_score: 5,
      employment_type: 'Salaried',
      industry_sector: 'IT',
      tax_regime: 'New'
    }, { onConflict: 'user_id' });
    console.log("Upsert result:", { data, error });
  } catch (e) {
    console.error("Caught error:", e);
  }
}
run();
