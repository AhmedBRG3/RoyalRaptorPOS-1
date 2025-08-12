const { connectDB } = require('../config/db');
const Product = require('../models/Product');
const User = require('../models/User');
const bcrypt = require('bcrypt');

async function run() {
  await connectDB();
  const sample = [
    { name: 'Espresso', sku: 'ESP-001', price: 3.0, quantity: 100, sold: 0 },
    { name: 'Latte', sku: 'LAT-001', price: 4.5, quantity: 100, sold: 0 },
    { name: 'Croissant', sku: 'CRS-001', price: 2.75, quantity: 50, sold: 0 },
  ];
  await Product.deleteMany({});
  await Product.insertMany(sample);
  await User.deleteMany({});
  const adminHash = await bcrypt.hash('admin123', 10);
  const userHash = await bcrypt.hash('user123', 10);
  await User.create({ username: 'admin', passwordHash: adminHash, admin: true });
  await User.create({ username: 'user', passwordHash: userHash, admin: false });
  // eslint-disable-next-line no-console
  console.log('Seeded products:', sample.length, 'and users: admin/admin123, user/user123');
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});


