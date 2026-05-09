import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const adapter = new PrismaPg(new Pool({
  connectionString: process.env.DATABASE_URL,
}));

const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.$connect();
  console.log('Connection successful');
  await prisma.$disconnect();
}

main();