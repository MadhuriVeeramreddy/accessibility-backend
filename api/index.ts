import dotenv from 'dotenv';
import app from '../src/app';

// Load environment variables
dotenv.config();

// Export the Express app as a serverless function for Vercel
export default app;

