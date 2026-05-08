const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envRaw = fs.readFileSync('.env.local', 'utf8');
const lines = envRaw.split('\n');
const env = {};
for(const line of lines) {
    if(line.includes('=')) {
        const [a, ...b] = line.split('=');
        env[a.trim()] = b.join('=').trim().replace(/["']/g, '');
    }
}
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: cols, error: err } = await supabase.from('sns_messages').select('*').limit(1);
  if(err) {
      console.error(err);
  } else if (cols && cols.length > 0) {
      console.log("Columns:", Object.keys(cols[0]));
      console.log("Sample:", cols[0]);
  } else {
      console.log("No data found, can't infer schema.");
      
      // try inserting and failing to get schema error or using an invalid select
      const {error: e2} = await supabase.from('sns_messages').select('non_existent_column').limit(1);
      console.log("Error info:", e2);
  }
}
check();
