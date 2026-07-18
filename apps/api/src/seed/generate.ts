/**
 * Deterministic demo dataset for the sample workspace: "Harbor & Field",
 * a fictitious home-goods retailer selling online, in three stores, and on a
 * marketplace.
 *
 * The generator engineers real, discoverable signals so the insight engine and
 * anomaly detection have something true to say:
 *  - a Kitchen product surging in the most recent weeks (promo)
 *  - elevated Bath refunds in the last ~3 weeks (defective batch)
 *  - Saturday net sales declining for 4 consecutive weeks
 *  - one flash-sale spike day and one outage dip day
 *  - marketplace channel share growing over time
 *  - deliberate data-quality quirks (missing categories/customers, a few
 *    duplicate transaction ids) so the data-quality page reflects reality
 */

export interface SeedTransaction {
  transactionId: string | null;
  orderId: string;
  ts: string;
  day: string;
  productId: string;
  productName: string;
  category: string | null;
  quantity: number;
  grossSales: number;
  discounts: number;
  refunds: number;
  netSales: number;
  cost: number;
  customerId: string | null;
  customerName: string | null;
  channel: string;
  store: string | null;
  country: string;
  currency: string;
}

export type SeedSize = '1k' | '25k' | '250k';

const SIZES: Record<SeedSize, { months: number; dailyOrders: number }> = {
  '1k': { months: 6, dailyOrders: 3.6 },
  '25k': { months: 30, dailyOrders: 17.5 },
  '250k': { months: 30, dailyOrders: 175 },
};

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PRODUCTS: [name: string, category: string, price: number, cost: number][] = [
  ['Harbor Oak Dining Table', 'Furniture', 1240, 560],
  ['Field Lounge Chair', 'Furniture', 640, 275],
  ['Causeway Bookcase', 'Furniture', 480, 205],
  ['Slat Bench', 'Furniture', 320, 130],
  ['Ferry Side Table', 'Furniture', 210, 84],
  ['Quay Pendant Lamp', 'Lighting', 185, 72],
  ['Mooring Floor Lamp', 'Lighting', 260, 104],
  ['Beacon Table Lamp', 'Lighting', 95, 36],
  ['Tidal Sconce Pair', 'Lighting', 140, 55],
  ['Alta Ceramic Mug Set', 'Kitchen', 58, 19],
  ['Galley Stoneware Plates', 'Kitchen', 96, 34],
  ['Skillet No. 8', 'Kitchen', 145, 61],
  ['Harbor Cutting Board', 'Kitchen', 72, 24],
  ['Brine Jar Trio', 'Kitchen', 44, 14],
  ['Ripple Glass Carafe', 'Kitchen', 52, 17],
  ['Drift Linen Duvet', 'Textiles', 240, 98],
  ['Coastline Throw', 'Textiles', 110, 41],
  ['Weft Cushion', 'Textiles', 55, 18],
  ['Tideline Rug 6x9', 'Textiles', 520, 228],
  ['Sailcloth Curtains', 'Textiles', 130, 50],
  ['Anchorage Fire Bowl', 'Outdoor', 340, 148],
  ['Deck Lounger', 'Outdoor', 420, 182],
  ['Portside Planter L', 'Outdoor', 118, 46],
  ['Portside Planter S', 'Outdoor', 58, 22],
  ['Festoon Lights 10m', 'Outdoor', 74, 26],
  ['Meridian Wall Mirror', 'Decor', 190, 76],
  ['Cove Ceramic Vase', 'Decor', 64, 21],
  ['Ledger Frame Set', 'Decor', 88, 30],
  ['Sound Map Print', 'Decor', 46, 13],
  ['Ballast Bookends', 'Decor', 54, 18],
  ['Stowage Shelf Unit', 'Storage', 265, 112],
  ['Locker Cabinet', 'Storage', 385, 168],
  ['Crate & Lid M', 'Storage', 42, 15],
  ['Peg Rail 90cm', 'Storage', 38, 12],
  ['Harbor Waffle Towel Set', 'Bath', 78, 27],
  ['Quayside Bath Mat', 'Bath', 46, 16],
  ['Cedar Soap Dish', 'Bath', 22, 6],
  ['Mist Shower Curtain', 'Bath', 58, 20],
  ['Dune Storage Basket', 'Bath', 36, 12],
  ['Keel Coat Stand', 'Furniture', 230, 96],
  ['Lantern Votive Set', 'Decor', 34, 10],
  ['Galley Apron', 'Kitchen', 42, 13],
  ['Berth Quilt', 'Textiles', 180, 74],
  ['Jetty Doormat', 'Outdoor', 40, 14],
];

