const fs = require('fs/promises');
const path = require('path');

const writeQueues = new Map();

function getDataDir() {
  return process.env.PTP_DATA_DIR
    ? path.resolve(process.env.PTP_DATA_DIR)
    : path.resolve(__dirname, '../../data');
}

function getCollectionFile(collectionName) {
  return path.join(getDataDir(), `${collectionName}.json`);
}

async function ensureCollectionFile(collectionName) {
  const dataDir = getDataDir();
  const filePath = getCollectionFile(collectionName);

  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '[]', 'utf8');
  }

  return filePath;
}

async function readCollection(collectionName) {
  const filePath = await ensureCollectionFile(collectionName);
  const raw = await fs.readFile(filePath, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function queueWrite(collectionName, updater) {
  const previous = writeQueues.get(collectionName) || Promise.resolve();

  const next = previous.then(async () => {
    const filePath = await ensureCollectionFile(collectionName);
    const current = await readCollection(collectionName);
    const updated = await updater(current);
    await fs.writeFile(filePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
    return updated;
  });

  writeQueues.set(collectionName, next.catch(() => {}));
  return next;
}

async function list(collectionName) {
  return readCollection(collectionName);
}

async function save(collectionName, item, { sortBy = 'created_at', descending = true } = {}) {
  return queueWrite(collectionName, async (current) => {
    const filtered = current.filter((entry) => entry.id !== item.id);
    const next = [item, ...filtered];

    if (!sortBy) return next;

    return next.sort((a, b) => {
      const aValue = new Date(a?.[sortBy] || 0).getTime();
      const bValue = new Date(b?.[sortBy] || 0).getTime();
      return descending ? bValue - aValue : aValue - bValue;
    });
  });
}

async function remove(collectionName, id) {
  const updated = await queueWrite(collectionName, async (current) => (
    current.filter((entry) => entry.id !== id)
  ));

  return updated;
}

async function clear(collectionName) {
  await queueWrite(collectionName, async () => []);
}

async function findById(collectionName, id) {
  const items = await readCollection(collectionName);
  return items.find((entry) => entry.id === id) || null;
}

module.exports = {
  list,
  save,
  remove,
  clear,
  findById,
  __test__: {
    getDataDir,
    getCollectionFile,
  },
};
