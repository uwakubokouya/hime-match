import { createClient } from '@supabase/supabase-js'; 
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); 
async function run() { 
  const {data, error} = await supabase.rpc('execute_sql', {query: "select pg_get_functiondef(oid) from pg_proc where proname = 'get_secret_review_preview';"}); 
  console.log(data); 
} 
run();
