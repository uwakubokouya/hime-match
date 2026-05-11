const fs = require('fs');
const lines = fs.readFileSync('C:/Users/guang/.gemini/antigravity/brain/b19119d3-21fc-4e68-ba7f-7b4a37b4c051/.system_generated/logs/overview.txt', 'utf8').split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('"step_index":2293')) {
        console.log(lines[i].substring(0, 500));
        console.log('----');
        console.log(lines[i+1].substring(0, 500));
        break;
    }
}
