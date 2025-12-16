require('dotenv').config();
const { storageService } = require('./dist/services/storage.service');

async function testS3Upload() {
  console.log('🧪 Testing S3 Upload...\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log('  STORAGE_TYPE:', process.env.STORAGE_TYPE);
  console.log('  S3_BUCKET_NAME:', process.env.S3_BUCKET_NAME);
  console.log('  S3_REGION:', process.env.S3_REGION);
  console.log('  AWS_ACCESS_KEY_ID:', process.env.AWS_ACCESS_KEY_ID ? '***' + process.env.AWS_ACCESS_KEY_ID.slice(-4) : 'NOT SET');
  console.log('  AWS_SECRET_ACCESS_KEY:', process.env.AWS_SECRET_ACCESS_KEY ? '***SET***' : 'NOT SET');
  console.log('');
  
  // Create a test PDF buffer
  const testPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\ntrailer\n<<\n/Root 1 0 R\n>>\n%%EOF');
  const testScanId = 'test-scan-' + Date.now();
  
  try {
    console.log('📤 Attempting to upload test PDF to S3...');
    console.log('  Scan ID:', testScanId);
    console.log('  PDF Size:', testPdf.length, 'bytes');
    
    const result = await storageService.save(testScanId, testPdf);
    console.log('✅ PDF uploaded successfully!');
    console.log('  S3 Key:', result);
    
    // Check if it exists
    const exists = await storageService.exists(testScanId);
    console.log('  Exists in S3:', exists);
    
    // Get URL
    const url = await storageService.getUrl(testScanId);
    console.log('  URL:', url ? url.substring(0, 100) + '...' : 'null');
    
    // Clean up
    // await storageService.delete(testScanId);
    // console.log('  ✅ Test file deleted');
    
  } catch (error) {
    console.error('❌ Error uploading to S3:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    console.error('  Stack:', error.stack);
  }
}

testS3Upload();

