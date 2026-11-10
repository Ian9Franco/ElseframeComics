const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..', 'public', 'personajes');
const guiasDir = path.join(baseDir, 'GUIAS');
const portadasDir = path.join(baseDir, 'PORTADAS');
const fichasDir = path.join(baseDir, 'FICHAS');
const fullbodyDir = path.join(baseDir, 'FULLBODY');
const closeupDir = path.join(baseDir, 'CLOSEUP');
const charDataDir = path.join(__dirname, '..', '..', 'lib', 'characterData');

// Helper to check if file/folder path belongs to Locaciones
function isLocationPath(filePath) {
  const lowerPath = filePath.toLowerCase();
  return lowerPath.includes('locaciones') || lowerPath.includes('/locaciones/') || lowerPath.includes('\\locaciones\\');
}

// 1. Load all characters from JS/TS database files
const targetFiles = [
  'pibes.ts',
  'secundarios.ts',
  'antagonistas.ts',
  'deidades.ts',
  'entidades.ts',
  'matis.ts',
  'voughtverse.ts'
];

const charactersList = [];

targetFiles.forEach((filename) => {
  const filePath = path.join(charDataDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let currentChar = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line starts an object with id
    const idMatch = /^id:\s*['"`]([^'"`]+)['"`]/i.exec(line) || /^\{\s*id:\s*['"`]([^'"`]+)['"`]/i.exec(line);
    if (idMatch) {
      if (currentChar && currentChar.name) {
        if (!currentChar.category) {
          currentChar.category = filename.replace('.ts', '');
        }
        charactersList.push(currentChar);
      }
      currentChar = { id: idMatch[1] };
    } else if (currentChar) {
      const nameMatch = /^name:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (nameMatch) {
        currentChar.name = nameMatch[1];
      }
      
      const categoryMatch = /^category:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (categoryMatch) {
        currentChar.category = categoryMatch[1];
      }
      
      const roleMatch = /^role:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (roleMatch) {
        currentChar.role = roleMatch[1];
      }
    }
  }
  if (currentChar && currentChar.name) {
    if (!currentChar.category) {
      currentChar.category = filename.replace('.ts', '');
    }
    charactersList.push(currentChar);
  }
});

console.log(`Loaded ${charactersList.length} characters from database.`);

// Helper function to recursively traverse directories and find files
function getFilesRecursively(dir, filesList = []) {
  if (!fs.existsSync(dir)) return filesList;
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFilesRecursively(fullPath, filesList);
    } else {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const imageExtensions = ['.webp', '.png', '.jpg', '.jpeg', '.gif'];

// Category and alias definitions
const categoryFolders = {
  pibes: 'elseframe',
  secundarios: 'Secundarios',
  independientes: 'Secundarios',
  taberna_resistencia: 'Secundarios',
  antagonistas: 'antagonistas',
  deidades: 'deidades',
  entidades: 'entidades',
  matis: 'matis',
  voughtverse: 'voughtverse'
};

const pibeAliases = {
  ian: 'VESPERWING',
  uandi: 'AEGIS',
  julian: 'WILDCARD',
  volvo: 'VECTOR',
  mati: 'SWAPFIRE',
  jaz: 'ORACLE',
  sofi: 'HUSH'
};

// Build sets of official directory paths that must ALWAYS exist (even if empty)
const officialGuiasPaths = new Set();
const officialFichasPaths = new Set();
const officialPortadasPaths = new Set();

charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
  
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  officialGuiasPaths.add(path.join(guiasDir, folderName, charFolderName).toLowerCase());
  officialFichasPaths.add(path.join(fichasDir, folderName, charFolderName).toLowerCase());
  officialPortadasPaths.add(path.join(portadasDir, char.name.replace(/[\\/:*?"<>|]/g, '')).toLowerCase());
});

function findMatchingCharacter(filename) {
  const cleanFilename = filename.toLowerCase();
  const words = cleanFilename.split(/[^a-z0-9]/).filter(w => w.length > 0);
  
  // 1. Try exact full match first
  for (const char of charactersList) {
    const lowerId = char.id.toLowerCase();
    const lowerName = char.name.toLowerCase();
    
    const cleanFull = cleanFilename.replace(/[^a-z0-9]/g, '');
    const cleanId = lowerId.replace(/[^a-z0-9]/g, '');
    const cleanName = lowerName.replace(/[^a-z0-9]/g, '');
    
    if (cleanFull === cleanId || cleanFull === cleanName) {
      return char;
    }
  }

  // 2. Try exact match on any of the words
  for (const char of charactersList) {
    const lowerId = char.id.toLowerCase();
    const lowerName = char.name.toLowerCase();
    
    for (const word of words) {
      if (word === lowerId || word === lowerName) {
        return char;
      }
    }
  }

  // 3. Try alias matches for pibes
  const aliasMapping = {
    vesperwing: 'ian',
    aegis: 'uandi',
    wildcard: 'julian',
    vector: 'volvo',
    nullvector: 'volvo',
    swapfire: 'mati',
    oracle: 'jaz',
    hush: 'sofi',
    lucy: 'lucifer'
  };

  for (const word of words) {
    if (aliasMapping[word]) {
      const id = aliasMapping[word];
      return charactersList.find(c => c.id.toLowerCase() === id);
    }
  }

  // 4. Fallback for composite/partial names (only for longer words to prevent false positives)
  for (const char of charactersList) {
    const lowerId = char.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lowerName = char.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    for (const word of words) {
      if (word.length >= 4) {
        if (lowerId.includes(word) || lowerName.includes(word) || word.includes(lowerId) || word.includes(lowerName)) {
          return char;
        }
      }
    }
  }

  return null;
}

// Helper to find character by traversing the directory path from the file up
function findCharacterFromPath(filePath) {
  // Extract all directory parts relative to baseDir
  const relPath = path.relative(baseDir, filePath);
  const parts = relPath.split(path.sep);
  
  // Try to match each part from right to left (excluding the file name itself which is parts[parts.length-1])
  for (let i = parts.length - 2; i >= 0; i--) {
    const partLower = parts[i].toLowerCase();
    // Skip generic category/system folders
    if (['antagonistas', 'deidades', 'entidades', 'matis', 'secundarios', 'voughtverse', 'lospibes', 'personajes', 'guias', 'fichas', 'portadas', 'fullbody', 'closeup'].includes(partLower)) {
      continue;
    }
    const matched = findMatchingCharacter(parts[i]);
    if (matched) return matched;
  }
  
  // Fallback to matching the filename
  const basename = path.basename(filePath, path.extname(filePath));
  return findMatchingCharacter(basename);
}

// Helper to remove empty directories recursively, respecting official lists
const cleanEmptyDirsRecursively = (dir, rootDir, officialSet = null) => {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach((item) => {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      cleanEmptyDirsRecursively(fullPath, rootDir, officialSet);
    }
  });
  const remainingItems = fs.readdirSync(dir);
  if (remainingItems.length === 0 && dir !== rootDir) {
    // If we have an official set and this directory path is in it, DO NOT delete it!
    if (officialSet && officialSet.has(dir.toLowerCase())) {
      return;
    }
    try {
      fs.rmdirSync(dir);
      console.log(`Removed empty folder: ${path.relative(baseDir, dir)}`);
    } catch (err) {
      // ignore
    }
  }
};

// ==========================================
// STEP 1: Add _sheet to files in GUIAS
// ==========================================
console.log('\n--- STEP 1: Renaming GUIAS files to have _sheet ---');
if (fs.existsSync(guiasDir)) {
  const guiasFilesBefore = getFilesRecursively(guiasDir);
  guiasFilesBefore.forEach((filePath) => {
    if (isLocationPath(filePath)) return;

    const ext = path.extname(filePath).toLowerCase();
    if (!imageExtensions.includes(ext)) return;

    const dirname = path.dirname(filePath);
    const basename = path.basename(filePath, ext);

    if (!basename.toLowerCase().includes('_sheet')) {
      const newBasename = `${basename}_sheet`;
      const newFilePath = path.join(dirname, newBasename + ext);
      try {
        fs.renameSync(filePath, newFilePath);
        console.log(`Renamed sheet in GUIAS: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, newFilePath)}`);
      } catch (err) {
        console.error(`Error renaming ${filePath}:`, err);
      }
    }
  });
}

// ==========================================
// STEP 2: Create character folders in GUIAS according to category
// ==========================================
console.log('\n--- STEP 2: Ensuring character folders exist in GUIAS ---');
charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
  
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  const targetPath = path.join(guiasDir, folderName, charFolderName);
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`Created GUIAS folder: GUIAS/${folderName}/${charFolderName}`);
    } catch (err) {
      console.error(`Error creating folder ${targetPath}:`, err);
    }
  }
});

