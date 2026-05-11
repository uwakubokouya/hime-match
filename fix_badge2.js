const fs = require('fs');
let c = fs.readFileSync('src/app/[prefecture]/page.tsx', 'utf8');

const regex = /\}\s*\r?\n\s*const type = post\.post_type \|\| "全員";/;
const replacement = `} else {
                if (matchedStoreCast && nextShiftMap.has(matchedStoreCast.id)) {
                    const dt = new Date(nextShiftMap.get(matchedStoreCast.id));
                    nextAvailableTime = \`次回出勤: \${dt.getMonth() + 1}/\${dt.getDate()}\`;
                }
            }
            
            const type = post.post_type || "全員";`;

if (regex.test(c)) {
    c = c.replace(regex, replacement);
    fs.writeFileSync('src/app/[prefecture]/page.tsx', c);
    console.log("Replaced successfully in [prefecture]/page.tsx");
} else {
    console.log("Regex not found in [prefecture]/page.tsx");
}
