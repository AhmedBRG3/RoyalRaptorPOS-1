const bcrypt = require('bcrypt');
const User = require('../models/User');
const Setting = require('../models/Setting');

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
}

module.exports = { ensureSeeded };


 

