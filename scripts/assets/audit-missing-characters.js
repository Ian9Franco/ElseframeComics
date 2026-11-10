const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const guiasDir = path.join(projectRoot, 'public', 'personajes', 'GUIAS');
const charDataDir = path.join(projectRoot, 'lib', 'characterData');

const dataFiles = {
  secundarios: 'secundarios.ts',
  antagonistas: 'antagonistas.ts',
  elseframe: 'pibes.ts',
  deidades: 'deidades.ts',
  entidades: 'entidades.ts',
  matis: 'matis.ts',
  voughtverse: 'voughtverse.ts',
};

// Simple parser for characters in ts files
function loadCharacters(filename) {
  const filePath = path.join(charDataDir, filename);
  if (!fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8');
  // Match blocks of the form { id: '...', name: '...' }
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

function checkMissing() {
  const report = {};

  for (const [categoryFolder, dataFilename] of Object.entries(dataFiles)) {
    const categoryPath = path.join(guiasDir, categoryFolder);
    if (!fs.existsSync(categoryPath)) {
      console.log(`Folder not found: ${categoryFolder}`);
      continue;
    }

    // Load registered characters for this category
    const registered = loadCharacters(dataFilename);
    const registeredIds = new Set(registered.map(c => c.id));
    const registeredNames = new Set(registered.map(c => normalize(c.name)));

    const folders = fs.readdirSync(categoryPath).filter(f => {
      return fs.statSync(path.join(categoryPath, f)).isDirectory();
    });

    const missing = [];
    for (const folder of folders) {
      const normFolder = normalize(folder);
      
      // Check if folder maps to an ID
      let matchedId = null;
      if (extraAliases[normFolder]) {
        matchedId = extraAliases[normFolder];
      } else if (registeredIds.has(folder)) {
        matchedId = folder;
      } else {
        // Try normalized ID/Name matching
        for (const char of registered) {
          if (normalize(char.id) === normFolder || normalize(char.name) === normFolder) {
            matchedId = char.id;
            break;
          }
        }
      }

      if (!matchedId) {
        missing.push(folder);
      }
    }

    if (missing.length > 0) {
      report[categoryFolder] = {
        dataFilename,
        missing,
      };
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

checkMissing();
