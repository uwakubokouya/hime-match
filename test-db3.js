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
const s = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
async function run() {
  const { data: posts } = await s.from('sns_posts').select('id, cast_id, content').eq('cast_id', '2946c702-a271-4da3-8683-e5075c27a36a').limit(1);
  console.log("Posts using casts.id:", posts);
  const { data: posts2 } = await s.from('sns_posts').select('id, cast_id, content').eq('cast_id', 'd0ab4b76-31be-4a15-8fc9-8ea8653c940d').limit(1);
  console.log("Posts using sns_profiles.id:", posts2);
}
run();