const FIRST = ['Asha','Ben','Carmen','Dev','Elif','Femi','Greta','Hugo','Ines','Jonas','Kaya','Leo','Mira','Nils','Ola','Petra','Quinn','Rosa','Sam','Tuva','Uma','Viktor','Wera','Ximena','Yusuf','Zara','Anouk','Bram','Chiara','Diego'];
const LAST = ['Aalto','Brandt','Castillo','Duarte','Eriksen','Fontaine','Gupta','Hansen','Ito','Jansen','Kimura','Lindgren','Marino','Novak','Okafor','Pereira','Quiroga','Rahman','Sato','Toivonen','Ueda','Vasquez','Weber','Yamada','Zeman','Abebe','Bianchi','Costa','Dvorak','Egede'];
const STORES = ['Rivergate', 'Union Market', 'Northline'];
const COUNTRIES: [string, number][] = [
  ['United States', 0.52], ['Canada', 0.12], ['United Kingdom', 0.11], ['Germany', 0.08],
  ['Australia', 0.07], ['Netherlands', 0.05], ['India', 0.05],
];

const DAY_MS = 86_400_000;

export function generateDataset(size: SeedSize, endDate = new Date()): SeedTransaction[] {
  const { months, dailyOrders } = SIZES[size];
  const rand = mulberry32(0x5167 + months * 31 + Math.round(dailyOrders * 10));
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const between = (a: number, b: number) => a + rand() * (b - a);

  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  const totalDays = Math.round(months * 30.44);

  // customers with a repeat-heavy core
  const nCustomers = Math.max(60, Math.round(dailyOrders * 45));
  const customers = Array.from({ length: nCustomers }, (_, i) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const r = rand();
    const country = countryFor(rand());
    return {
      id: `C-${String(i + 1).padStart(5, '0')}`,
      name,
      // 20% loyal core places most repeat orders
      weight: r < 0.2 ? between(3, 9) : between(0.4, 1.6),
      firstDay: Math.floor(Math.pow(rand(), 0.7) * totalDays), // days from start
      country,
    };
  });
  const customerWeightTotal = customers.reduce((a, c) => a + c.weight, 0);

  function countryFor(r: number): string {
    let acc = 0;
    for (const [name, w] of COUNTRIES) {
      acc += w;
      if (r <= acc) return name;
    }
    return COUNTRIES[0]![0];
  }

  // product popularity: long tail
  const weights = PRODUCTS.map(() => Math.pow(rand(), 1.7) + 0.06);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const pickProduct = (boostIndex: number | null, boost: number): number => {
    let r = rand() * (wSum + (boostIndex !== null ? weights[boostIndex]! * boost : 0));
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i]! * (i === boostIndex ? 1 + boost : 1);
      r -= w;
      if (r <= 0) return i;
    }
    return weights.length - 1;
  };

  const ALTA_IDX = PRODUCTS.findIndex(([n]) => n === 'Alta Ceramic Mug Set');

  // Pin the engineered anomaly days to fixed weekdays so they don't collide
  // with the weekend rhythm or the Saturday-decline signal:
  // flash sale = most recent Wednesday ≥ 15 days ago; outage = Tuesday ≥ 38 days ago.
  const dowAt = (offset: number) => new Date(end - offset * DAY_MS).getUTCDay();
  let flashOffset = 15;
  while (dowAt(flashOffset) !== 3) flashOffset++;
  let outageOffset = 38;
  while (dowAt(outageOffset) !== 2) outageOffset++;

  const out: SeedTransaction[] = [];
  let orderSeq = 0;
  let txSeq = 0;

  for (let dayOffset = totalDays; dayOffset >= 0; dayOffset--) {
    const dayMs = end - dayOffset * DAY_MS;
    const date = new Date(dayMs);
    const dow = date.getUTCDay();
    const month = date.getUTCMonth();
    const t = 1 - dayOffset / totalDays; // 0 oldest → 1 today
    const daysAgo = dayOffset;

    // volume model
    let volume = dailyOrders * (0.75 + 0.5 * t); // growth
    volume *= [0.72, 1.0, 0.98, 1.0, 1.04, 1.18, 1.3][dow]!; // weekday curve
    if (month === 10 || month === 11) volume *= 1.42; // holiday season
    if (month === 0) volume *= 0.8;
    // Saturday decline streak: last 4 Saturdays get progressively weaker
    if (dow === 6 && daysAgo <= 28) volume *= 1 - 0.09 * (5 - Math.ceil(daysAgo / 7));
    // anomalies
    if (daysAgo === flashOffset) volume *= 3.5; // flash sale (Wednesday)
    if (daysAgo === outageOffset) volume *= 0.18; // outage (Tuesday)
    volume *= between(0.8, 1.25);

    const nOrders = Math.max(0, Math.round(volume));
    for (let o = 0; o < nOrders; o++) {
      orderSeq++;
      const orderId = `O-${String(orderSeq).padStart(6, '0')}`;

      // channel mix: marketplace grows over time
      const mpShare = 0.10 + 0.14 * t;
      const chRoll = rand();
      const channel = chRoll < mpShare ? 'marketplace' : chRoll < mpShare + 0.38 ? 'store' : 'online';
      const store = channel === 'store' ? pick(STORES) : null;

      // customer: sampled by weight among those who exist by this day
      let cust = customers[Math.floor(rand() * customers.length)]!;
      for (let tries = 0; tries < 8; tries++) {
        let r = rand() * customerWeightTotal;
        for (const c of customers) {
          r -= c.weight;
          if (r <= 0) {
            cust = c;
            break;
          }
        }
        if (cust.firstDay <= totalDays - dayOffset) break;
      }

      const hour = pickHour(rand, dow);
      const ts = new Date(dayMs + hour * 3_600_000 + Math.floor(rand() * 3600) * 1000).toISOString();
      const day = ts.slice(0, 10);
      const country = channel === 'store' ? 'United States' : cust.country;

      const promoWeekend = (dow === 5 || dow === 6) && rand() < 0.5;
      const flashSale = daysAgo === flashOffset;

      const nLines = 1 + (rand() < 0.35 ? 1 : 0) + (rand() < 0.15 ? 1 : 0) + (rand() < 0.05 ? 1 : 0);
      const usedProducts = new Set<number>();
      for (let li = 0; li < nLines; li++) {
        // Alta mug surge in the last ~3 weeks
        const altaBoost = daysAgo <= 21 ? 7 : 0;
        let pi = pickProduct(altaBoost ? ALTA_IDX : null, altaBoost);
        if (usedProducts.has(pi)) pi = (pi + 1) % PRODUCTS.length;
        usedProducts.add(pi);
        const [name, category, price, cost] = PRODUCTS[pi]!;
        const qty = 1 + (rand() < 0.3 ? 1 : 0) + (price < 80 && rand() < 0.25 ? Math.floor(between(1, 3)) : 0);
        const gross = round2(qty * price);

        let discount = 0;
        if (flashSale) discount = round2(gross * between(0.2, 0.3));
        else if (promoWeekend && rand() < 0.55) discount = round2(gross * between(0.08, 0.18));
        else if (rand() < 0.08) discount = round2(gross * between(0.05, 0.12));

        // refunds: base 2.2%; Bath category defect window in last 3 weeks → 14%
        let refund = 0;
        const bathDefect = category === 'Bath' && daysAgo <= 20;
        const refundP = bathDefect ? 0.14 : 0.022;
        if (rand() < refundP) {
          refund = rand() < 0.7 ? round2(gross - discount) : round2((gross - discount) * 0.5);
        }

        txSeq++;
        // data-quality quirks (deterministic rates)
        const missingCategory = rand() < 0.006;
        const missingCustomer = rand() < 0.012;
        const dupTxn = txSeq % 4000 === 0; // a few duplicate transaction ids
        const txnId = dupTxn ? `T-DUP-${String(txSeq % 17).padStart(3, '0')}` : `T-${String(txSeq).padStart(7, '0')}`;

        out.push({
          transactionId: txnId,
          orderId,
          ts,
          day,
          productId: `HF-${String(pi + 1).padStart(3, '0')}`,
          productName: name,
          category: missingCategory ? null : category,
          quantity: qty,
          grossSales: gross,
          discounts: discount,
          refunds: refund,
          netSales: round2(gross - discount - refund),
          cost: round2(qty * cost),
          customerId: missingCustomer ? null : cust.id,
          customerName: missingCustomer ? null : cust.name,
          channel,
          store,
          country,
          currency: 'USD',
        });
      }
    }
  }
  return out;
}

function pickHour(rand: () => number, dow: number): number {
  // two-peak retail curve: lunch and evening; weekends flatter
  const r = rand();
  const weekend = dow === 0 || dow === 6;
  if (weekend) return 10 + Math.floor(r * 10); // 10:00–19:59
  if (r < 0.35) return 11 + Math.floor(rand() * 3); // lunch
  if (r < 0.75) return 17 + Math.floor(rand() * 4); // evening
  return 9 + Math.floor(rand() * 11);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
