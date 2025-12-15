#!/usr/bin/env node
/**
 * Migration script that uses direct connection for migrations
 * Falls back to DATABASE_URL if DATABASE_URL_DIRECT is not set
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
const poolerUrl = process.env.DATABASE_URL;

console.log('🔄 Running database migrations...\n');

if (process.env.DATABASE_URL_DIRECT) {
  console.log('✅ Using direct connection for migrations');
  console.log('📋 Direct URL:', directUrl.replace(/:[^:@]+@/, ':****@'));
} else {
  console.log('⚠️  DATABASE_URL_DIRECT not set, using DATABASE_URL');
  console.log('⚠️  Note: Connection poolers may not work with migrations');
  console.log('📋 URL:', directUrl.replace(/:[^:@]+@/, ':****@'));
}

// Temporarily set DATABASE_URL to direct connection
const originalEnv = { ...process.env };
process.env.DATABASE_URL = directUrl;

try {
  console.log('\n📦 Running Prisma migrations...\n');
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
  console.log('\n✅ Migrations completed successfully!\n');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  // Restore original environment
  Object.assign(process.env, originalEnv);
}

