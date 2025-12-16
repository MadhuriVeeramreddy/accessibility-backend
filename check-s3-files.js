require('dotenv').config();
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  region: process.env.S3_REGION || 'ap-south-1',
});

async function listS3Files() {
  console.log('🔍 Checking S3 bucket contents...\n');
  console.log('Bucket:', process.env.S3_BUCKET_NAME);
  console.log('Region:', process.env.S3_REGION);
  console.log('');
  
  try {
    // List all objects in the bucket
    const result = await s3.listObjectsV2({
      Bucket: process.env.S3_BUCKET_NAME,
      Prefix: 'scans/',
    }).promise();
    
    console.log(`Found ${result.Contents?.length || 0} files in scans/ folder:\n`);
    
    if (result.Contents && result.Contents.length > 0) {
      result.Contents.forEach((file, index) => {
        console.log(`${index + 1}. ${file.Key}`);
        console.log(`   Size: ${(file.Size / 1024).toFixed(2)} KB`);
        console.log(`   Modified: ${file.LastModified}`);
        console.log('');
      });
    } else {
      console.log('❌ No files found in scans/ folder');
      console.log('');
      console.log('Checking root folder...');
      
      const rootResult = await s3.listObjectsV2({
        Bucket: process.env.S3_BUCKET_NAME,
      }).promise();
      
      console.log(`Found ${rootResult.Contents?.length || 0} files in root:\n`);
      if (rootResult.Contents && rootResult.Contents.length > 0) {
        rootResult.Contents.forEach((file, index) => {
          console.log(`${index + 1}. ${file.Key}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error listing S3 files:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
  }
}

listS3Files();


