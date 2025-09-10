const { connectDB } = require('../config/db');
const Product = require('../models/Product');
const User = require('../models/User');
const Setting = require('../models/Setting');
const bcrypt = require('bcrypt');

async function run() {
  await connectDB();
  await User.deleteMany({});
  await Setting.deleteMany({});
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);
  const masterHash = await bcrypt.hash(process.env.MASTER_PASSWORD || 'changeme-master', 10);
  await User.create({ username: 'admin', passwordHash: adminHash, admin: true });
  await User.create({ username: 'user', passwordHash: userHash, admin: false });
  await Setting.create({ masterPasswordHash: masterHash });
  // eslint-disable-next-line no-console
  console.log('Seeded products:', sample.length, 'and users: admin/admin123, user/user123, master password set via env MASTER_PASSWORD');
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