// Cleanup wrong folders in GUIAS (e.g. independientes, taberna_resistencia)
console.log('\n--- Cleaning up wrong GUIAS folders ---');
const wrongDirs = ['independientes', 'taberna_resistencia'];
wrongDirs.forEach((wrongDirName) => {
  const wrongDirPath = path.join(guiasDir, wrongDirName);
  if (fs.existsSync(wrongDirPath)) {
    const targetParent = path.join(guiasDir, 'Secundarios');
    if (!fs.existsSync(targetParent)) {
      fs.mkdirSync(targetParent, { recursive: true });
    }
    
    const items = fs.readdirSync(wrongDirPath);
    items.forEach((item) => {
      const srcItemPath = path.join(wrongDirPath, item);
      const destItemPath = path.join(targetParent, item);
      
      if (fs.existsSync(destItemPath)) {
        const srcStat = fs.statSync(srcItemPath);
        const destStat = fs.statSync(destItemPath);
        if (srcStat.isDirectory() && destStat.isDirectory()) {
          const files = fs.readdirSync(srcItemPath);
          files.forEach((file) => {
            fs.renameSync(path.join(srcItemPath, file), path.join(destItemPath, file));
          });
          fs.rmdirSync(srcItemPath);
        } else {
          fs.renameSync(srcItemPath, destItemPath);
        }
      } else {
        fs.renameSync(srcItemPath, destItemPath);
      }
    });
    
    try {
      fs.rmdirSync(wrongDirPath);
      console.log(`Cleaned up wrong GUIAS folder: ${wrongDirName}`);
    } catch (err) {
      console.error(`Could not remove ${wrongDirPath}:`, err);
    }
  }
});

