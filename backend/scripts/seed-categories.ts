import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface CategorySeed {
  name: string;
  slug: string;
  children?: { name: string; slug: string }[];
}

const categories: CategorySeed[] = [
  {
    name: 'Electronics',
    slug: 'electronics',
    children: [
      { name: 'Cell Phones & Accessories', slug: 'cell-phones-accessories' },
      { name: 'Computers & Tablets', slug: 'computers-tablets' },
      { name: 'Cameras & Photography', slug: 'cameras-photography' },
      { name: 'TV & Home Theater', slug: 'tv-home-theater' },
      { name: 'Audio Equipment', slug: 'audio-equipment' },
      { name: 'Video Games & Consoles', slug: 'video-games-consoles' },
    ],
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    children: [
      { name: "Women's Clothing", slug: 'womens-clothing' },
      { name: "Men's Clothing", slug: 'mens-clothing' },
      { name: 'Shoes', slug: 'shoes' },
      { name: 'Bags & Luggage', slug: 'bags-luggage' },
      { name: 'Jewelry & Watches', slug: 'jewelry-watches' },
      { name: 'Accessories', slug: 'fashion-accessories' },
    ],
  },
  {
    name: 'Home & Garden',
    slug: 'home-garden',
    children: [
      { name: 'Furniture', slug: 'furniture' },
      { name: 'Home Decor', slug: 'home-decor' },
      { name: 'Kitchen & Dining', slug: 'kitchen-dining' },
      { name: 'Bedding & Bath', slug: 'bedding-bath' },
      { name: 'Garden & Outdoor', slug: 'garden-outdoor' },
      { name: 'Tools & Hardware', slug: 'tools-hardware' },
    ],
  },
  {
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    children: [
      { name: 'Exercise & Fitness', slug: 'exercise-fitness' },
      { name: 'Cycling', slug: 'cycling' },
      { name: 'Camping & Hiking', slug: 'camping-hiking' },
      { name: 'Team Sports', slug: 'team-sports' },
      { name: 'Water Sports', slug: 'water-sports' },
      { name: 'Winter Sports', slug: 'winter-sports' },
    ],
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    children: [
      { name: 'Books & Magazines', slug: 'books-magazines' },
      { name: 'Music', slug: 'music' },
      { name: 'Movies & TV', slug: 'movies-tv' },
      { name: 'Musical Instruments', slug: 'musical-instruments' },
      { name: 'Games & Puzzles', slug: 'games-puzzles' },
      { name: 'Collectibles', slug: 'collectibles' },
    ],
  },
  {
    name: 'Motors',
    slug: 'motors',
    children: [
      { name: 'Car Parts & Accessories', slug: 'car-parts-accessories' },
      { name: 'Motorcycle Parts', slug: 'motorcycle-parts' },
      { name: 'Tools & Equipment', slug: 'auto-tools-equipment' },
      { name: 'Tires & Wheels', slug: 'tires-wheels' },
    ],
  },
  {
    name: 'Health & Beauty',
    slug: 'health-beauty',
    children: [
      { name: 'Skincare', slug: 'skincare' },
      { name: 'Makeup', slug: 'makeup' },
      { name: 'Hair Care', slug: 'hair-care' },
      { name: 'Health Care', slug: 'health-care' },
      { name: 'Fragrances', slug: 'fragrances' },
    ],
  },
  {
    name: 'Toys & Hobbies',
    slug: 'toys-hobbies',
    children: [
      { name: 'Action Figures & Dolls', slug: 'action-figures-dolls' },
      { name: 'Building Sets', slug: 'building-sets' },
      { name: 'Board Games', slug: 'board-games' },
      { name: 'RC & Model Building', slug: 'rc-model-building' },
      { name: 'Outdoor Toys', slug: 'outdoor-toys' },
    ],
  },
  {
    name: 'Business & Industrial',
    slug: 'business-industrial',
    children: [
      { name: 'Office Equipment', slug: 'office-equipment' },
      { name: 'Security & Surveillance', slug: 'security-surveillance' },
      { name: 'Restaurant & Food Service', slug: 'restaurant-food-service' },
      { name: 'Manufacturing', slug: 'manufacturing' },
    ],
  },
  {
    name: 'Other',
    slug: 'other',
  },
];

async function main() {
  console.log('Checking for existing categories...');

  const existingCount = await prisma.category.count();
  if (existingCount > 0) {
    console.log(`Categories already exist (${existingCount} found). Skipping seed.`);
    return;
  }

  console.log('Seeding categories...');

  for (const cat of categories) {
    const parent = await prisma.category.create({
      data: {
        name: cat.name,
        slug: cat.slug,
      },
    });

    if (cat.children) {
      for (const child of cat.children) {
        await prisma.category.create({
          data: {
            name: child.name,
            slug: child.slug,
            parentCategoryId: parent.id,
          },
        });
      }
      console.log(`  Created "${cat.name}" with ${cat.children.length} subcategories`);
    } else {
      console.log(`  Created "${cat.name}"`);
    }
  }

  const total = await prisma.category.count();
  console.log(`\nDone! Seeded ${total} categories total.`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });