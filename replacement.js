const fs = require('fs');
const file = 'src/app/cast/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const startMarker = `      // Fetch sns_user_preferences`;
const endMarker = `       setIsInitialLoading(false);\n    };`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if(startIndex === -1 || endIndex === -1) {
  console.log("Not found", startIndex, endIndex);
  process.exit(1);
}

const replacementText = fs.readFileSync('replacement.txt', 'utf8');

const newContent = content.substring(0, startIndex) + replacementText + content.substring(endIndex);
fs.writeFileSync(file, newContent, 'utf8');
console.log("Success");
