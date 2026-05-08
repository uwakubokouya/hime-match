const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envRaw = fs.readFileSync('.env.local', 'utf8');
const lines = envRaw.split('\n');
const env = {};
for(const line of lines) {
    if(line.includes('=')) {
        const [a, ...b] = line.split('=');
        env[a.trim()] = b.join('=').trim().replace(/["']/g, '');
    }
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase.storage.getBucket('chat_images');
  console.log("chat_images:", {data, error});
  const { data: d2, error: e2 } = await supabase.storage.getBucket('post_images');
  console.log("post_images:", {data: d2, error: e2});
}
run();
