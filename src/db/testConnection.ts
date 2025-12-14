import dotenv from 'dotenv';
import { testConnection } from './prismaClient';

// Load environment variables
dotenv.config();

// Run connection test
testConnection();