// ==========================================
// STEP 2.5: Move sheets found outside GUIAS to GUIAS
// ==========================================
console.log('\n--- STEP 2.5: Moving sheet images to GUIAS ---');
const allFilesForSheets = getFilesRecursively(baseDir);

allFilesForSheets.forEach((filePath) => {
  if (filePath.startsWith(guiasDir) || isLocationPath(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!imageExtensions.includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const lowerBasename = basename.toLowerCase();

  if (lowerBasename.includes('sheet')) {
    const matchedChar = findCharacterFromPath(filePath);
    if (matchedChar) {
      const category = matchedChar.category.toLowerCase();
      const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
      
      let charFolderName;
      if (category === 'pibes' || matchedChar.category === 'pibes') {
        charFolderName = pibeAliases[matchedChar.id.toLowerCase()] || matchedChar.name.toUpperCase();
      } else {
        charFolderName = matchedChar.name.replace(/[\\/:*?"<>|]/g, '');
      }

      const destFolder = path.join(guiasDir, folderName, charFolderName);
      const destFilePath = path.join(destFolder, basename + ext);
      
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      try {
        fs.renameSync(filePath, destFilePath);
        console.log(`Moved to GUIAS: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, destFilePath)}`);
      } catch (err) {
        console.error(`Error moving ${filePath} to GUIAS:`, err);
      }
    }
  }
});

// ==========================================
// STEP 3: Move character portadas
// ==========================================
console.log('\n--- STEP 3: Moving character portadas ---');
const allFiles = getFilesRecursively(baseDir);

allFiles.forEach((filePath) => {
  // Skip if it is inside GUIAS, FICHAS, FULLBODY, or CLOSEUP or Locaciones
  if (filePath.startsWith(guiasDir) || filePath.startsWith(fichasDir) || filePath.startsWith(fullbodyDir) || filePath.startsWith(closeupDir) || isLocationPath(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!imageExtensions.includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const lowerBasename = basename.toLowerCase();

  // Skip if it has ficha, sheet, body, or face modifiers (allow alt)
  if (lowerBasename.includes('ficha') || lowerBasename.includes('sheet') || lowerBasename.includes('body') || lowerBasename.includes('face')) {
    return;
  }

  // Find matching character
  const matchedChar = findCharacterFromPath(filePath);
  if (matchedChar) {
    const destFolder = path.join(portadasDir, matchedChar.name.replace(/[\\/:*?"<>|]/g, ''));
    const destFilePath = path.join(destFolder, basename + ext);
    
    // Skip if it's already in the correct folder
    if (filePath === destFilePath) return;

    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }
    
    try {
      fs.renameSync(filePath, destFilePath);
      console.log(`Moved/Corrected: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, destFilePath)}`);
    } catch (err) {
      console.error(`Error moving ${filePath} to ${destFilePath}:`, err);
    }
  }
});

// Ensure all character folders exist in PORTADAS (since portadas must have TODOS)
console.log('\n--- Ensuring all character folders exist in PORTADAS ---');
charactersList.forEach((char) => {
  const targetPath = path.join(portadasDir, char.name.replace(/[\\/:*?"<>|]/g, ''));
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`Created PORTADAS folder: PORTADAS/${char.name}`);
    } catch (err) {
      console.error(`Error creating folder ${targetPath}:`, err);
    }
  }
});

// ==========================================
// STEP 4: Move character images with _ficha to FICHAS
// ==========================================
console.log('\n--- STEP 4: Moving character fichas to FICHAS ---');

if (!fs.existsSync(fichasDir)) {
  fs.mkdirSync(fichasDir, { recursive: true });
}

// Ensure all character directories exist in FICHAS
charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
  
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  const targetPath = path.join(fichasDir, folderName, charFolderName);
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
      console.log(`Created FICHAS folder: FICHAS/${folderName}/${charFolderName}`);
    } catch (err) {
      console.error(`Error creating folder ${targetPath}:`, err);
    }
  }
});

// Scan all files again to find fichas
const allFilesForFichas = getFilesRecursively(baseDir);

allFilesForFichas.forEach((filePath) => {
  if (filePath.startsWith(guiasDir) || filePath.startsWith(fichasDir) || isLocationPath(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!imageExtensions.includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const lowerBasename = basename.toLowerCase();

  // Check if it contains ficha (case-insensitive)
  if (lowerBasename.includes('ficha')) {
    const matchedChar = findCharacterFromPath(filePath);
    if (matchedChar) {
      const category = matchedChar.category.toLowerCase();
      const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
      
      let charFolderName;
      if (category === 'pibes' || matchedChar.category === 'pibes') {
        charFolderName = pibeAliases[matchedChar.id.toLowerCase()] || matchedChar.name.toUpperCase();
      } else {
        charFolderName = matchedChar.name.replace(/[\\/:*?"<>|]/g, '');
      }

      const destFolder = path.join(fichasDir, folderName, charFolderName);
      const destFilePath = path.join(destFolder, basename + ext);
      
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      try {
        fs.renameSync(filePath, destFilePath);
        console.log(`Moved to FICHAS: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, destFilePath)}`);
      } catch (err) {
        console.error(`Error moving ${filePath} to FICHAS:`, err);
      }
    }
  }
});

// ==========================================
// STEP 5: Move character images with _body to FULLBODY
// ==========================================
console.log('\n--- STEP 5: Moving character body images to FULLBODY ---');

if (!fs.existsSync(fullbodyDir)) {
  fs.mkdirSync(fullbodyDir, { recursive: true });
}

// Ensure all character directories exist in FULLBODY
charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
  
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  const targetPath = path.join(fullbodyDir, folderName, charFolderName);
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
    } catch (err) {
      console.error(`Error creating folder ${targetPath}:`, err);
    }
  }
});

// Scan files for body images
const allFilesForFullbody = getFilesRecursively(baseDir);

allFilesForFullbody.forEach((filePath) => {
  if (filePath.startsWith(guiasDir) || filePath.startsWith(fichasDir) || filePath.startsWith(fullbodyDir) || filePath.startsWith(closeupDir) || isLocationPath(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!imageExtensions.includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const lowerBasename = basename.toLowerCase();

  // Check if it contains body (case-insensitive)
  if (lowerBasename.includes('body')) {
    const matchedChar = findCharacterFromPath(filePath);
    if (matchedChar) {
      const category = matchedChar.category.toLowerCase();
      const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
      
      let charFolderName;
      if (category === 'pibes' || matchedChar.category === 'pibes') {
        charFolderName = pibeAliases[matchedChar.id.toLowerCase()] || matchedChar.name.toUpperCase();
      } else {
        charFolderName = matchedChar.name.replace(/[\\/:*?"<>|]/g, '');
      }

      const destFolder = path.join(fullbodyDir, folderName, charFolderName);
      const destFilePath = path.join(destFolder, basename + ext);
      
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      try {
        fs.renameSync(filePath, destFilePath);
        console.log(`Moved to FULLBODY: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, destFilePath)}`);
      } catch (err) {
        console.error(`Error moving ${filePath} to FULLBODY:`, err);
      }
    }
  }
});

// ==========================================
// STEP 6: Move character images with _face to CLOSEUP
// ==========================================
console.log('\n--- STEP 6: Moving character face images to CLOSEUP ---');

if (!fs.existsSync(closeupDir)) {
  fs.mkdirSync(closeupDir, { recursive: true });
}

// Ensure all character directories exist in CLOSEUP
charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
  
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  const targetPath = path.join(closeupDir, folderName, charFolderName);
  if (!fs.existsSync(targetPath)) {
    try {
      fs.mkdirSync(targetPath, { recursive: true });
    } catch (err) {
      console.error(`Error creating folder ${targetPath}:`, err);
    }
  }
});

// Scan files for face/closeup images
const allFilesForCloseup = getFilesRecursively(baseDir);

allFilesForCloseup.forEach((filePath) => {
  if (filePath.startsWith(guiasDir) || filePath.startsWith(fichasDir) || filePath.startsWith(fullbodyDir) || filePath.startsWith(closeupDir) || isLocationPath(filePath)) return;

  const ext = path.extname(filePath).toLowerCase();
  if (!imageExtensions.includes(ext)) return;

  const basename = path.basename(filePath, ext);
  const lowerBasename = basename.toLowerCase();

  // Check if it contains face or closeup (case-insensitive)
  if (lowerBasename.includes('face') || lowerBasename.includes('closeup')) {
    const matchedChar = findCharacterFromPath(filePath);
    if (matchedChar) {
      const category = matchedChar.category.toLowerCase();
      const folderName = categoryFolders[category] || categoryFolders[category + 's'] || category;
      
      let charFolderName;
      if (category === 'pibes' || matchedChar.category === 'pibes') {
        charFolderName = pibeAliases[matchedChar.id.toLowerCase()] || matchedChar.name.toUpperCase();
      } else {
        charFolderName = matchedChar.name.replace(/[\\/:*?"<>|]/g, '');
      }

      const destFolder = path.join(closeupDir, folderName, charFolderName);
      const destFilePath = path.join(destFolder, basename + ext);
      
      if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
      }

      try {
        fs.renameSync(filePath, destFilePath);
        console.log(`Moved to CLOSEUP: ${path.relative(baseDir, filePath)} -> ${path.relative(baseDir, destFilePath)}`);
      } catch (err) {
        console.error(`Error moving ${filePath} to CLOSEUP:`, err);
      }
    }
  }
});

// ==========================================
// STEP 7: Cleanup all empty directories
// ==========================================
console.log('\n--- STEP 7: Cleaning up empty resource directories ---');
// GUIAS, FICHAS, and PORTADAS must ALWAYS keep official character folders.
// So we pass their respective official path sets to avoid deleting them.
cleanEmptyDirsRecursively(guiasDir, guiasDir, officialGuiasPaths);
cleanEmptyDirsRecursively(fichasDir, fichasDir, officialFichasPaths);
cleanEmptyDirsRecursively(portadasDir, portadasDir, officialPortadasPaths);

// FULLBODY and CLOSEUP do NOT need empty folders, so we pass null (meaning delete all empty ones).
cleanEmptyDirsRecursively(fullbodyDir, fullbodyDir, null);
cleanEmptyDirsRecursively(closeupDir, closeupDir, null);

console.log('All tasks completed successfully.');

// ==========================================
// STEP 8: Regenerate characterImages.ts
// ==========================================
console.log('\n--- STEP 8: Regenerating characterImages.ts ---');
try {
  require('./generate-character-images.js');
} catch (err) {
  console.error('Error regenerating characterImages.ts:', err.message);
}
