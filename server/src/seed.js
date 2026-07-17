import bcrypt from 'bcryptjs';
import { db, migrate } from './db.js';

// Deterministic PRNG so the demo dataset is stable across reseeds.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260717);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => min + rand() * (max - min);
const intBetween = (min, max) => Math.floor(between(min, max + 1));

const PRODUCTS = [
  // [name, category, price, cost]
  ['Aurora Desk Lamp', 'Lighting', 89, 34],
  ['Halo Pendant Light', 'Lighting', 149, 61],
  ['Ember Floor Lamp', 'Lighting', 219, 92],
  ['Drift Table Lamp', 'Lighting', 74, 28],
  ['Oslo Lounge Chair', 'Furniture', 549, 240],
  ['Tama Side Table', 'Furniture', 189, 77],
  ['Linea Bookshelf', 'Furniture', 429, 185],
  ['Nook Armchair', 'Furniture', 479, 210],
  ['Field Sofa 3-Seat', 'Furniture', 1290, 590],
  ['Klip Wall Hook Set', 'Accessories', 24, 7],
  ['Vessel Ceramic Vase', 'Accessories', 58, 19],
  ['Strata Tray', 'Accessories', 42, 13],
  ['Loop Throw Blanket', 'Textiles', 96, 37],
  ['Grid Cushion', 'Textiles', 49, 16],
  ['Wave Area Rug', 'Textiles', 340, 148],
  ['Fold Linen Curtain', 'Textiles', 128, 51],
  ['Terra Planter Large', 'Outdoor', 112, 44],
  ['Terra Planter Small', 'Outdoor', 56, 21],
  ['Arbor Garden Bench', 'Outdoor', 620, 275],
  ['Beam String Lights', 'Outdoor', 68, 23],
  ['Atlas Serving Board', 'Kitchen', 78, 27],
  ['Ridge Stoneware Set', 'Kitchen', 164, 66],
  ['Pour Carafe', 'Kitchen', 52, 17],
  ['Crumb Bread Bin', 'Kitchen', 88, 33],
];

const FIRST = ['Ava','Liam','Maya','Noah','Zoe','Ethan','Isla','Lucas','Nora','Kai','Ivy','Owen','Ruby','Felix','Cora','Jude','Elsa','Milo','Wren','Theo','Sana','Aditi','Rohan','Mei','Yara','Diego','Lena','Omar','Priya','Anders'];
const LAST = ['Hart','Bose','Kim','Reyes','Larsen','Okafor','Tanaka','Novak','Silva','Mehta','Weber','Costa','Iyer','Fontaine','Egede','Moreau','Lindqvist','Abara','Sato','Kovacs','Deshmukh','Haugen','Romano','Nakamura','Sørensen','Vargas','Petrov','Anand','Berg','Oduya'];
const CITIES = [
  ['New York', 'United States'], ['Austin', 'United States'], ['Portland', 'United States'],
  ['London', 'United Kingdom'], ['Manchester', 'United Kingdom'],
  ['Berlin', 'Germany'], ['Copenhagen', 'Denmark'], ['Amsterdam', 'Netherlands'],
  ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['Melbourne', 'Australia'],
  ['Mumbai', 'India'], ['Bengaluru', 'India'], ['Tokyo', 'Japan'], ['Singapore', 'Singapore'],
];

const MONTHS = 24;                 // history window
const N_CUSTOMERS = 420;
const END = new Date('2026-07-17T00:00:00Z');

