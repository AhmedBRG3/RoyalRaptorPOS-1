const bcrypt = require('bcrypt');
const User = require('../models/User');
const Setting = require('../models/Setting');
const Account = require('../models/Account');

let bootstrapRan = false;

async function ensureSeeded() {
  if (bootstrapRan) return;
  bootstrapRan = true;

  const adminExists = await User.exists({ admin: true });
  if (!adminExists) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, passwordHash, admin: true, finance: true });
    // eslint-disable-next-line no-console
    console.log(`[BOOTSTRAP] Created default admin user '${username}'.`);
  }

  const hasSetting = await Setting.findOne();
  if (!hasSetting) {
    const master = process.env.MASTER_PASSWORD || 'changeme';
    const masterPasswordHash = await bcrypt.hash(master, 10);
    await Setting.create({ masterPasswordHash });
    // eslint-disable-next-line no-console
    console.log(`[BOOTSTRAP] Created master password from env MASTER_PASSWORD.`);
  }

  // Ensure 'code' index on accounts is sparse unique (to avoid dup key on null)
  try {
    const indexes = await Account.collection.indexes();
    const hasNonSparseCode = indexes.find((idx) => idx.name === 'code_1' && !idx.sparse);
    if (hasNonSparseCode) {
      await Account.collection.dropIndex('code_1');
      console.log('[BOOTSTRAP] Dropped non-sparse code_1 index on accounts');
    }
  } catch (e) {
    // ignore if index not found
  }
  try {
    await Account.collection.createIndex({ code: 1 }, { unique: true, sparse: true, name: 'code_1' });
    console.log('[BOOTSTRAP] Ensured sparse unique index on accounts.code');
  } catch (e) {
    // ignore if already exists with correct options
  }
}

module.exports = { ensureSeeded };


 

