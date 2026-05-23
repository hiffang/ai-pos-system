const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

// Default users for first-run. CHANGE THESE PASSWORDS in any real deployment.
const defaultUsers = [
  {
    name: "Admin1",
    email: "admin@shop.lk",
    password: "admin123",
    role: "ADMIN",
  },
  {
    name: "Manager1",
    email: "manager@shop.lk",
    password: "manager123",
    role: "MANAGER",
  },
  {
    name: "Cashier1",
    email: "cashier@shop.lk",
    password: "cashier123",
    role: "CASHIER",
  },
];

const categories = [
  "Dairy & Chilled",
  "Beverages",
  "Household",
  "Dry Cereals",
  "Spices",
  "Rice & Grains",
  "Snacks",
  "Fresh Produce",
];

// Barcodes use the Sri Lankan EAN-13 country prefix (479). Fresh produce sold
// by weight typically has no manufacturer barcode and is left null.
const products = [
  {
    sku: "DAIRY-001",
    barcode: "4792024000018",
    name: "Anchor Full Cream Milk 1L",
    category: "Dairy & Chilled",
    priceLKR: "1200.00",
    stockQty: 142,
    reorderThreshold: 20,
  },
  {
    sku: "DAIRY-002",
    barcode: "4792024000025",
    name: "Kotmale Yogurt 80g",
    category: "Dairy & Chilled",
    priceLKR: "90.00",
    stockQty: 220,
    reorderThreshold: 40,
  },
  {
    sku: "BEV-001",
    barcode: "4792024000032",
    name: "Dilmah Ceylon Tea 200g",
    category: "Beverages",
    priceLKR: "840.00",
    stockQty: 8,
    reorderThreshold: 15,
  },
  {
    sku: "BEV-002",
    barcode: "4792024000049",
    name: "Coca-Cola 1.5L",
    category: "Beverages",
    priceLKR: "320.00",
    stockQty: 56,
    reorderThreshold: 20,
  },
  {
    sku: "HOUSE-001",
    barcode: "4792024000056",
    name: "Sunlight Washing Powder 1kg",
    category: "Household",
    priceLKR: "420.00",
    stockQty: 0,
    reorderThreshold: 15,
  },
  {
    sku: "HOUSE-002",
    barcode: "4792024000063",
    name: "Lysol Disinfectant 500ml",
    category: "Household",
    priceLKR: "560.00",
    stockQty: 34,
    reorderThreshold: 10,
  },
  {
    sku: "CEREAL-001",
    barcode: "4792024000070",
    name: "Munchee Super Cream Cracker",
    category: "Dry Cereals",
    priceLKR: "270.00",
    stockQty: 452,
    reorderThreshold: 50,
  },
  {
    sku: "CEREAL-002",
    barcode: "4792024000087",
    name: "Prima Flour 1kg",
    category: "Dry Cereals",
    priceLKR: "260.00",
    stockQty: 90,
    reorderThreshold: 25,
  },
  {
    sku: "SPICE-001",
    barcode: "4792024000094",
    name: "MDH Chilli Powder 200g",
    category: "Spices",
    priceLKR: "480.00",
    stockQty: 44,
    reorderThreshold: 15,
  },
  {
    sku: "SPICE-002",
    barcode: "4792024000100",
    name: "Turmeric Powder 100g",
    category: "Spices",
    priceLKR: "230.00",
    stockQty: 120,
    reorderThreshold: 20,
  },
  {
    sku: "RICE-001",
    barcode: "4792024000117",
    name: "Keells Samba Rice 5kg",
    category: "Rice & Grains",
    priceLKR: "2350.00",
    stockQty: 60,
    reorderThreshold: 10,
  },
  {
    sku: "SNACK-001",
    barcode: "4792024000124",
    name: "Munchee Chocolate Biscuit",
    category: "Snacks",
    priceLKR: "180.00",
    stockQty: 150,
    reorderThreshold: 30,
  },
  {
    sku: "PROD-001",
    barcode: null,
    name: "Banana - 1kg",
    category: "Fresh Produce",
    priceLKR: "320.00",
    stockQty: 75,
    reorderThreshold: 20,
  },
];

async function main() {
  for (const user of defaultUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role, passwordHash },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });
  }

  const categoryMap = {};

  for (const name of categories) {
    const existing = await prisma.category.findFirst({ where: { name } });
    const category =
      existing || (await prisma.category.create({ data: { name } }));
    categoryMap[name] = category.id;
  }

  for (const product of products) {
    const categoryId = categoryMap[product.category];
    if (!categoryId) {
      throw new Error(`Category not found for product: ${product.sku}`);
    }

    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        barcode: product.barcode ?? null,
        priceLKR: product.priceLKR,
        stockQty: product.stockQty,
        reorderThreshold: product.reorderThreshold,
        categoryId,
      },
      create: {
        sku: product.sku,
        barcode: product.barcode ?? null,
        name: product.name,
        priceLKR: product.priceLKR,
        stockQty: product.stockQty,
        reorderThreshold: product.reorderThreshold,
        categoryId,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
