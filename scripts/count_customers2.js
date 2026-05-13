const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const envRaw = fs.readFileSync('.env.local', 'utf8');
const lines = envRaw.split('\n');
const env = {};
for(const line of lines) {
    if(line.includes('=')) {
        const [a, ...b] = line.split('=');
        env[a.trim()] = b.join('=').trim().replace(/["'\r]/g, '');
    }
}
const s = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
async function run() {
    // Check columns
    const { data: cols } = await s.from('customers').select('*').limit(1);
    const phoneCols = Object.keys(cols?.[0] || {}).filter(k => k.includes('phone') || k.includes('tel') || k === 'mobile');
    console.log("Phone columns found:", phoneCols);

    // Count Total
    const { count: total } = await s.from('customers').select('*', { count: 'exact', head: true });
    console.log("Total rows in customers:", total);

    for (const col of phoneCols) {
        const { count } = await s.from('customers').select(col, { count: 'exact', head: true }).not(col, 'is', null).neq(col, '');
        console.log(`Rows with ${col}:`, count);
    }
}
run();
