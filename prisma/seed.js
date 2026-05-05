const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

const products = [
  {
    sku: "DAIRY-001",
    name: "Anchor Full Cream Milk 1L",
    category: "Dairy & Chilled",
    priceLKR: "1200.00",
    stockQty: 142,
    reorderThreshold: 20,
  },
  {
    sku: "DAIRY-002",
    name: "Kotmale Yogurt 80g",
    category: "Dairy & Chilled",
    priceLKR: "90.00",
    stockQty: 220,
    reorderThreshold: 40,
  },
  {
    sku: "BEV-001",
    name: "Dilmah Ceylon Tea 200g",
    category: "Beverages",
    priceLKR: "840.00",
    stockQty: 8,
    reorderThreshold: 15,
  },
  {
    sku: "BEV-002",
    name: "Coca-Cola 1.5L",
    category: "Beverages",
    priceLKR: "320.00",
    stockQty: 56,
    reorderThreshold: 20,
  },
  {
    sku: "HOUSE-001",
    name: "Sunlight Washing Powder 1kg",
    category: "Household",
    priceLKR: "420.00",
    stockQty: 0,
    reorderThreshold: 15,
  },
  {
    sku: "HOUSE-002",
    name: "Lysol Disinfectant 500ml",
    category: "Household",
    priceLKR: "560.00",
    stockQty: 34,
    reorderThreshold: 10,
  },
  {
    sku: "CEREAL-001",
    name: "Munchee Super Cream Cracker",
    category: "Dry Cereals",
    priceLKR: "270.00",
    stockQty: 452,
    reorderThreshold: 50,
  },
  {
    sku: "CEREAL-002",
    name: "Prima Flour 1kg",
    category: "Dry Cereals",
    priceLKR: "260.00",
    stockQty: 90,
    reorderThreshold: 25,
  },
  {
    sku: "SPICE-001",
    name: "MDH Chilli Powder 200g",
    category: "Spices",
    priceLKR: "480.00",
    stockQty: 44,
    reorderThreshold: 15,
  },
  {
    sku: "SPICE-002",
    name: "Turmeric Powder 100g",
    category: "Spices",
    priceLKR: "230.00",
    stockQty: 120,
    reorderThreshold: 20,
  },
  {
    sku: "RICE-001",
    name: "Keells Samba Rice 5kg",
    category: "Rice & Grains",
    priceLKR: "2350.00",
    stockQty: 60,
    reorderThreshold: 10,
  },
  {
    sku: "SNACK-001",
    name: "Munchee Chocolate Biscuit",
    category: "Snacks",
    priceLKR: "180.00",
    stockQty: 150,
    reorderThreshold: 30,
  },
  {
    sku: "PROD-001",
    name: "Banana - 1kg",
    category: "Fresh Produce",
    priceLKR: "320.00",
    stockQty: 75,
    reorderThreshold: 20,
  },
];

async function main() {
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
        priceLKR: product.priceLKR,
        stockQty: product.stockQty,
        reorderThreshold: product.reorderThreshold,
        categoryId,
      },
      create: {
        sku: product.sku,
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
