import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: threads, error: fetchError } = await supabase.from('sns_board_threads').select('id');
    if (fetchError) {
        console.error(fetchError);
        return;
    }

    for (const thread of threads) {
        const { count, error: countError } = await supabase
            .from('sns_board_posts')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', thread.id);
            
        if (!countError && count !== null) {
            await supabase.from('sns_board_threads').update({ post_count: count }).eq('id', thread.id);
            console.log(`Updated thread ${thread.id} to ${count} posts`);
        }
    }
    console.log("Done");
}

main();
