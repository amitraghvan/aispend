import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

const catalogEntries = [
  {
    toolName: 'Cursor',
    category: 'coding',
    pricingSource: 'https://www.cursor.com/pricing',
    plans: [
      { planName: 'Hobby', price: 0 },
      { planName: 'Pro', price: 20 },
      { planName: 'Business', price: 40 },
    ],
  },
  {
    toolName: 'GitHub Copilot',
    category: 'coding',
    pricingSource: 'https://github.com/features/copilot',
    plans: [
      { planName: 'Free', price: 0 },
      { planName: 'Pro', price: 10 },
      { planName: 'Business', price: 19 },
      { planName: 'Enterprise', price: 39 },
    ],
  },
  {
    toolName: 'ChatGPT',
    category: 'mixed',
    pricingSource: 'https://openai.com/chatgpt/pricing',
    plans: [
      { planName: 'Free', price: 0 },
      { planName: 'Plus', price: 20 },
      { planName: 'Pro', price: 200 },
      { planName: 'Team', price: 25 },
      { planName: 'Enterprise', price: 60 },
    ],
  },
  {
    toolName: 'Claude',
    category: 'mixed',
    pricingSource: 'https://claude.ai/pricing',
    plans: [
      { planName: 'Free', price: 0 },
      { planName: 'Pro', price: 20 },
      { planName: 'Team', price: 25 },
      { planName: 'Enterprise', price: 60 },
    ],
  },
  {
    toolName: 'Gemini',
    category: 'mixed',
    pricingSource: 'https://one.google.com/about/ai-premium',
    plans: [
      { planName: 'Free', price: 0 },
      { planName: 'Advanced', price: 20 },
      { planName: 'Business', price: 24 },
      { planName: 'Enterprise', price: 36 },
    ],
  },
];

async function main() {
  console.log('Seeding Database...');

  for (const tool of catalogEntries) {
    const catalogItem = await prisma.toolCatalog.upsert({
      where: { name: tool.toolName },
      update: {
        category: tool.category,
        description: `AI tool from vendor ${tool.toolName}`,
        websiteUrl: tool.pricingSource,
      },
      create: {
        name: tool.toolName,
        category: tool.category,
        description: `AI tool from vendor ${tool.toolName}`,
        websiteUrl: tool.pricingSource,
      },
    });

    console.log(`Upserted tool: ${tool.toolName}`);

    // Create pricing history for seats
    for (const plan of tool.plans) {
      // Check if this pricing history already exists
      const existing = await prisma.pricingHistory.findFirst({
        where: {
          toolCatalogId: catalogItem.id,
          modelName: plan.planName,
        },
      });

      if (!existing) {
        await prisma.pricingHistory.create({
          data: {
            toolCatalogId: catalogItem.id,
            modelName: plan.planName,
            unitType: 'seat',
            inputPrice: plan.price,
            outputPrice: plan.price,
            effectiveDate: new Date('2025-06-01'),
          },
        });
      }
    }

    // Seed benchmark data
    const existingBenchmark = await prisma.benchmark.findFirst({
      where: {
        toolCatalogId: catalogItem.id,
        metricName: 'spend_per_employee',
      },
    });

    if (!existingBenchmark) {
      await prisma.benchmark.create({
        data: {
          toolCatalogId: catalogItem.id,
          metricName: 'spend_per_employee',
          metricValue: 25.0,
          industry: 'technology',
        },
      });
    }
  }

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
