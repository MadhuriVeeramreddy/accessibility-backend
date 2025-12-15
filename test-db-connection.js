require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  console.log('🔍 Testing database connection...\n');
  
  // Show connection string (with password masked)
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('📋 Connection String:', maskedUrl);
  } else {
    console.log('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  console.log('\n⏳ Attempting to connect...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ SUCCESS: Database connection established!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test passed:', result);
    
    await prisma.$disconnect();
    console.log('\n✅ Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR: Database connection failed\n');
    console.error('Error Code:', error.code || 'N/A');
    console.error('Error Message:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Troubleshooting tips:');
      console.log('1. Check if Supabase database is active (not paused)');
      console.log('2. Verify connection string in Supabase dashboard');
      console.log('3. Make sure password special characters are URL-encoded');
      console.log('4. Check network/firewall settings');
      console.log('5. Try using Supabase connection pooler instead');
    }
    
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  }
}

testConnection();

