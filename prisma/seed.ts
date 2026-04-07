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

  // ── Shop Settings ────────────────────────────────────────────────────────
  const existingShop = await prisma.shopSetting.findFirst();
  if (existingShop) {
    await prisma.shopSetting.update({
      where: { id: existingShop.id },
      data: { openTime: "09:00", closeTime: "18:00", phone: "0821608509", closedDays: [] },
    });
  } else {
    await prisma.shopSetting.create({
      data: { openTime: "09:00", closeTime: "18:00", phone: "0821608509", closedDays: [], isOpen: true },
    });
  }
  console.log("ShopSetting: OK");

  // ── Loyalty ─────────────────────────────────────────────────────────────
  await prisma.loyaltySetting.upsert({
    where:  { id: "default" },
    update: {},
    create: {
      id: "default",
      earnRate:         10,
      redeemRate:       100,
      minRedeemPoints:  100,
      maxRedeemPercent: 20,
    },
  });

  // ── Delivery zones ──────────────────────────────────────────────────────
  const zones = [
    { id: "zone-1", name: "ใกล้ร้าน",  description: "ระยะ 0–3 กม.",  deliveryFee: 20,  minOrder: 80  },
    { id: "zone-2", name: "ในเมือง",    description: "ระยะ 3–7 กม.",  deliveryFee: 35,  minOrder: 150 },
    { id: "zone-3", name: "นอกเมือง",  description: "ระยะ 7–15 กม.", deliveryFee: 60,  minOrder: 250 },
  ];
  for (const z of zones) {
    await prisma.deliveryZone.upsert({ where: { id: z.id }, update: {}, create: z });
  }

  // ── Cleanup old data ────────────────────────────────────────────────────
  const newProductIds = [
    "prod-americano","prod-cappuccino","prod-latte","prod-mocha","prod-espresso","prod-nescafe","prod-trad-coffee","prod-oliang",
    "prod-milk","prod-milk-vanilla","prod-milk-caramel","prod-milk-brown","prod-milk-straw","prod-milk-taro","prod-milk-pink","prod-milk-mint","prod-milk-melon","prod-milk-oreo","prod-milk-pipo",
    "prod-cocoa","prod-milo","prod-ovaltine",
    "prod-thai-tea","prod-green-tea","prod-black-tea","prod-lemon-tea","prod-peach-tea","prod-taiwan-tea",
    "prod-soda-blue","prod-soda-straw","prod-soda-red-lemon","prod-soda-lychee","prod-soda-peach","prod-soda-watermelon","prod-soda-apple","prod-soda-mintlemon","prod-soda-red","prod-soda-rainbow",
    "prod-honey-lemon","prod-lychee-juice","prod-yogurt-straw","prod-yogurt-pipo",
    "prod-rec-cocoa-pink","prod-rec-cocoa-thai","prod-rec-cocoa-mint",
  ];
  const newCategoryIds = ["cat-coffee","cat-milk","cat-chocolate","cat-tea","cat-soda","cat-fresh","cat-recommend"];

  // Delete option groups of old products first (no FK to orders)
  await prisma.productOptionGroup.deleteMany({ where: { productId: { notIn: newProductIds } } });
  // Hard delete old products with no orders
  await prisma.product.deleteMany({ where: { id: { notIn: newProductIds }, orderItems: { none: {} } } });
  // Hide old products that still have orders (preserve history but remove from menu)
  await prisma.product.updateMany({ where: { id: { notIn: newProductIds } }, data: { isAvailable: false } });
  // Delete old categories with no remaining products
  await prisma.category.deleteMany({ where: { id: { notIn: newCategoryIds }, products: { none: {} } } });
  console.log("Cleanup: old products hidden/removed, old categories deleted");

  // ── Categories ──────────────────────────────────────────────────────────
  const categories = [
    { id: "cat-coffee",    name: "เมนูกาแฟ",       image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400",  sortOrder: 1 },
    { id: "cat-milk",      name: "เมนูนมสด",       image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",  sortOrder: 2 },
    { id: "cat-chocolate", name: "เมนูช็อกโกแลต",  image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400",  sortOrder: 3 },
    { id: "cat-tea",       name: "เมนูชา",          image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",  sortOrder: 4 },
    { id: "cat-soda",      name: "เมนูโซดา",        image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400", sortOrder: 5 },
    { id: "cat-fresh",     name: "เมนูสดชื่น",      image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400",  sortOrder: 6 },
    { id: "cat-recommend", name: "เมนูแนะนำ",       image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400", sortOrder: 7 },
  ];
  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, update: { name: c.name, image: c.image }, create: c });
  }
  console.log("Categories: OK");

  // ── Products ────────────────────────────────────────────────────────────
  const products = [

    // ── เมนูกาแฟ ────────────────────────────────────────────────────────
    { id: "prod-americano",    categoryId: "cat-coffee",    sortOrder: 1,  isFeatured: true,  name: "อเมริกาโน่",    description: "เอสเปรสโซ่ผสมน้ำร้อน กลิ่นหอม รสชาติกลมกล่อม", price: 35, image: "https://images.unsplash.com/photo-1606791422814-b32c705e3e2f?w=400" },
    { id: "prod-cappuccino",   categoryId: "cat-coffee",    sortOrder: 2,  isFeatured: false, name: "คาปูชิโน่",     description: "เอสเปรสโซ่ นมสด ฟองนมนุ่ม สัดส่วนสมบูรณ์แบบ",  price: 35, image: "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400" },
    { id: "prod-latte",        categoryId: "cat-coffee",    sortOrder: 3,  isFeatured: true,  name: "ลาเต้",         description: "เอสเปรสโซ่นุ่มผสมนมสด ฟองนมเนียนละเอียด",        price: 35, image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400" },
    { id: "prod-mocha",        categoryId: "cat-coffee",    sortOrder: 4,  isFeatured: false, name: "มอค่า",         description: "กาแฟผสมช็อกโกแลตเข้มข้น นมสดหวานมัน",             price: 35, image: "https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400" },
    { id: "prod-espresso",     categoryId: "cat-coffee",    sortOrder: 5,  isFeatured: false, name: "เอสเปรสโซ",    description: "กาแฟเข้มข้น ดึงช็อตคู่ กลิ่นหอมเข้มแท้",            price: 35, image: "https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400" },
    { id: "prod-nescafe",      categoryId: "cat-coffee",    sortOrder: 6,  isFeatured: false, name: "เนสกาแฟ",      description: "กาแฟสำเร็จรูปผสมนมสด หวานกลมกล่อม",                price: 30, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400" },
    { id: "prod-trad-coffee",  categoryId: "cat-coffee",    sortOrder: 7,  isFeatured: false, name: "กาแฟโบราณ",    description: "กาแฟโบราณสูตรดั้งเดิม หอมกลมกล่อม",                 price: 30, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400" },
    { id: "prod-oliang",       categoryId: "cat-coffee",    sortOrder: 8,  isFeatured: false, name: "โอเลี้ยง",     description: "กาแฟโบราณแท้ หวานมัน ดื่มกับน้ำแข็ง",               price: 30, image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400" },

    // ── เมนูนมสด ────────────────────────────────────────────────────────
    { id: "prod-milk",          categoryId: "cat-milk", sortOrder: 1,  isFeatured: false, name: "นมสด",               description: "นมสดแท้ 100% รสชาติหวานมัน",                         price: 30, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
    { id: "prod-milk-vanilla",  categoryId: "cat-milk", sortOrder: 2,  isFeatured: false, name: "นมสดวนิลา",          description: "นมสดกลิ่นวนิลาหอมหวาน",                             price: 30, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
    { id: "prod-milk-caramel",  categoryId: "cat-milk", sortOrder: 3,  isFeatured: false, name: "นมสดคาราเมล",        description: "นมสดผสมคาราเมล หอมหวานมัน",                          price: 30, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
    { id: "prod-milk-brown",    categoryId: "cat-milk", sortOrder: 4,  isFeatured: true,  name: "นมสดบราวน์ชูการ์",   description: "นมสดบราวน์ชูการ์ หวานหอม กำลังฮิต",                  price: 35, image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400" },
    { id: "prod-milk-straw",    categoryId: "cat-milk", sortOrder: 5,  isFeatured: false, name: "นมสดสตรอเบอร์รี่",   description: "นมสดผสมสตรอเบอร์รี่สด สีชมพูหวานสดใส",               price: 30, image: "https://images.unsplash.com/photo-1587778082149-f3b696e91eb1?w=400" },
    { id: "prod-milk-taro",     categoryId: "cat-milk", sortOrder: 6,  isFeatured: false, name: "นมเผือก",            description: "นมสดกลิ่นเผือก หอมหวานนุ่ม",                         price: 30, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
    { id: "prod-milk-pink",     categoryId: "cat-milk", sortOrder: 7,  isFeatured: true,  name: "นมชมพู",             description: "นมสดซาซ่าสีชมพู หวานหอม น่ารัก",                     price: 30, image: "https://images.unsplash.com/photo-1587778082149-f3b696e91eb1?w=400" },
    { id: "prod-milk-mint",     categoryId: "cat-milk", sortOrder: 8,  isFeatured: false, name: "นมมิ้นท์",           description: "นมสดกลิ่นมิ้นท์ เย็นชื่นใจ",                         price: 30, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
    { id: "prod-milk-melon",    categoryId: "cat-milk", sortOrder: 9,  isFeatured: false, name: "นมเมลอน",            description: "นมสดกลิ่นเมลอน หอมหวานสดชื่น",                       price: 30, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400" },
    { id: "prod-milk-oreo",     categoryId: "cat-milk", sortOrder: 10, isFeatured: false, name: "นมสดโอริโอ้",        description: "นมสดปั่นกับโอริโอ้ หวานมัน เข้มข้น",                  price: 35, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
    { id: "prod-milk-pipo",     categoryId: "cat-milk", sortOrder: 11, isFeatured: false, name: "นมสดปีโป้",          description: "นมสดปั่นกับวุ้นปีโป้ เคี้ยวสนุก",                    price: 35, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },

    // ── เมนูช็อกโกแลต ───────────────────────────────────────────────────
    { id: "prod-cocoa",     categoryId: "cat-chocolate", sortOrder: 1, isFeatured: true,  name: "โกโก้",    description: "โกโก้แท้เข้มข้น หอมหวาน",          price: 30, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
    { id: "prod-milo",      categoryId: "cat-chocolate", sortOrder: 2, isFeatured: false, name: "ไมโล",     description: "ไมโลเข้มข้น หวานมันพลังงานเต็มๆ",   price: 30, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
    { id: "prod-ovaltine",  categoryId: "cat-chocolate", sortOrder: 3, isFeatured: false, name: "โอวัลติน", description: "โอวัลตินครบรส หอมมัน ดื่มง่าย",      price: 30, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },

    // ── เมนูชา ──────────────────────────────────────────────────────────
    { id: "prod-thai-tea",    categoryId: "cat-tea", sortOrder: 1, isFeatured: true,  name: "ชาไทย",          description: "ชาไทยแท้ หวานมัน กลิ่นหอมเฉพาะตัว",        price: 30, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400" },
    { id: "prod-green-tea",   categoryId: "cat-tea", sortOrder: 2, isFeatured: false, name: "ชาเขียว",         description: "ชาเขียวนมสด หอมอ่อน รสชาติกลมกล่อม",         price: 30, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400" },
    { id: "prod-black-tea",   categoryId: "cat-tea", sortOrder: 3, isFeatured: false, name: "ชาดำเย็น",        description: "ชาดำเย็นชื่นใจ รสชาติอ่อนหวาน",              price: 30, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400" },
    { id: "prod-lemon-tea",   categoryId: "cat-tea", sortOrder: 4, isFeatured: false, name: "ชามะนาว",         description: "ชาเย็นมะนาวสดใส เปรี้ยวหวานกลมกล่อม",        price: 35, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
    { id: "prod-peach-tea",   categoryId: "cat-tea", sortOrder: 5, isFeatured: false, name: "ชาพีช",           description: "ชาผลไม้กลิ่นพีช หอมหวานสดชื่น",              price: 35, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
    { id: "prod-taiwan-tea",  categoryId: "cat-tea", sortOrder: 6, isFeatured: false, name: "ชานมไต้หวัน",     description: "ชานมสไตล์ไต้หวัน หอมนุ่ม รสชาติเข้มข้น",       price: 30, image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400" },

    // ── เมนูโซดา ────────────────────────────────────────────────────────
    { id: "prod-soda-blue",       categoryId: "cat-soda", sortOrder: 1,  isFeatured: true,  name: "บลูฮาวาย",        description: "โซดาสีฟ้าสดใส กลิ่นผลไม้เขตร้อน",   price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-straw",      categoryId: "cat-soda", sortOrder: 2,  isFeatured: false, name: "สตรอเบอร์รี่",    description: "โซดาสตรอเบอร์รี่ หอมหวานสดชื่น",    price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-red-lemon",  categoryId: "cat-soda", sortOrder: 3,  isFeatured: false, name: "น้ำแดงมะนาวโซดา", description: "น้ำแดงผสมมะนาวโซดา เปรี้ยวซ่า",    price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-lychee",     categoryId: "cat-soda", sortOrder: 4,  isFeatured: false, name: "ลิ้นจี่",          description: "โซดาลิ้นจี่ หอมหวาน ดื่มง่าย",      price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-peach",      categoryId: "cat-soda", sortOrder: 5,  isFeatured: false, name: "พีช",              description: "โซดากลิ่นพีช หวานฟู่สดชื่น",        price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-watermelon", categoryId: "cat-soda", sortOrder: 6,  isFeatured: false, name: "แตงโม",            description: "โซดาแตงโม หวานฉ่ำ สดชื่น",          price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-apple",      categoryId: "cat-soda", sortOrder: 7,  isFeatured: false, name: "แอปเปิ้ลเขียว",   description: "โซดาแอปเปิ้ลเขียว เปรี้ยวซ่า",      price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-mintlemon",  categoryId: "cat-soda", sortOrder: 8,  isFeatured: false, name: "มิ้นท์มะนาว",     description: "โซดามิ้นท์มะนาว เย็นชื่นใจ",        price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-red",        categoryId: "cat-soda", sortOrder: 9,  isFeatured: false, name: "น้ำแดง",           description: "โซดาน้ำแดง หวานซ่า",                price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },
    { id: "prod-soda-rainbow",    categoryId: "cat-soda", sortOrder: 10, isFeatured: false, name: "เรนโบว์",          description: "โซดาสีรุ้ง หลากหลายรสชาติในแก้วเดียว", price: 30, image: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0e24e?w=400" },

    // ── เมนูสดชื่น ──────────────────────────────────────────────────────
    { id: "prod-honey-lemon",  categoryId: "cat-fresh", sortOrder: 1, isFeatured: false, name: "น้ำผึ้งมะนาว",        description: "น้ำผึ้งมะนาวสดใส หวานเปรี้ยวกำลังดี",     price: 35, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400" },
    { id: "prod-lychee-juice", categoryId: "cat-fresh", sortOrder: 2, isFeatured: false, name: "น้ำลิ้นจี่",           description: "น้ำลิ้นจี่สดปั่นเย็น หอมหวาน",             price: 35, image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400" },
    { id: "prod-yogurt-straw", categoryId: "cat-fresh", sortOrder: 3, isFeatured: false, name: "โยเกิร์ต + สตรอเบอร์รี่", description: "โยเกิร์ตปั่นสตรอเบอร์รี่สด เปรี้ยวหวาน", price: 35, image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400" },
    { id: "prod-yogurt-pipo",  categoryId: "cat-fresh", sortOrder: 4, isFeatured: false, name: "โยเกิร์ต + ปีโป้",     description: "โยเกิร์ตปั่นกับวุ้นปีโป้ เคี้ยวเพลิน",     price: 35, image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=400" },

    // ── เมนูแนะนำ ───────────────────────────────────────────────────────
    { id: "prod-rec-cocoa-pink",    categoryId: "cat-recommend", sortOrder: 1, isFeatured: true,  name: "โกโก้ + นมชมพู",  description: "โกโก้เข้มผสมนมชมพูหวาน ลงตัวมาก",   price: 35, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
    { id: "prod-rec-cocoa-thai",    categoryId: "cat-recommend", sortOrder: 2, isFeatured: true,  name: "โกโก้ + ชาไทย",  description: "โกโก้ผสมชาไทย รสชาติเข้มข้นเป็นเอกลักษณ์", price: 35, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
    { id: "prod-rec-cocoa-mint",    categoryId: "cat-recommend", sortOrder: 3, isFeatured: true,  name: "โกโก้ + นมมิ้นท์", description: "โกโก้เข้มผสมนมมิ้นท์ เย็นชื่นใจ",     price: 35, image: "https://images.unsplash.com/photo-1542444459-4a46f07b3e0a?w=400" },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where:  { id: p.id },
      update: { name: p.name, description: p.description, price: p.price, image: p.image, isFeatured: p.isFeatured, categoryId: p.categoryId },
      create: { ...p, isAvailable: true },
    });
  }
  console.log(`Products: ${products.length} items OK`);

  // ── Option definitions ───────────────────────────────────────────────────
  type OptData = { id: string; name: string; priceAdded: number; isDefault: boolean; sortOrder: number };
  type GroupData = { id: string; productId: string; name: string; isRequired: boolean; maxChoices: number; sortOrder: number; options: OptData[] };

  function opts(prefix: string, base: OptData[]): OptData[] {
    return base.map(o => ({ ...o, id: `${prefix}-${o.id}` }));
  }

  // Sizes
  const SIZE_OPTS: OptData[] = [
    { id: "o-s", name: "S  (12 oz)", priceAdded: 0,  isDefault: true,  sortOrder: 1 },
    { id: "o-m", name: "M  (16 oz)", priceAdded: 15, isDefault: false, sortOrder: 2 },
    { id: "o-l", name: "L  (20 oz)", priceAdded: 25, isDefault: false, sortOrder: 3 },
  ];

  // Temperature options
  const COFFEE_TEMP: OptData[] = [
    { id: "o-hot",  name: "ร้อน", priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-cold", name: "เย็น", priceAdded: 0, isDefault: true,  sortOrder: 2 },
  ];
  const ICED_BLEND: OptData[] = [
    { id: "o-iced",  name: "เย็น", priceAdded: 0, isDefault: true,  sortOrder: 1 },
    { id: "o-blend", name: "ปั่น", priceAdded: 5, isDefault: false, sortOrder: 2 },
  ];

  // Sweetness
  const SWEET_OPTS: OptData[] = [
    { id: "o-sw0",   name: "ไม่หวาน",  priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-sw25",  name: "หวาน 25%", priceAdded: 0, isDefault: false, sortOrder: 2 },
    { id: "o-sw50",  name: "หวาน 50%", priceAdded: 0, isDefault: true,  sortOrder: 3 },
    { id: "o-sw75",  name: "หวาน 75%", priceAdded: 0, isDefault: false, sortOrder: 4 },
    { id: "o-sw100", name: "หวานปกติ", priceAdded: 0, isDefault: false, sortOrder: 5 },
  ];

  // Ice level
  const ICE_OPTS: OptData[] = [
    { id: "o-ice0",   name: "ไม่ใส่น้ำแข็ง", priceAdded: 0, isDefault: false, sortOrder: 1 },
    { id: "o-ice25",  name: "น้ำแข็งน้อย",   priceAdded: 0, isDefault: false, sortOrder: 2 },
    { id: "o-ice75",  name: "น้ำแข็งปกติ",   priceAdded: 0, isDefault: true,  sortOrder: 3 },
    { id: "o-ice100", name: "น้ำแข็งเต็ม",   priceAdded: 0, isDefault: false, sortOrder: 4 },
  ];

  // Milk type (for coffee)
  const MILK_OPTS: OptData[] = [
    { id: "o-milk-full",   name: "นมสด",                  priceAdded: 0,  isDefault: true,  sortOrder: 1 },
    { id: "o-milk-skim",   name: "นมไขมันต่ำ",             priceAdded: 0,  isDefault: false, sortOrder: 2 },
    { id: "o-milk-oat",    name: "นมโอ๊ต (+15)",           priceAdded: 15, isDefault: false, sortOrder: 3 },
    { id: "o-milk-almond", name: "นมอัลมอนด์ (+15)",       priceAdded: 15, isDefault: false, sortOrder: 4 },
    { id: "o-milk-soy",    name: "นมถั่วเหลือง (+10)",     priceAdded: 10, isDefault: false, sortOrder: 5 },
  ];

  // Toppings (shared)
  const TOPPING_OPTS: OptData[] = [
    { id: "o-top-bubble", name: "บุกมุก (+5)",        priceAdded: 5,  isDefault: false, sortOrder: 1 },
    { id: "o-top-whip",   name: "วิปปิ้งครีม (+10)",  priceAdded: 10, isDefault: false, sortOrder: 2 },
  ];

  // ── กาแฟ: hot + iced + size + sweet + milk + topping ──────────────
  const coffeeItems = [
    { pid: "americano",   sx: "am" },
    { pid: "cappuccino",  sx: "ca" },
    { pid: "latte",       sx: "la" },
    { pid: "mocha",       sx: "mo" },
    { pid: "espresso",    sx: "es" },
    { pid: "nescafe",     sx: "ne" },
    { pid: "trad-coffee", sx: "tc" },
    { pid: "oliang",      sx: "ol" },
  ];

  const coffeeGroups: GroupData[] = coffeeItems.flatMap(({ pid, sx }) => [
    { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
    { id: `og-${sx}-temp`,    productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, COFFEE_TEMP) },
    { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(sx, SWEET_OPTS) },
    { id: `og-${sx}-milk`,    productId: `prod-${pid}`, name: "ประเภทนม", isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(sx, MILK_OPTS) },
    { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 5, options: opts(sx, TOPPING_OPTS) },
  ]);

  // ── นมสด: iced+blended (ส่วนใหญ่) ──────────────────────────────────
  const milkIcedBlend = [
    { pid: "milk",         sx: "mk"  },
    { pid: "milk-vanilla", sx: "mkv" },
    { pid: "milk-caramel", sx: "mkc" },
    { pid: "milk-brown",   sx: "mkb" },
    { pid: "milk-straw",   sx: "mks" },
    { pid: "milk-taro",    sx: "mkt" },
    { pid: "milk-pink",    sx: "mkp" },
    { pid: "milk-mint",    sx: "mkm" },
    { pid: "milk-melon",   sx: "mkme" },
  ];

  const milkGroups: GroupData[] = [
    ...milkIcedBlend.flatMap(({ pid, sx }) => [
      { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
      { id: `og-${sx}-temp`,    productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, ICED_BLEND) },
      { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(sx, SWEET_OPTS) },
      { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(sx, ICE_OPTS) },
      { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 5, options: opts(sx, TOPPING_OPTS) },
    ]),
    // blended only
    ...["milk-oreo", "milk-pipo"].map((pid, i) => {
      const sx = ["mko", "mkpp"][i];
      return [
        { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS.slice(0, 2)) },
        { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, SWEET_OPTS) },
        { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 3, options: opts(sx, TOPPING_OPTS) },
      ] as GroupData[];
    }).flat(),
  ];

  // ── ช็อกโกแลต: iced+blended ────────────────────────────────────────
  const chocoItems = [
    { pid: "cocoa",    sx: "co" },
    { pid: "milo",     sx: "mi" },
    { pid: "ovaltine", sx: "ov" },
  ];

  const chocoGroups: GroupData[] = chocoItems.flatMap(({ pid, sx }) => [
    { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
    { id: `og-${sx}-temp`,    productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, ICED_BLEND) },
    { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(sx, SWEET_OPTS) },
    { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(sx, ICE_OPTS) },
    { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 5, options: opts(sx, TOPPING_OPTS) },
  ]);

  // ── ชา ──────────────────────────────────────────────────────────────
  // thai-tea, green-tea: iced+blended
  const teaBlendItems = [
    { pid: "thai-tea",   sx: "tt" },
    { pid: "green-tea",  sx: "gt" },
    { pid: "taiwan-tea", sx: "tw" },
  ];
  // black-tea, lemon-tea, peach-tea: iced only
  const teaIcedItems = [
    { pid: "black-tea", sx: "bt" },
    { pid: "lemon-tea", sx: "lt" },
    { pid: "peach-tea", sx: "pt" },
  ];

  const teaGroups: GroupData[] = [
    ...teaBlendItems.flatMap(({ pid, sx }) => [
      { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
      { id: `og-${sx}-temp`,    productId: `prod-${pid}`, name: "อุณหภูมิ",  isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, ICED_BLEND) },
      { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 3, options: opts(sx, SWEET_OPTS) },
      { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 4, options: opts(sx, ICE_OPTS) },
      { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 5, options: opts(sx, TOPPING_OPTS) },
    ]),
    ...teaIcedItems.flatMap(({ pid, sx }) => [
      { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
      { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, SWEET_OPTS) },
      { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 3, options: opts(sx, ICE_OPTS) },
      { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 4, options: opts(sx, TOPPING_OPTS) },
    ]),
  ];

  // ── โซดา: ice + size + topping (ไม่มี temp, แค่เย็น) ────────────────
  const sodaItems = [
    { pid: "soda-blue",      sx: "sb"  },
    { pid: "soda-straw",     sx: "ss"  },
    { pid: "soda-red-lemon", sx: "srl" },
    { pid: "soda-lychee",    sx: "sl"  },
    { pid: "soda-peach",     sx: "sp"  },
    { pid: "soda-watermelon",sx: "sw"  },
    { pid: "soda-apple",     sx: "sa"  },
    { pid: "soda-mintlemon", sx: "sml" },
    { pid: "soda-red",       sx: "sr"  },
    { pid: "soda-rainbow",   sx: "srb" },
  ];

  const sodaGroups: GroupData[] = sodaItems.flatMap(({ pid, sx }) => [
    { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",    isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS.slice(0, 2)) },
    { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง", isRequired: false, maxChoices: 1, sortOrder: 2, options: opts(sx, ICE_OPTS) },
    { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง", isRequired: false, maxChoices: 2, sortOrder: 3, options: opts(sx, TOPPING_OPTS) },
  ]);

  // ── สดชื่น ───────────────────────────────────────────────────────────
  // honey-lemon: iced; lychee-juice, yogurt-straw, yogurt-pipo: blended
  const freshGroups: GroupData[] = [
    { id: "og-hl-size",    productId: "prod-honey-lemon",  name: "ขนาด",    isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts("hl", SIZE_OPTS.slice(0, 2)) },
    { id: "og-hl-sweet",   productId: "prod-honey-lemon",  name: "ความหวาน",isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts("hl", SWEET_OPTS) },
    { id: "og-hl-ice",     productId: "prod-honey-lemon",  name: "น้ำแข็ง", isRequired: false, maxChoices: 1, sortOrder: 3, options: opts("hl", ICE_OPTS) },
    ...["lychee-juice", "yogurt-straw", "yogurt-pipo"].flatMap((pid, i) => {
      const sx = ["lj", "ys", "yp"][i];
      return [
        { id: `og-${sx}-size`,  productId: `prod-${pid}`, name: "ขนาด",    isRequired: true, maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS.slice(0, 2)) },
        { id: `og-${sx}-sweet`, productId: `prod-${pid}`, name: "ความหวาน",isRequired: true, maxChoices: 1, sortOrder: 2, options: opts(sx, SWEET_OPTS) },
      ] as GroupData[];
    }),
  ];

  // ── เมนูแนะนำ ────────────────────────────────────────────────────────
  const recommendItems = [
    { pid: "rec-cocoa-pink", sx: "rcp" },
    { pid: "rec-cocoa-thai", sx: "rct" },
    { pid: "rec-cocoa-mint", sx: "rcm" },
  ];

  const recommendGroups: GroupData[] = recommendItems.flatMap(({ pid, sx }) => [
    { id: `og-${sx}-size`,    productId: `prod-${pid}`, name: "ขนาด",     isRequired: true,  maxChoices: 1, sortOrder: 1, options: opts(sx, SIZE_OPTS) },
    { id: `og-${sx}-sweet`,   productId: `prod-${pid}`, name: "ความหวาน", isRequired: true,  maxChoices: 1, sortOrder: 2, options: opts(sx, SWEET_OPTS) },
    { id: `og-${sx}-ice`,     productId: `prod-${pid}`, name: "น้ำแข็ง",  isRequired: false, maxChoices: 1, sortOrder: 3, options: opts(sx, ICE_OPTS) },
    { id: `og-${sx}-topping`, productId: `prod-${pid}`, name: "ท็อปปิ้ง",  isRequired: false, maxChoices: 2, sortOrder: 4, options: opts(sx, TOPPING_OPTS) },
  ]);

  const allGroups: GroupData[] = [
    ...coffeeGroups,
    ...milkGroups,
    ...chocoGroups,
    ...teaGroups,
    ...sodaGroups,
    ...freshGroups,
    ...recommendGroups,
  ];

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
