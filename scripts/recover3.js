const fs = require('fs');
const lines = fs.readFileSync('C:/Users/guang/.gemini/antigravity/brain/da695e00-c095-4c50-a9f6-d17f367e3771/.system_generated/logs/overview.txt', 'utf8').split('\n');
let replaced = false;

// Step 2192 was the last multi_replace_file_content that contained the whole file BEFORE 16:54
// Wait, step 2192: {"step_index":2192,"source":"MODEL","type":"PLANNER_RESPONSE","status":"DONE","created_at":"2026-05-09T07:51:05Z", "tool_calls": [{"name": "run_command" ...
// Let's search backwards for 'replace_file_content' or 'write_to_file' on PostCard.tsx
for (let i = lines.length - 1; i >= 0; i--) {
    let line = lines[i];
    if (line.includes('"step_index":2252')) {
        const jsonStart = line.indexOf('{');
        if (jsonStart !== -1) {
            const data = JSON.parse(line.substring(jsonStart));
            const toolCall = data.tool_calls[0];
            if (toolCall.name === 'multi_replace_file_content' || toolCall.name === 'replace_file_content' || toolCall.name === 'write_to_file') {
                const chunks = JSON.parse(toolCall.args.ReplacementChunks || "[]");
                if (chunks.length > 0) {
                    // if it is a whole file replacement, it will start at line 1
                    if (chunks[0].StartLine === 1 && chunks[0].EndLine > 600) {
                         fs.writeFileSync('src/components/feed/PostCard.tsx', chunks[0].ReplacementContent, 'utf8');
                         console.log('Recovered from step 2252!');
                         replaced = true;
                         break;
                    }
                }
            }
        }
    }
}

if (!replaced) {
    // try step 2293
    for (let i = lines.length - 1; i >= 0; i--) {
        let line = lines[i];
        if (line.includes('"step_index":2293')) {
            const jsonStart = line.indexOf('{');
            if (jsonStart !== -1) {
                const data = JSON.parse(line.substring(jsonStart));
                const toolCall = data.tool_calls[0];
                const chunks = JSON.parse(toolCall.args.ReplacementChunks || "[]");
                fs.writeFileSync('src/components/feed/PostCard.tsx', chunks[0].ReplacementContent, 'utf8');
                console.log('Recovered from step 2293!');
                replaced = true;
                break;
            }
        }
    }
}
