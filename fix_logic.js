const fs = require('fs');

// Fix cast/[id]/page.tsx
let castCode = fs.readFileSync('src/app/cast/[id]/page.tsx', 'utf8');

const castRegex1 = /const \{ data: upcomingShifts \} = await supabase\.from\('shifts'\)\.select\('date, attendance_status'\)\.eq\('cast_id', storeCast\.id\)\.gt\('date', todayStr\)\.or\('attendance_status\.is\.null,attendance_status\.not\.eq\.absent'\)\.order\('date', \{ ascending: true \}\)\.limit\(1\);\r?\n\s*let nextAvailableTime = null;\r?\n\s*if \(upcomingShifts && upcomingShifts\.length > 0\) \{\r?\n\s*const dt = new Date\(upcomingShifts\[0\]\.date\);\r?\n\s*nextAvailableTime = `次回出勤: \$\{dt\.getMonth\(\) \+ 1\}\/\$\{dt\.getDate\(\)\}`;\r?\n\s*\}/g;

const castReplacement = `let nextAvailableTime = null;
                   const nextValid = next14Days.find(d => d.text !== "お休み");
                   if (nextValid) {
                       nextAvailableTime = \`次回出勤: \${nextValid.displayDate.split('(')[0]}\`;
                   }`;

castCode = castCode.replace(castRegex1, castReplacement);
fs.writeFileSync('src/app/cast/[id]/page.tsx', castCode);
console.log("Fixed cast/[id]/page.tsx");


// Fix [prefecture]/page.tsx
let prefCode = fs.readFileSync('src/app/[prefecture]/page.tsx', 'utf8');

const prefRegex = /const nextShiftMap = new Map\(\);\r?\n\s*if \(castIdsForPosts\.length > 0\) \{\r?\n\s*const \{ data: upcomingShifts \} = await supabase\.from\('shifts'\)\.select\('cast_id, date, attendance_status'\)\.in\('cast_id', castIdsForPosts\)\.gt\('date', todayStr\)\.or\('attendance_status\.is\.null,attendance_status\.not\.eq\.absent'\)\.order\('date', \{ ascending: true \}\);\r?\n\s*if \(upcomingShifts\) \{\r?\n\s*upcomingShifts\.forEach\(\(s\) => \{\r?\n\s*if \(\!nextShiftMap\.has\(s\.cast_id\)\) nextShiftMap\.set\(s\.cast_id, s\.date\);\r?\n\s*\}\);\r?\n\s*\}\r?\n\s*\}/;

const prefReplacement = `const nextShiftMap = new Map();
       if (castIdsForPosts.length > 0) {
           const uniqueStoreIds = [...new Set(castsForPosts.map((c: any) => c.store_id).filter(Boolean))];
           const next14DaysPromises = [];
           for (let i = 1; i <= 14; i++) {
               const d = new Date();
               d.setDate(d.getDate() + i);
               const dateStr = d.toLocaleDateString('sv-SE').split('T')[0];
               for (const sid of uniqueStoreIds) {
                   next14DaysPromises.push(
                       supabase.rpc('get_public_availability', { p_store_id: sid as string, p_date: dateStr })
                       .then((res: any) => ({ dateStr, data: res.data }))
                   );
               }
           }
           const next14DaysResults = await Promise.all(next14DaysPromises);
           next14DaysResults.forEach((result) => {
               if (result.data) {
                   result.data.forEach((row: any) => {
                       const hasValidShift = row.attendance_status !== 'absent' && (!!row.shift_start || !!row.shift_end);
                       if (hasValidShift && !nextShiftMap.has(row.cast_id)) {
                           nextShiftMap.set(row.cast_id, result.dateStr);
                       }
                   });
               }
           });
       }`;

prefCode = prefCode.replace(prefRegex, prefReplacement);
fs.writeFileSync('src/app/[prefecture]/page.tsx', prefCode);
console.log("Fixed [prefecture]/page.tsx");

