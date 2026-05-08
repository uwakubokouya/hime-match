import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase.from('sns_posts').select('*').limit(1);
    if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
    } else {
        console.log("No data found, but request succeeded.");
    }
    const res = await supabase.from('sns_posts').select('target_area').limit(1);
    console.log("Check target_area:", res.error?.message || "exists");
}
run();
