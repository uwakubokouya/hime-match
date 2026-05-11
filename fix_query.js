const fs = require('fs');

function fixFile(path) {
    let c = fs.readFileSync(path, 'utf8');
    c = c.replace(/\.neq\('attendance_status', 'absent'\)/g, ".or('attendance_status.is.null,attendance_status.not.eq.absent')");
    fs.writeFileSync(path, c);
    console.log("Fixed " + path);
}

fixFile('src/app/[prefecture]/page.tsx');
fixFile('src/app/cast/[id]/page.tsx');