function seed() {
  migrate();

  db.exec(`
    DELETE FROM order_items; DELETE FROM orders;
    DELETE FROM customers; DELETE FROM products; DELETE FROM users;
    DELETE FROM sqlite_sequence;
  `);

  // --- users ---------------------------------------------------------------
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  insertUser.run('Demo User', 'demo@xorai.app', bcrypt.hashSync('demo1234', 10), 'admin');

  // --- products ------------------------------------------------------------
  const insertProduct = db.prepare(
    'INSERT INTO products (sku, name, category, price, cost) VALUES (?, ?, ?, ?, ?)'
  );
  PRODUCTS.forEach(([name, category, price, cost], i) => {
    const sku = `XR-${String(i + 1).padStart(3, '0')}`;
    insertProduct.run(sku, name, category, price, cost);
  });

  // --- customers -----------------------------------------------------------
  const insertCustomer = db.prepare(
    'INSERT INTO customers (name, email, city, country, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const start = new Date(END);
  start.setUTCMonth(start.getUTCMonth() - MONTHS);
  const spanMs = END.getTime() - start.getTime();

  for (let i = 0; i < N_CUSTOMERS; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}.${i}@example.com`;
    const [city, country] = pick(CITIES);
    // Bias sign-ups toward the recent half so the customer base is growing.
    const at = new Date(start.getTime() + spanMs * Math.pow(rand(), 0.65));
    insertCustomer.run(name, email, city, country, at.toISOString());
  }
  const customers = db.prepare('SELECT id, created_at FROM customers').all();

  // --- orders --------------------------------------------------------------
  // Popularity weights per product (some products are hits, some long-tail).
  const weights = PRODUCTS.map(() => Math.pow(rand(), 1.6) + 0.08);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const pickProduct = () => {
    let r = rand() * weightSum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  const insertOrder = db.prepare(
    'INSERT INTO orders (customer_id, channel, status, total, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)'
  );

  const seedAll = db.transaction(() => {
    let orderCount = 0;
    for (let dayOffset = MONTHS * 30.44; dayOffset >= 0; dayOffset--) {
      const day = new Date(END.getTime() - dayOffset * 86400000);
      const t = 1 - dayOffset / (MONTHS * 30.44); // 0 → oldest, 1 → today

      // Base volume: gentle growth + weekly rhythm + holiday-season bump.
      const growth = 12 + 20 * t;
      const dow = day.getUTCDay();
      const weekly = dow === 0 ? 0.62 : dow === 6 ? 1.25 : dow === 5 ? 1.15 : 1.0;
      const month = day.getUTCMonth();
      const seasonal = month === 10 || month === 11 ? 1.45 : month === 0 ? 0.78 : 1.0;
      const noise = between(0.75, 1.3);
      const nOrders = Math.round(growth * weekly * seasonal * noise);

      for (let k = 0; k < nOrders; k++) {
        // Only customers who already existed can order.
        let cust = pick(customers);
        for (let tries = 0; tries < 6 && new Date(cust.created_at) > day; tries++) {
          cust = pick(customers);
        }
        if (new Date(cust.created_at) > day) continue;

        const channelRoll = rand();
        const channel = channelRoll < 0.58 ? 'online' : channelRoll < 0.92 ? 'in-store' : 'wholesale';
        const statusRoll = rand();
        const status = statusRoll < 0.936 ? 'completed' : statusRoll < 0.975 ? 'refunded' : 'cancelled';

        const at = new Date(day.getTime() + intBetween(8, 21) * 3600000 + intBetween(0, 59) * 60000);
        const nItems = channel === 'wholesale' ? intBetween(3, 7) : intBetween(1, 3);

        const items = [];
        let total = 0;
        for (let j = 0; j < nItems; j++) {
          const pi = pickProduct();
          const qty = channel === 'wholesale' ? intBetween(4, 20) : intBetween(1, 3);
          const price = PRODUCTS[pi][2];
          items.push([pi + 1, qty, price]);
          total += qty * price;
        }

        const info = insertOrder.run(cust.id, channel, status, Math.round(total * 100) / 100, at.toISOString());
        for (const [productId, qty, price] of items) {
          insertItem.run(info.lastInsertRowid, productId, qty, price);
        }
        orderCount++;
      }
    }
    return orderCount;
  });

  const n = seedAll();
  const revenue = db.prepare("SELECT ROUND(SUM(total)) r FROM orders WHERE status='completed'").get().r;
  console.log(`Seeded ${n} orders, ${N_CUSTOMERS} customers, ${PRODUCTS.length} products — $${Number(revenue).toLocaleString()} completed revenue.`);
}

seed();
