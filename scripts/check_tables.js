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
async function run() {
    const url = env['NEXT_PUBLIC_SUPABASE_URL'] + '/rest/v1/';
    const apiKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    
    fetch(url, {
        headers: { 'apikey': apiKey, 'Authorization': `Bearer ${apiKey}` }
    })
    .then(res => res.json())
    .then(data => {
        const tables = Object.keys(data.definitions || {});
        console.log("Tables containing 'custom':", tables.filter(t => t.toLowerCase().includes('custom')));
        console.log("Tables containing 'user':", tables.filter(t => t.toLowerCase().includes('user')));
        console.log("Tables containing 'client':", tables.filter(t => t.toLowerCase().includes('client')));
        console.log("Total tables count:", tables.length);
    });
}
run();
