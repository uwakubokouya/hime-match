const fs = require('fs');
let c = fs.readFileSync('src/app/[prefecture]/page.tsx', 'utf8');

const targetStr = `                    }
                }
            }
            
             const type = post.post_type`;

const replaceStr = `                    }
                }
            } else {
                if (matchedStoreCast && nextShiftMap.has(matchedStoreCast.id)) {
                    const dt = new Date(nextShiftMap.get(matchedStoreCast.id));
                    nextAvailableTime = \`次回出勤: \${dt.getMonth() + 1}/\${dt.getDate()}\`;
                }
            }
            
             const type = post.post_type`;

if (c.includes(targetStr)) {
    c = c.replace(targetStr, replaceStr);
    fs.writeFileSync('src/app/[prefecture]/page.tsx', c);
    console.log("Success");
} else {
    console.log("Target string not found in [prefecture]/page.tsx");
}
