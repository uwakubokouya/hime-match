const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // Check customers table columns
    const { data: cols, error: err1 } = await supabase.from('customers').select('*').limit(1);
    if (err1) {
        console.error("Error fetching customers schema:", err1);
        return;
    }
    console.log("Customer Columns:", Object.keys(cols[0] || {}));

    // Find the phone column
    const phoneCol = Object.keys(cols[0] || {}).find(k => k.includes('phone') || k.includes('tel') || k === 'mobile');
    
    if (phoneCol) {
        const { count, error } = await supabase
            .from('customers')
            .select(phoneCol, { count: 'exact', head: true })
            .not(phoneCol, 'is', null)
            .neq(phoneCol, '');
            
        if (error) {
            console.error('Error counting:', error);
        } else {
            console.log(`Total customers with ${phoneCol}: ${count}`);
        }
    } else {
        console.log("Could not find a phone column.");
    }
}

run();
