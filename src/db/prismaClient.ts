import { PrismaClient } from '@prisma/client';

// Create a single PrismaClient instance
const prisma = new PrismaClient();

// Test database connection
export const testConnection = async () => {
  try {
    // Connect to database (tests connection)
    await prisma.$connect();
    console.log('Prisma connected successfully');
  } catch (error) {
    console.error('Prisma connection error:', error);
  } finally {
    // Disconnect after test
    await prisma.$disconnect();
  }
};

// Export the PrismaClient instance
export default prisma;
