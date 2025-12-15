require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTables() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to database\n');
    
    // Check if tables exist by trying to query them
    const websites = await prisma.website.findMany();
    console.log(`✅ Website table exists (${websites.length} records)`);
    
    const scans = await prisma.scan.findMany();
    console.log(`✅ Scan table exists (${scans.length} records)`);
    
    const issues = await prisma.issue.findMany();
    console.log(`✅ Issue table exists (${issues.length} records)`);
    
    console.log('\n✅ All tables exist! Database is ready.');
    
    await prisma.$disconnect();
  } catch (error) {
    if (error.message.includes('does not exist')) {
      console.log('❌ Tables do not exist. Need to run migrations.');
      console.log('\n💡 Solution: Use direct connection (port 5432) for migrations:');
      console.log('   1. Get direct connection string from Supabase');
      console.log('   2. Temporarily update DATABASE_URL');
      console.log('   3. Run: npx prisma migrate deploy');
      console.log('   4. Switch back to pooler connection');
    } else {
      console.error('❌ Error:', error.message);
    }
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

checkTables();

