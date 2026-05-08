const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Parse .env.local manually
const envVars = {};
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const sql = fs.readFileSync('scripts/create_sns_board.sql', 'utf8');
  
  // split statements by semicolon
  const stmts = sql.split(';').map(s => s.trim()).filter(s => s);
  for (const s of stmts) {
    const { error } = await supabase.rpc('execute_sql', { query: s });
    if (error) {
       console.error("RPC Error:", error.message);
    } else {
       console.log("Executed statement successfully.");
    }
  }
  console.log('Finished SQL execution attempt.');
}
run();
