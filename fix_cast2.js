const fs = require('fs');
let c = fs.readFileSync('src/app/cast/[id]/page.tsx', 'utf8');

const regex = /statusText: statusText\r?\n\s*\}\)\);\r?\n\s*\}\r?\n\s*\}\r?\n\s*\}/;
const replaceStr = `statusText: statusText
                   }));
               } else {
                   const { data: upcomingShifts } = await supabase.from('store_cast_shifts').select('shift_date, attendance_status').eq('cast_id', storeCast.id).gt('shift_date', todayStr).neq('attendance_status', 'absent').order('shift_date', { ascending: true }).limit(1);
                   let nextAvailableTime = null;
                   if (upcomingShifts && upcomingShifts.length > 0) {
                       const dt = new Date(upcomingShifts[0].shift_date);
                       nextAvailableTime = \`次回出勤: \${dt.getMonth() + 1}/\${dt.getDate()}\`;
                   }
                   
                   setProfileData(prev => ({ 
                       ...prev, 
                       workingToday: false, 
                       slotsLeft: null,
                       nextAvailableTime: nextAvailableTime,
                       statusText: null
                   }));
               }
           } else {
               const { data: upcomingShifts } = await supabase.from('store_cast_shifts').select('shift_date, attendance_status').eq('cast_id', storeCast.id).gt('shift_date', todayStr).neq('attendance_status', 'absent').order('shift_date', { ascending: true }).limit(1);
               let nextAvailableTime = null;
               if (upcomingShifts && upcomingShifts.length > 0) {
                   const dt = new Date(upcomingShifts[0].shift_date);
                   nextAvailableTime = \`次回出勤: \${dt.getMonth() + 1}/\${dt.getDate()}\`;
               }
               
               setProfileData(prev => ({ 
                   ...prev, 
                   workingToday: false, 
                   slotsLeft: null,
                   nextAvailableTime: nextAvailableTime,
                   statusText: null
               }));
           }
       }`;

if (regex.test(c)) {
    c = c.replace(regex, replaceStr);
    fs.writeFileSync('src/app/cast/[id]/page.tsx', c);
    console.log("Success replacing in cast/[id]/page.tsx");
} else {
    console.log("Failed to find regex in cast/[id]/page.tsx");
}
