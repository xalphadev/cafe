import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";
import bcrypt from "bcryptjs";

const Role = { ADMIN: "ADMIN" as const, CUSTOMER: "CUSTOMER" as const };
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database — ช่วงเวลาคาเฟ่...");

  // ── Admin ───────────────────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin1234", 10);
  const admin = await prisma.user.upsert({
    where:  { phone: "0800000000" },
    update: { email: "admin@chuangwela.cafe", name: "Admin", passwordHash: adminPassword },
    create: {
      phone:        "0800000000",
      name:         "Admin",
      role:         Role.ADMIN,
      email:        "admin@chuangwela.cafe",
      passwordHash: adminPassword,
    },
  });
  console.log("Admin:", admin.email);

  // ── Loyalty ─────────────────────────────────────────────────────────────
  await prisma.loyaltySetting.upsert({
    where:  { id: "default" },
    update: {},
    create: {
      id: "default",
      earnRate:         10,   // ทุก 10 บาท = 1 แต้ม
      redeemRate:       100,  // 100 แต้ม = 10 บาท
      minRedeemPoints:  100,
      maxRedeemPercent: 20,
    },
  });

  // ── Delivery zones ──────────────────────────────────────────────────────
  const zones = [
    { id: "zone-1", name: "ใกล้ร้าน",   description: "ระยะ 0–3 กม.",  deliveryFee: 20,  minOrder: 80  },
    { id: "zone-2", name: "ในเมือง",     description: "ระยะ 3–7 กม.",  deliveryFee: 35,  minOrder: 150 },
    { id: "zone-3", name: "นอกเมือง",   description: "ระยะ 7–15 กม.", deliveryFee: 60,  minOrder: 250 },
  ];
  for (const z of zones) {
    await prisma.deliveryZone.upsert({ where: { id: z.id }, update: {}, create: z });
  }

  // ── Categories ──────────────────────────────────────────────────────────
  const categories = [
    { id: "cat-coffee",  name: "กาแฟสด",       image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400", sortOrder: 1 },
    { id: "cat-tea",     name: "ชา",            image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400", sortOrder: 2 },
    { id: "cat-milk",    name: "นมสด",          image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400", sortOrder: 3 },
    { id: "cat-special", name: "เมนูพิเศษ",    image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400", sortOrder: 4 },
    { id: "cat-bakery",  name: "เครื่องดื่มปั่น", image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400", sortOrder: 5 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, update: { name: c.name, image: c.image }, create: c });
  }
  console.log("Categories: OK");

  // ── Products ────────────────────────────────────────────────────────────
  const products = [
    // ── กาแฟสด ──────────────────────────────────────────────────────────
    {
      id: "prod-americano", categoryId: "cat-coffee", sortOrder: 1,
      name: "อเมริกาโน่", description: "เอสเปรสโซ่ผสมน้ำร้อน กลิ่นหอม รสชาติกลมกล่อม",
      price: 65, isFeatured: true,
      image: "https://images.unsplash.com/photo-1606791422814-b32c705e3e2f?w=400",
    },
    {
      id: "prod-latte", categoryId: "cat-coffee", sortOrder: 2,
      name: "ลาเต้", description: "เอสเปรสโซ่นุ่มผสมนมสด ฟองนมเนียนละเอียด",
      price: 75, isFeatured: true,
      image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400",
    },
    {
      id: "prod-cappuccino", categoryId: "cat-coffee", sortOrder: 3,
      name: "คาปูชิโน่", description: "เอสเปรสโซ่ นมสด ฟองนมนุ่ม สัดส่วนสมบูรณ์แบบ",
      price: 75, isFeatured: false,
      image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400",
    },
    {
      id: "prod-mocha", categoryId: "cat-coffee", sortOrder: 4,
      name: "มอคค่า", description: "กาแฟผสมช็อกโกแลตเข้มข้น นมสดหวานมัน",
      price: 80, isFeatured: false,
      image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400",
    },
    {
      id: "prod-espresso", categoryId: "cat-coffee", sortOrder: 5,
      name: "เอสเปรสโซ่", description: "กาแฟเข้มข้น ดึงช็อตคู่ กลิ่นหอมเข้มแท้",
      price: 55, isFeatured: false,
      image: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400",
    },
    {
      id: "prod-oliang", categoryId: "cat-coffee", sortOrder: 6,
      name: "โอเลี้ยงโบราณ", description: "กาแฟโบราณแท้ สูตรดั้งเดิม หอมกลมกล่อม",
      price: 55, isFeatured: false,
      image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400",
    },

    // ── ชา ──────────────────────────────────────────────────────────────
    {
      id: "prod-thai-tea", categoryId: "cat-tea", sortOrder: 1,
      name: "ชาไทย", description: "ชาไทยแท้ หวานมัน กลิ่นหอมเฉพาะตัว",
      price: 60, isFeatured: true,
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    },
    {
      id: "prod-matcha-latte", categoryId: "cat-tea", sortOrder: 2,
      name: "มัทฉะลาเต้", description: "มัทฉะเกรดพรีเมียมจากญี่ปุ่น ผสมนมสดหวานนุ่ม",
      price: 85, isFeatured: true,
      image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400",
    },
    {
      id: "prod-oolong", categoryId: "cat-tea", sortOrder: 3,
      name: "อู่หลงนม", description: "ชาอู่หลงหอมผสมนมสด รสชาตินุ่มลึก",
      price: 70, isFeatured: false,
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400",
    },
    {
      id: "prod-lemon-tea", categoryId: "cat-tea", sortOrder: 4,
      name: "ชามะนาว", description: "ชาเย็นมะนาวสดใส รสชาติเปรี้ยวหวานกลมกล่อม",
      price: 55, isFeatured: false,
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
    },
    {
      id: "prod-hojicha", categoryId: "cat-tea", sortOrder: 5,
      name: "โฮจิฉะลาเต้", description: "ชาโฮจิฉะคั่วหอม ผสมนมสด กลิ่นควันอ่อนๆ",
      price: 80, isFeatured: false,
      image: "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400",
    },

    // ── นมสด ────────────────────────────────────────────────────────────
    {
      id: "prod-fresh-milk", categoryId: "cat-milk", sortOrder: 1,
      name: "นมสดแท้", description: "นมสดแท้ 100% คัดสรรจากฟาร์มชั้นดี",
      price: 55, isFeatured: false,
      image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
    },
    {
      id: "prod-hokkaido", categoryId: "cat-milk", sortOrder: 2,
      name: "นมฮอกไกโด", description: "นมสดสไตล์ฮอกไกโด หอมมัน หวานกำลังดี",
      price: 75, isFeatured: true,
      image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
    },
    {
      id: "prod-strawberry-milk", categoryId: "cat-milk", sortOrder: 3,
      name: "นมสตรอว์เบอร์รี่", description: "นมสดผสมสตรอว์เบอร์รี่สด สีชมพูหวานสดใส",
      price: 65, isFeatured: false,
      image: "https://images.unsplash.com/photo-1587778082149-f3b696e91eb1?w=400",
    },
    {
      id: "prod-cocoa-milk", categoryId: "cat-milk", sortOrder: 4,
      name: "โกโก้นม", description: "โกโก้แท้ 70% ผสมนมสด รสเข้มกำลังดี",
      price: 65, isFeatured: false,
      image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400",
    },

    // ── เมนูพิเศษ ───────────────────────────────────────────────────────
    {
      id: "prod-dirty", categoryId: "cat-special", sortOrder: 1,
      name: "Dirty Coffee", description: "เอสเปรสโซ่ double shot ราดบนนมสดเย็น ดื่มด่วน",
      price: 90, isFeatured: true,
      image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
    },
    {
      id: "prod-dalgona", categoryId: "cat-special", sortOrder: 2,
      name: "ดาลโกนาคอฟฟี่", description: "วิปกาแฟฟูนุ่มบนนมเย็น สไตล์เกาหลี",
      price: 95, isFeatured: true,
      image: "https://images.unsplash.com/photo-1592334873219-42c1eff7a453?w=400",
    },
    {
      id: "prod-thai-smoothie", categoryId: "cat-special", sortOrder: 3,
      name: "ไทยที่สมูทตี้", description: "ชาไทยปั่นครีมมี่ เย็น หวาน หอม",
      price: 85, isFeatured: false,
      image: "https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?w=400",
    },
    {
      id: "prod-rose-latte", categoryId: "cat-special", sortOrder: 4,
      name: "โรสมิลค์ลาเต้", description: "กลีบกุหลาบไซรัป นมสด เอสเปรสโซ่ อ่อนหวานหอม",
      price: 85, isFeatured: false,
      image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400",
    },

    // ── เครื่องดื่มปั่น ──────────────────────────────────────────────────
    {
      id: "prod-croissant", categoryId: "cat-bakery", sortOrder: 1,
      name: "ฟราปเป้กาแฟ", description: "กาแฟปั่นเย็นนุ่มครีมมี่ วิปครีมด้านบน",
      price: 85, isFeatured: false,
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400",
    },
    {
      id: "prod-cheesecake", categoryId: "cat-bakery", sortOrder: 2,
      name: "มัทฉะปั่น", description: "มัทฉะเกรดพรีเมียมปั่นกับนมสด หอมเย็นชื่นใจ",
      price: 90, isFeatured: true,
      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",
    },
    {
      id: "prod-brownie", categoryId: "cat-bakery", sortOrder: 3,
      name: "ชาไทยปั่น", description: "ชาไทยแท้ปั่นครีมมี่ หวานมันเย็นชื่นใจ",
      price: 80, isFeatured: false,
      image: "https://images.unsplash.com/photo-1625772452859-1c03d884dcd7?w=400",
    },
    {
      id: "prod-scone", categoryId: "cat-bakery", sortOrder: 4,
      name: "สมูทตี้ผลไม้", description: "ผลไม้สดปั่นรวม วิตามินสูง สดชื่น",
      price: 75, isFeatured: false,
      image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where:  { id: p.id },
      update: { name: p.name, description: p.description, price: p.price, image: p.image, isFeatured: p.isFeatured, categoryId: p.categoryId },
      create: { ...p, isAvailable: true },
    });
  }
  console.log(`Products: ${products.length} items OK`);

  // ── Option Groups ────────────────────────────────────────────────────────
  // Shared option sets
  const SIZE_OPTS = [
    { id: "o-s",  name: "S  (12 oz)",  priceAdded: 0,  isDefault: true,  sortOrder: 1 },
    { id: "o-m",  name: "M  (16 oz)",  priceAdded: 15, isDefault: false, sortOrder: 2 },
    { id: "o-l",  name: "L  (20 oz)",  priceAdded: 25, isDefault: false, sortOrder: 3 },
  ];
  const TEMP_OPTS = [
    { id: "o-hot",    name: "ร้อน",        priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-cold",   name: "เย็น",        priceAdded: 0, isDefault: true,  sortOrder: 2 },
    { id: "o-blend",  name: "ปั่น",        priceAdded: 5, isDefault: false, sortOrder: 3 },
  ];
  const SWEET_OPTS = [
    { id: "o-sw0",    name: "ไม่หวาน",      priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-sw25",   name: "หวาน 25%",     priceAdded: 0, isDefault: false, sortOrder: 2 },
    { id: "o-sw50",   name: "หวาน 50%",     priceAdded: 0, isDefault: true,  sortOrder: 3 },
    { id: "o-sw75",   name: "หวาน 75%",     priceAdded: 0, isDefault: false, sortOrder: 4 },
    { id: "o-sw100",  name: "หวานปกติ",     priceAdded: 0, isDefault: false, sortOrder: 5 },
  ];
  const MILK_OPTS = [
    { id: "o-milk-full",   name: "นมสด",           priceAdded: 0,  isDefault: true,  sortOrder: 1 },
    { id: "o-milk-skim",   name: "นมไขมันต่ำ",    priceAdded: 0,  isDefault: false, sortOrder: 2 },
    { id: "o-milk-oat",    name: "นมโอ๊ต (+15)",   priceAdded: 15, isDefault: false, sortOrder: 3 },
    { id: "o-milk-almond", name: "นมอัลมอนด์ (+15)", priceAdded: 15, isDefault: false, sortOrder: 4 },
    { id: "o-milk-soy",    name: "นมถั่วเหลือง (+10)", priceAdded: 10, isDefault: false, sortOrder: 5 },
  ];
  const COFFEE_ADDON = [
    { id: "o-addon-shot",   name: "เพิ่ม Shot กาแฟ (+20)", priceAdded: 20, isDefault: false, sortOrder: 1 },
    { id: "o-addon-cream",  name: "วิปครีม (+15)",          priceAdded: 15, isDefault: false, sortOrder: 2 },
    { id: "o-addon-jelly",  name: "วุ้นมะพร้าว (+10)",     priceAdded: 10, isDefault: false, sortOrder: 3 },
    { id: "o-addon-pearl",  name: "ไข่มุก (+15)",           priceAdded: 15, isDefault: false, sortOrder: 4 },
    { id: "o-addon-pudding",name: "ปุดดิ้ง (+15)",          priceAdded: 15, isDefault: false, sortOrder: 5 },
  ];
  const ICE_OPTS = [
    { id: "o-ice0",   name: "ไม่ใส่น้ำแข็ง", priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-ice25",  name: "น้ำแข็งน้อย",   priceAdded: 0, isDefault: false, sortOrder: 2 },
    { id: "o-ice75",  name: "น้ำแข็งปกติ",   priceAdded: 0, isDefault: true,  sortOrder: 3 },
    { id: "o-ice100", name: "น้ำแข็งเต็ม",   priceAdded: 0, isDefault: false, sortOrder: 4 },
  ];

  type OptData = { id: string; name: string; priceAdded: number; isDefault: boolean; sortOrder: number };
  type GroupData = {
    id: string; productId: string; name: string;
    isRequired: boolean; maxChoices: number; sortOrder: number;
    options: OptData[];
  };

  // Helper: suffix option IDs with product prefix to avoid collisions
  function opts(prefix: string, base: OptData[]): OptData[] {
    return base.map(o => ({ ...o, id: `${prefix}-${o.id}` }));
  }

  // ── กาแฟ: americano, latte, cappuccino, mocha ─────────────────────
  const coffeeProducts = [
    { pid: "americano", suffix: "am" },
    { pid: "latte",     suffix: "la" },
    { pid: "cappuccino",suffix: "ca" },
    { pid: "mocha",     suffix: "mo" },
    { pid: "oliang",    suffix: "ol" },
  ];

  const coffeeGroups: GroupData[] = coffeeProducts.flatMap(({ pid, suffix }) => [
    { id: `og-${suffix}-size`,  productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(suffix, SIZE_OPTS)  },
    { id: `og-${suffix}-temp`,  productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(suffix, TEMP_OPTS)  },
    { id: `og-${suffix}-sweet`, productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(suffix, SWEET_OPTS) },
    { id: `og-${suffix}-milk`,  productId: `prod-${pid}`, name: "นม",        isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(suffix, MILK_OPTS)  },
    { id: `og-${suffix}-addon`, productId: `prod-${pid}`, name: "Add-On",    isRequired: false, maxChoices: 3, sortOrder: 5, options: opts(suffix, COFFEE_ADDON) },
  ]);

  // ── ชา: thai-tea, matcha-latte, oolong, lemon-tea, hojicha ────────
  const teaProducts = [
    { pid: "thai-tea",     suffix: "tt" },
    { pid: "matcha-latte", suffix: "ml" },
    { pid: "oolong",       suffix: "ol2" },
    { pid: "lemon-tea",    suffix: "lt" },
    { pid: "hojicha",      suffix: "hj" },
  ];

  const teaGroups: GroupData[] = teaProducts.flatMap(({ pid, suffix }) => [
    { id: `og-${suffix}-size`,  productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(suffix, SIZE_OPTS)  },
    { id: `og-${suffix}-temp`,  productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(suffix, TEMP_OPTS)  },
    { id: `og-${suffix}-sweet`, productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(suffix, SWEET_OPTS) },
    { id: `og-${suffix}-ice`,   productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(suffix, ICE_OPTS)   },
    { id: `og-${suffix}-addon`, productId: `prod-${pid}`, name: "เพิ่มเติม", isRequired: false, maxChoices: 3, sortOrder: 5, options: opts(suffix, COFFEE_ADDON.slice(1)) },
  ]);

  // ── นมสด ─────────────────────────────────────────────────────────────
  const milkProducts = [
    { pid: "fresh-milk",      suffix: "fm" },
    { pid: "hokkaido",        suffix: "hk" },
    { pid: "strawberry-milk", suffix: "sm" },
    { pid: "cocoa-milk",      suffix: "cm" },
  ];

  const milkGroups: GroupData[] = milkProducts.flatMap(({ pid, suffix }) => [
    { id: `og-${suffix}-size`,  productId: `prod-${pid}`, name: "ขนาด",    isRequired: true, maxChoices: 1, sortOrder: 1, options: opts(suffix, SIZE_OPTS.slice(0, 2)) },
    { id: `og-${suffix}-temp`,  productId: `prod-${pid}`, name: "อุณหภูมิ", isRequired: true, maxChoices: 1, sortOrder: 2, options: opts(suffix, TEMP_OPTS.slice(0, 2)) },
    { id: `og-${suffix}-sweet`, productId: `prod-${pid}`, name: "ความหวาน",isRequired: true, maxChoices: 1, sortOrder: 3, options: opts(suffix, SWEET_OPTS.slice(0, 3)) },
  ]);

  // ── เมนูพิเศษ ────────────────────────────────────────────────────────
  const specialGroups: GroupData[] = [
    { id: "og-dirty-size",  productId: "prod-dirty",  name: "ขนาด",     isRequired: true, maxChoices: 1, sortOrder: 1, options: opts("di", SIZE_OPTS) },
    { id: "og-dirty-milk",  productId: "prod-dirty",  name: "นม",        isRequired: true, maxChoices: 1, sortOrder: 2, options: opts("di", MILK_OPTS) },
    { id: "og-dal-size",    productId: "prod-dalgona",name: "ขนาด",     isRequired: true, maxChoices: 1, sortOrder: 1, options: opts("da", SIZE_OPTS) },
    { id: "og-dal-sweet",   productId: "prod-dalgona",name: "ความหวาน", isRequired: true, maxChoices: 1, sortOrder: 2, options: opts("da", SWEET_OPTS.slice(1)) },
    { id: "og-ts-size",     productId: "prod-thai-smoothie", name: "ขนาด", isRequired: true, maxChoices: 1, sortOrder: 1, options: opts("ts", SIZE_OPTS.slice(0, 2)) },
    { id: "og-rl-size",     productId: "prod-rose-latte",    name: "ขนาด", isRequired: true, maxChoices: 1, sortOrder: 1, options: opts("rl", SIZE_OPTS) },
    { id: "og-rl-milk",     productId: "prod-rose-latte",    name: "นม",   isRequired: true, maxChoices: 1, sortOrder: 2, options: opts("rl", MILK_OPTS) },
  ];

  // ── Bakery: เพิ่มตัวเลือกชิ้น ─────────────────────────────────────
  const bakeryGroups: GroupData[] = [
    {
      id: "og-bk-warm", productId: "prod-croissant", name: "อุ่นหรือเย็น", isRequired: true, maxChoices: 1, sortOrder: 1,
      options: [
        { id: "o-bk-warm",  name: "อุ่นร้อน",    priceAdded: 0, isDefault: true,  sortOrder: 1 },
        { id: "o-bk-room",  name: "อุณหภูมิห้อง", priceAdded: 0, isDefault: false, sortOrder: 2 },
      ],
    },
    {
      id: "og-scone-flavor", productId: "prod-scone", name: "รสชาติ", isRequired: true, maxChoices: 1, sortOrder: 1,
      options: [
        { id: "o-sc-blue", name: "บลูเบอร์รี่",  priceAdded: 0,  isDefault: true,  sortOrder: 1 },
        { id: "o-sc-cran", name: "แครนเบอร์รี่",  priceAdded: 0,  isDefault: false, sortOrder: 2 },
        { id: "o-sc-choc", name: "ช็อกโกแลต",    priceAdded: 5,  isDefault: false, sortOrder: 3 },
      ],
    },
  ];

  const allGroups = [...coffeeGroups, ...teaGroups, ...milkGroups, ...specialGroups, ...bakeryGroups];

  for (const group of allGroups) {
    await prisma.productOptionGroup.upsert({
      where:  { id: group.id },
      update: {},
      create: {
        id:         group.id,
        productId:  group.productId,
        name:       group.name,
        isRequired: group.isRequired,
        maxChoices: group.maxChoices,
        sortOrder:  group.sortOrder,
        options: {
          createMany: {
            data:           group.options,
            skipDuplicates: true,
          },
        },
      },
    });
  }
  console.log(`Option groups: ${allGroups.length} groups OK`);

  console.log("Seeding completed — ช่วงเวลาคาเฟ่ ready!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
