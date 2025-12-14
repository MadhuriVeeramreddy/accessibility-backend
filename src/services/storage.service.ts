/**
 * Storage Service - Handles PDF storage for development and production
 * 
 * Supports:
 * - Local filesystem (development) - /tmp folder
 * - AWS S3 (production)
 * - Google Cloud Storage (production)
 * - Azure Blob Storage (production)
 */

import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface StorageService {
  save(scanId: string, pdfBuffer: Buffer): Promise<string>;
  get(scanId: string): Promise<Buffer | null>;
  getUrl(scanId: string): Promise<string | null>;
  delete(scanId: string): Promise<void>;
  exists(scanId: string): Promise<boolean>;
}

/**
 * Local Filesystem Storage (Development)
 * Stores PDFs in /tmp folder
 */
class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string = '/tmp') {
    this.basePath = basePath;
  }

  private getFilePath(scanId: string): string {
    return join(this.basePath, `scan-${scanId}.pdf`);
  }

  async save(scanId: string, pdfBuffer: Buffer): Promise<string> {
    const filePath = this.getFilePath(scanId);
    writeFileSync(filePath, pdfBuffer);
    return filePath;
  }

  async get(scanId: string): Promise<Buffer | null> {
    const filePath = this.getFilePath(scanId);
    if (!existsSync(filePath)) {
      return null;
    }
    return readFileSync(filePath);
  }

  async getUrl(scanId: string): Promise<string | null> {
    const filePath = this.getFilePath(scanId);
    if (!existsSync(filePath)) {
      return null;
    }
    // For local storage, return a download endpoint URL
    return `/scan/${scanId}/pdf`;
  }

  async delete(scanId: string): Promise<void> {
    const filePath = this.getFilePath(scanId);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async exists(scanId: string): Promise<boolean> {
    return existsSync(this.getFilePath(scanId));
  }
}

/**
 * AWS S3 Storage (Production)
 * Stores PDFs in S3 bucket
 */
class S3StorageService implements StorageService {
  private bucketName: string;
  private region: string;
  private s3: any; // AWS SDK S3 client

  constructor(bucketName: string, region: string = 'us-east-1') {
    this.bucketName = bucketName;
    this.region = region;
    
    // Lazy load AWS SDK
    try {
      const AWS = require('aws-sdk');
      this.s3 = new AWS.S3({ region: this.region });
    } catch (error) {
      console.error('AWS SDK not installed. Install with: npm install aws-sdk');
      throw new Error('AWS S3 storage requires aws-sdk package');
    }
  }

  private getKey(scanId: string): string {
    return `scans/scan-${scanId}.pdf`;
  }

  async save(scanId: string, pdfBuffer: Buffer): Promise<string> {
    const key = this.getKey(scanId);
    
    await this.s3.putObject({
      Bucket: this.bucketName,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      ACL: 'private', // Or 'public-read' if you want public URLs
    }).promise();

    return key;
  }

  async get(scanId: string): Promise<Buffer | null> {
    const key = this.getKey(scanId);
    
    try {
      const result = await this.s3.getObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();

      return Buffer.from(result.Body);
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async getUrl(scanId: string): Promise<string | null> {
    const key = this.getKey(scanId);
    
    // Generate pre-signed URL (valid for 1 hour)
    try {
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.bucketName,
        Key: key,
        Expires: 3600, // 1 hour
      });
      return url;
    } catch (error: any) {
      if (error.code === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async delete(scanId: string): Promise<void> {
    const key = this.getKey(scanId);
    
    try {
      await this.s3.deleteObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
    } catch (error) {
      // Ignore if file doesn't exist
      console.warn(`Failed to delete S3 object ${key}:`, error);
    }
  }

  async exists(scanId: string): Promise<boolean> {
    const key = this.getKey(scanId);
    
    try {
      await this.s3.headObject({
        Bucket: this.bucketName,
        Key: key,
      }).promise();
      return true;
    } catch (error: any) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}

/**
 * Google Cloud Storage (Production)
 */
class GCSStorageService implements StorageService {
  private bucketName: string;
  private storage: any; // @google-cloud/storage client

  constructor(bucketName: string) {
    this.bucketName = bucketName;
    
    try {
      const { Storage } = require('@google-cloud/storage');
      this.storage = new Storage();
    } catch (error) {
      console.error('Google Cloud Storage not installed. Install with: npm install @google-cloud/storage');
      throw new Error('GCS storage requires @google-cloud/storage package');
    }
  }

  private getFileName(scanId: string): string {
    return `scans/scan-${scanId}.pdf`;
  }

  async save(scanId: string, pdfBuffer: Buffer): Promise<string> {
    const fileName = this.getFileName(scanId);
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    await file.save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    });

    return fileName;
  }

  async get(scanId: string): Promise<Buffer | null> {
    const fileName = this.getFileName(scanId);
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    try {
      const [buffer] = await file.download();
      return buffer;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async getUrl(scanId: string): Promise<string | null> {
    const fileName = this.getFileName(scanId);
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    try {
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 3600000, // 1 hour
      });
      return url;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  async delete(scanId: string): Promise<void> {
    const fileName = this.getFileName(scanId);
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    try {
      await file.delete();
    } catch (error: any) {
      if (error.code === 404) {
        return; // Already deleted
      }
      throw error;
    }
  }

  async exists(scanId: string): Promise<boolean> {
    const fileName = this.getFileName(scanId);
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    try {
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Factory function to create appropriate storage service
 */
export function createStorageService(): StorageService {
  const storageType = process.env.STORAGE_TYPE || 'local';
  const storagePath = process.env.STORAGE_PATH || '/tmp';

  switch (storageType.toLowerCase()) {
    case 's3':
      const s3Bucket = process.env.S3_BUCKET_NAME;
      const s3Region = process.env.S3_REGION || 'us-east-1';
      
      if (!s3Bucket) {
        throw new Error('S3_BUCKET_NAME environment variable is required for S3 storage');
      }
      
      return new S3StorageService(s3Bucket, s3Region);

    case 'gcs':
    case 'gcp':
      const gcsBucket = process.env.GCS_BUCKET_NAME;
      
      if (!gcsBucket) {
        throw new Error('GCS_BUCKET_NAME environment variable is required for GCS storage');
      }
      
      return new GCSStorageService(gcsBucket);

    case 'local':
    default:
      return new LocalStorageService(storagePath);
  }
}

// Export singleton instance
export const storageService = createStorageService();

