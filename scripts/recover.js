const fs = require('fs');
const lines = fs.readFileSync('C:/Users/guang/.gemini/antigravity/brain/b19119d3-21fc-4e68-ba7f-7b4a37b4c051/.system_generated/logs/overview.txt', 'utf8').split('\n');

for (let line of lines) {
    if (line.includes('"step_index":2293')) {
        const jsonStart = line.indexOf('{');
        if (jsonStart !== -1) {
            const data = JSON.parse(line.substring(jsonStart));
            const chunks = JSON.parse(data.tool_calls[0].args.ReplacementChunks);
            console.log("Chunk length:", chunks[0].ReplacementContent.length);
            
            // Wait, step 2293 only replaced lines 1 to 695. Let's see what it replaced.
            fs.writeFileSync('postcard_recovered.tsx', chunks[0].ReplacementContent);
            console.log("Recovered to postcard_recovered.tsx");
        }
    }
}
