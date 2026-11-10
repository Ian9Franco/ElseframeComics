const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const guiasDir = path.join(projectRoot, 'public', 'personajes', 'GUIAS');
const charDataDir = path.join(projectRoot, 'lib', 'characterData');
const unlockRulesPath = path.join(charDataDir, 'unlockRules.ts');

const dataFiles = {
  Secundarios: { filename: 'secundarios.ts', categoryName: 'secundarios' },
  antagonistas: { filename: 'antagonistas.ts', categoryName: 'antagonistas' },
  elseframe: { filename: 'pibes.ts', categoryName: 'pibes' },
  deidades: { filename: 'deidades.ts', categoryName: 'deidades' },
  entidades: { filename: 'entidades.ts', categoryName: 'entidades' },
  matis: { filename: 'matis.ts', categoryName: 'matis' },
  voughtverse: { filename: 'voughtverse.ts', categoryName: 'voughtverse' },
};

// Simple parser for characters in ts files
function loadCharacters(filename) {
  const filePath = path.join(charDataDir, filename);
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  const chars = [];
  const lines = content.split('\n');
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    const idMatch = /^id:\s*['"`]([^'"`]+)['"`]/i.exec(line)
      || /^\{\s*id:\s*['"`]([^'"`]+)['"`]/i.exec(line);

    if (idMatch) {
      if (current?.id) chars.push(current);
      current = { id: idMatch[1] };
      continue;
    }

    if (current) {
      const nameMatch = /^name:\s*['"`]([^'"`]+)['"`]/i.exec(line);
      if (nameMatch) {
        current.name = nameMatch[1];
      }
    }
  }
  if (current?.id) chars.push(current);
  return chars;
}

// Normalize strings for matching
function normalize(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extra aliases to help match folders to registered IDs
const extraAliases = {
  vesperwing: 'ian',
  aegis: 'uandi',
  bandit: 'julian',
  wildcard: 'julian',
  outrider: 'volvo',
  nullvector: 'volvo',
  'null-vector': 'volvo',
  vector: 'volvo',
  farsight: 'mati',
  swapfire: 'mati',
  sigil: 'jaz',
  oracle: 'jaz',
  dusk: 'sofi',
  hush: 'sofi',
  lucy: 'lucifer',
  tusk: 'ymir',
  nightstalker: 'balanar',
  bristleback: 'bristleback',
  crystalmaiden: 'rylai',
  rylai: 'rylai',
  matapobres: 'matapobre',
  supercamionero: 'supertrucker',
  vops: 'comandante',
  vopss: 'comandante',
  sterling: 'sterling',
  arthursterling: 'sterling',
};

function cleanId(folderName) {
  return folderName.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getPropertyValue(objStr, propName) {
  const regex = new RegExp(`\\b${propName}\\s*:\\s*['"\`]([^'"\`]+)['"\`]`);
  const match = regex.exec(objStr);
  return match ? match[1] : null;
}

function parseObjects(arrayText) {
  const objects = [];
  let braceCount = 0;
  let currentObjectStart = -1;
  let inString = false;
  let stringChar = null;

  for (let i = 0; i < arrayText.length; i++) {
    const char = arrayText[i];
    
    if ((char === "'" || char === '"' || char === '`') && arrayText[i - 1] !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    if (inString) continue;

    if (char === '{') {
      if (braceCount === 0) {
        currentObjectStart = i;
      }
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0 && currentObjectStart !== -1) {
        objects.push(arrayText.substring(currentObjectStart, i + 1));
        currentObjectStart = -1;
      }
    }
  }
  return objects;
}

function addCommaToLastLine(text) {
  const lines = text.split('\n');
  const lastLineIdx = lines.length - 1;
  const lastLine = lines[lastLineIdx];
  
  const commentIdx = lastLine.indexOf('//');
  if (commentIdx !== -1) {
    const codePart = lastLine.substring(0, commentIdx).trimEnd();
    const commentPart = lastLine.substring(commentIdx);
    lines[lastLineIdx] = `${codePart}, ${commentPart}`;
  } else {
    lines[lastLineIdx] = lastLine.trimEnd() + ',';
  }
  return lines.join('\n');
}

function appendToTsArray(filePath, tsSnippet) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  const lastBracketIdx = content.lastIndexOf('];');
  if (lastBracketIdx === -1) return;
  
  let before = content.substring(0, lastBracketIdx).trimEnd();
  
  const cleanedBefore = before.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const lastChar = cleanedBefore.slice(-1);
  const needsComma = (lastChar !== ',' && lastChar !== '[');
  
  if (needsComma) {
    before = addCommaToLastLine(before);
  }
  
  const insert = '\n' + tsSnippet + '\n';
  const newContent = before + insert + '];\n';
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

function appendToUnlockRules(filePath, charId) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  const ruleRegex = new RegExp(`\\b${charId}\\b\\s*:`, 'i');
  if (ruleRegex.test(content)) return;
  
  const lastBraceIdx = content.lastIndexOf('};');
  if (lastBraceIdx === -1) return;
  
  let before = content.substring(0, lastBraceIdx).trimEnd();
  
  const cleanedBefore = before.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const lastChar = cleanedBefore.slice(-1);
  const needsComma = (lastChar !== ',' && lastChar !== '{');
  
  if (needsComma) {
    before = addCommaToLastLine(before);
  }
  
  const insert = `\n  ${charId}: []\n`;
  const newContent = before + insert + '};\n';
  
  fs.writeFileSync(filePath, newContent, 'utf8');
}

function removeUnlockRule(filePath, charId) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const filteredLines = lines.filter(line => {
    const trimmed = line.trim();
    const regex = new RegExp(`^\\b${charId}\\b\\s*:`);
    return !regex.test(trimmed);
  });
  
  fs.writeFileSync(filePath, filteredLines.join('\n'), 'utf8');
}

function pruneCharacters(filePath, categoryFolder, folders, unlockRulesPath) {
  if (!fs.existsSync(filePath)) return 0;
  let content = fs.readFileSync(filePath, 'utf8');

  const firstBracketIdx = content.indexOf(' = [');
  if (firstBracketIdx === -1) return 0;
  
  const arrayStart = content.indexOf('[', firstBracketIdx);
  const lastBracketIdx = content.lastIndexOf('];');
  if (arrayStart === -1 || lastBracketIdx === -1) return 0;

  const arrayText = content.substring(arrayStart + 1, lastBracketIdx);
  const charObjects = parseObjects(arrayText);
  if (charObjects.length === 0) return 0;

  const folderNamesSet = new Set(folders.map(f => normalize(f)));
  const keptObjects = [];
  let prunedCount = 0;

  for (const objStr of charObjects) {
    const id = getPropertyValue(objStr, 'id');
    const name = getPropertyValue(objStr, 'name');
    
    if (!id || !name) {
      keptObjects.push(objStr);
      continue;
    }

    const normId = normalize(id);
    const normName = normalize(name);

    // Check if folder exists
    let hasFolder = folderNamesSet.has(normId) || folderNamesSet.has(normName);
    if (!hasFolder) {
      for (const [folderKey, charId] of Object.entries(extraAliases)) {
        if (charId === id && folderNamesSet.has(folderKey)) {
          hasFolder = true;
          break;
        }
      }
    }

    if (hasFolder) {
      keptObjects.push(objStr);
    } else {
      // No folder! Check if unmodified stub
      const role = getPropertyValue(objStr, 'role');
      const visualCode = getPropertyValue(objStr, 'visualCode');
      const isUnmodified = (role === 'Nuevo Personaje' && visualCode === 'Descripción visual base');

      if (isUnmodified) {
        console.log(`   ➖ Pruning unused stub character: "${name}" (ID: "${id}") from ${path.basename(filePath)}...`);
        removeUnlockRule(unlockRulesPath, id);
        prunedCount++;
      } else {
        console.log(`   ⚠️  Character "${name}" (ID: "${id}") is registered but its GUIAS folder is missing. Keeping it to protect custom modifications.`);
        console.log(`       💡 Tip: If you renamed this character's folder to something else (e.g. "NewName"), you can link them by adding an alias in scripts/assets/sync-missing-characters.js:`);
        console.log(`          'newname': '${id}'\n`);
        keptObjects.push(objStr);
      }
    }
  }

  if (prunedCount > 0) {
    const beforeText = content.substring(0, arrayStart + 1);
    const afterText = content.substring(lastBracketIdx);
    const newArrayText = '\n' + keptObjects.map(obj => obj.trim()).join(',\n\n') + '\n';
    fs.writeFileSync(filePath, beforeText + newArrayText + afterText, 'utf8');
  }

  return prunedCount;
}

function syncCharacters() {
  console.log('🔄 Checking for missing and orphaned characters in public/personajes/GUIAS...');
  let addedCount = 0;
  let prunedCount = 0;

  for (const [categoryFolder, config] of Object.entries(dataFiles)) {
    const categoryPath = path.join(guiasDir, categoryFolder);
    if (!fs.existsSync(categoryPath)) continue;

    const { filename, categoryName } = config;
    const filePath = path.join(charDataDir, filename);

    // Get folders
    const folders = fs.readdirSync(categoryPath).filter(f => {
      return fs.statSync(path.join(categoryPath, f)).isDirectory();
    });

    // 1. Prune first
    prunedCount += pruneCharacters(filePath, categoryFolder, folders, unlockRulesPath);

    // 2. Add missing
    const registered = loadCharacters(filename);
    const registeredIds = new Set(registered.map(c => c.id));

    for (const folder of folders) {
      const normFolder = normalize(folder);

      let matchedId = null;
      if (extraAliases[normFolder]) {
        matchedId = extraAliases[normFolder];
      } else if (registeredIds.has(folder)) {
        matchedId = folder;
      } else {
        for (const char of registered) {
          if (normalize(char.id) === normFolder || normalize(char.name) === normFolder) {
            matchedId = char.id;
            break;
          }
        }
      }

      if (!matchedId) {
        const charId = cleanId(folder);
        console.log(`   ➕ Adding missing character: "${folder}" (ID: "${charId}") to ${filename}...`);

        const isSecondary = categoryName !== 'pibes';
        const imagePath = `/personajes/PORTADAS/${folder}/${folder}.webp`;

        const tsSnippet = `  {
    id: '${charId}',
    name: '${folder}',
    category: '${categoryName}',
    isSecondary: ${isSecondary},
    image: '${imagePath}',
    fullBody: '${imagePath}',
    color: '#6b7280',
    role: 'Nuevo Personaje',
    visualCode: 'Descripción visual base',
    perfil: [
      'Detalle de perfil 1: Escribe aquí sobre el personaje.',
      'Detalle de perfil 2: Escribe aquí sobre el personaje.',
      'Detalle de perfil 3: Escribe aquí sobre el personaje.'
    ],
    crisis: 'Descripción de su momento de crisis o debilidad.',
    stats: { fuerza: 5, inteligencia: 5, carisma: 5, suerte: 5, combate: 5, defensa: 5, especialVal: 5 },
    especialLabel: 'Poder Único',
    powers: {
      role: 'Rol de Poder',
      habilidades: [
        'Habilidad 1: Descripción de la habilidad.',
        'Habilidad 2: Descripción de la habilidad.',
        'Habilidad 3: Descripción de la habilidad.'
      ],
      significa: 'Qué significa su poder en combate.',
      crisis: 'Debilidad o crisis al usar su poder.',
      stats: { fuerza: 6, inteligencia: 6, carisma: 6, suerte: 6, combate: 6, defensa: 6, especialVal: 6 }
    }
  }`;

        appendToTsArray(filePath, tsSnippet);
        appendToUnlockRules(unlockRulesPath, charId);

        addedCount++;
      }
    }
  }

  if (addedCount > 0 || prunedCount > 0) {
    console.log(`✅ Synchronized! Added: ${addedCount}, Pruned: ${prunedCount}`);
  } else {
    console.log('✅ No changes needed. All in sync.');
  }
}

if (require.main === module) {
  syncCharacters();
}

module.exports = { syncCharacters };
