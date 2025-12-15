import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log('Server running on port 4000');
  console.log('✅ Ready to process scans');
});

// Graceful shutdown - wait for ongoing scans to complete
let isShuttingDown = false;
let activeScans = 0;

// Track active scans (increment when scan starts, decrement when completes)
export function incrementActiveScans() {
  activeScans++;
}

export function decrementActiveScans() {
  activeScans = Math.max(0, activeScans - 1);
}

// Check if server is shutting down
export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('\n🛑 Shutting down gracefully...');
  
  if (activeScans > 0) {
    console.log(`   Waiting for ${activeScans} active scan(s) to complete (max 60s)...`);
    
    // Wait up to 60 seconds for scans to complete
    const maxWait = 60000; // 60 seconds
    const checkInterval = 1000; // Check every second
    let waited = 0;
    
    while (activeScans > 0 && waited < maxWait) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
    
    if (activeScans > 0) {
      console.log(`   ⚠️  ${activeScans} scan(s) still running, forcing shutdown...`);
    } else {
      console.log('   ✅ All scans completed');
    }
  }
  
  console.log('🛑 Server shutdown complete');
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

