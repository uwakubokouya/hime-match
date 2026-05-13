require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    // 1. Get みさき's sns_profiles.id
    const { data: misakiProfile } = await supabase.from('sns_profiles').select('id, name, phone').eq('name', 'みさき').limit(1).maybeSingle();
    console.log("Misaki Profile:", misakiProfile);

    // 2. Get user profile (the one who is logged in - we assume we can find them via sns_follows)
    // Actually let's just get ALL follows pointing to みさき
    const { data: followsToMisaki } = await supabase.from('sns_follows').select('*').eq('following_id', misakiProfile.id);
    console.log(`Follows pointing to Misaki profile id (${misakiProfile.id}):`, followsToMisaki?.length || 0);

    // 3. Let's see if there are follows pointing to Misaki's CAST ID!
    const { data: misakiCast } = await supabase.from('casts').select('id, name').eq('login_id', misakiProfile.phone).limit(1).maybeSingle();
    console.log("Misaki Cast:", misakiCast);

    if (misakiCast) {
        const { data: followsToCast } = await supabase.from('sns_follows').select('*').eq('following_id', misakiCast.id);
        console.log(`Follows pointing to Misaki cast id (${misakiCast.id}):`, followsToCast?.length || 0);
    }
}
test();
