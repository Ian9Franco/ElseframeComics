const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..', '..', 'public', 'personajes');
const GUIAS_BASE_DIR = path.join(baseDir, 'GUIAS');
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'lib', 'characterData', 'conceptArts.ts');
const charDataDir = path.join(__dirname, '..', '..', 'lib', 'characterData');

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
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let currentChar = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const idMatch = /^id:\s*['"`]([^'"`]+)['"`]/i.exec(line) || /^\{\s*id:\s*['"`]([^'"`]+)['"`]/i.exec(line);
    if (idMatch) {
      if (currentChar && currentChar.name) {
        if (!currentChar.category) currentChar.category = filename.replace('.ts', '');
        charactersList.push(currentChar);
      }
      currentChar = { id: idMatch[1] };
    } else if (currentChar) {
      const nameMatch = /^name:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (nameMatch) currentChar.name = nameMatch[1];
      const categoryMatch = /^category:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (categoryMatch) currentChar.category = categoryMatch[1];
    }
  }
  if (currentChar && currentChar.name) {
    if (!currentChar.category) currentChar.category = filename.replace('.ts', '');
    charactersList.push(currentChar);
  }
});

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
  julian: 'BANDIT',
  volvo: 'OUTRIDER',
  mati: 'FARSIGHT',
  jaz: 'SIGIL',
  sofi: 'DUSK'
};

// Map folder names to character IDs
const folderToCharId = {};
function registerFolderAlias(folderName, charId) {
  const key = folderName?.toLowerCase();
  if (key && !folderToCharId[key]) {
    folderToCharId[key] = charId;
  }
}

charactersList.forEach((char) => {
  const category = char.category.toLowerCase();
  let charFolderName;
  if (category === 'pibes' || char.category === 'pibes') {
    charFolderName = pibeAliases[char.id.toLowerCase()] || char.name.toUpperCase();
  } else {
    charFolderName = char.name.replace(/[\\/:*?"<>|]/g, '');
  }

  registerFolderAlias(charFolderName, char.id);
  registerFolderAlias(char.id.replace(/[_-]+/g, ' '), char.id);
  registerFolderAlias(char.id.replace(/[_\s]+/g, '-'), char.id);
  registerFolderAlias(char.id, char.id);
});

// Register manual extra aliases
registerFolderAlias('vops', 'comandante');
registerFolderAlias('vopss', 'comandante');
registerFolderAlias('sterling', 'sterling');
registerFolderAlias('arthur sterling', 'sterling');
registerFolderAlias('arthur stterling', 'sterling');
folderToCharId['brooke'] = 'brooke_byte';
folderToCharId['byte'] = 'brooke_byte';
folderToCharId['daichi'] = 'daichi_ren';
folderToCharId['ren'] = 'daichi_ren';

const IMAGE_EXTENSIONS = new Set(['.webp', '.png', '.jpg', '.jpeg', '.gif']);

function cleanName(fileName, index, sectionLabel) {
  const ext = path.extname(fileName);
  const base = path.basename(fileName, ext);
  
  if (base.toLowerCase().includes('chatgpt') || base.toLowerCase().includes('gemini') || /^\d+$/.test(base)) {
    return `${sectionLabel === 'Base' ? 'Concept Art' : sectionLabel} ${index + 1}`;
  }
  
  return base
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatSectionLabel(sectionName) {
  if (!sectionName || sectionName === 'base') return 'Base';
  if (sectionName.toLowerCase() === 'old') return 'Old';
  if (sectionName.toLowerCase() === 'alt') return 'Alt';

  return sectionName
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(' ')
    .map(word => {
      const lower = word.toLowerCase();
      if (/^mk\d+$/i.test(word) || lower === 'mkl') return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function getImagesInDir(dirPath, urlPrefix, section, sectionLabel) {
  if (!fs.existsSync(dirPath)) return [];
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const images = [];
  let genericIndex = 0;
  
  for (const entry of entries) {
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (IMAGE_EXTENSIONS.has(ext)) {
        const lowerName = entry.name.toLowerCase();
        // Only include files whose filename contains '_sheet' (case-insensitive)
        if (lowerName.includes('_sheet')) {
          const name = cleanName(entry.name, genericIndex++, sectionLabel);
          images.push({
            name,
            path: `${urlPrefix}/${entry.name}`,
            section,
            sectionLabel,
            isAlt: section !== 'base'
          });
        }
      }
    }
  }
  
  return images;
}

function generate() {
  console.log('Generating concept arts mapping...');
  const mapping = {};
  
  if (!fs.existsSync(GUIAS_BASE_DIR)) {
    console.error(`GUIAS directory not found at: ${GUIAS_BASE_DIR}`);
    return;
  }

  // Scan all directories inside GUIAS dynamically
  const categories = fs.readdirSync(GUIAS_BASE_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const category of categories) {
    const categoryDir = path.join(GUIAS_BASE_DIR, category);
    const folders = fs.readdirSync(categoryDir, { withFileTypes: true });
    
    for (const folder of folders) {
      if (folder.isDirectory()) {
        const charKey = folder.name.toLowerCase();
        const charId = folderToCharId[charKey];
        if (!charId) continue;
        
        const charDir = path.join(categoryDir, folder.name);
        const urlPrefix = `/personajes/GUIAS/${category}/${folder.name}`;
        
        const sections = [
          {
            dirPath: charDir,
            urlPrefix,
            section: 'base',
            sectionLabel: 'Base'
          }
        ];

        const subFolders = fs.readdirSync(charDir, { withFileTypes: true })
          .filter(entry => entry.isDirectory())
          .map(entry => entry.name)
          .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        for (const subFolder of subFolders) {
          sections.push({
            dirPath: path.join(charDir, subFolder),
            urlPrefix: `${urlPrefix}/${subFolder}`,
            section: subFolder,
            sectionLabel: formatSectionLabel(subFolder)
          });
        }
        
        const allImages = sections.flatMap((sectionConfig) =>
          getImagesInDir(
            sectionConfig.dirPath,
            sectionConfig.urlPrefix,
            sectionConfig.section,
            sectionConfig.sectionLabel
          )
        );

        if (allImages.length > 0) {
          mapping[charId] = [...(mapping[charId] || []), ...allImages];
        }
      }
    }
  }
  
  const content = `// This file is auto-generated by scripts/generate-concept-arts.js. Do not edit manually.

export interface ConceptArtItem {
  name: string;
  path: string;
  section: string;
  sectionLabel: string;
  isAlt: boolean;
}

export const conceptArts: Record<string, ConceptArtItem[]> = ${JSON.stringify(mapping, null, 2)};
`;
  
  fs.writeFileSync(OUTPUT_FILE, content, 'utf-8');
  console.log(`Generated ${OUTPUT_FILE} successfully!`);
}

generate();
