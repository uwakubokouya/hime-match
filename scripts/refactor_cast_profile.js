const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/app/cast/[id]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace setIsEditingProfile(true) with router.push('/mypage/settings')
content = content.replace(/setIsEditingProfile\(true\)/g, "router.push('/mypage/settings')");

// Remove state declarations
content = content.replace(/const \[isEditingProfile, setIsEditingProfile\] = useState\(false\);\n/g, '');
content = content.replace(/const \[editForm, setEditForm\] = useState<ProfileData>\(profileData\);\n/g, '');
content = content.replace(/const \[pendingCrop, setPendingCrop\] = useState<\{ src: string, type: 'avatar' \| 'cover' \} \| null>\(null\);\n/g, '');

// Remove useEffect for isEditingProfile
content = content.replace(/  useEffect\(\(\) => \{\n    if \(isEditingProfile\) \{\n      setEditForm\(profileData\);\n    \}\n  \}, \[isEditingProfile, profileData\]\);\n/g, '');

// Remove handleImageUpload
content = content.replace(/  const handleImageUpload = \(e: React\.ChangeEvent<HTMLInputElement>, type: 'avatar' \| 'cover'\) => \{[\s\S]*?\n  \};\n/g, '');

// Remove handleSaveProfile
content = content.replace(/  const handleSaveProfile = async \(\) => \{[\s\S]*?  \};\n/g, '');

// Remove isEditingProfile modal
content = content.replace(/      \{\/\* Twitter-style Profile Edit Modal \*\/\}\n      \{isEditingProfile && \([\s\S]*?      \)\}\n\n/g, '');

// Remove ImageCropperModal for pendingCrop
content = content.replace(/      \{\/\* Image Cropper Modal \*\/\}\n      \{pendingCrop && \([\s\S]*?      \)\}\n\n/g, '');

fs.writeFileSync(filePath, content);
console.log('Refactoring complete.');
