/**
 * StorageService — S3/R2-compatible Object Storage
 *
 * Supports Cloudflare R2, AWS S3, and MinIO (local dev).
 * Keys are prefixed with tenantId for isolation: {tenantId}/products/{uuid}.{ext}
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const endpoint = this.configService.get<string>('STORAGE_ENDPOINT');
    const accessKey = this.configService.get<string>('STORAGE_ACCESS_KEY');
    const secretKey = this.configService.get<string>('STORAGE_SECRET_KEY');
    const bucket = this.configService.get<string>('STORAGE_BUCKET');
    const publicUrl = this.configService.get<string>('STORAGE_PUBLIC_URL');

    if (!endpoint || !accessKey || !secretKey || !bucket) {
      this.logger.warn(
        'Storage is not configured (STORAGE_ENDPOINT/STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY/STORAGE_BUCKET not set). ' +
          'Upload will fall back to local disk via /uploads/ path.',
      );
      return;
    }

    this.s3Client = new S3Client({
      endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      // Force path-style for MinIO and R2 compatibility
      forcePathStyle: true,
    });

    this.bucket = bucket;
    this.publicUrl = publicUrl ?? `${endpoint}/${bucket}`;
    this.isConfigured = true;

    this.logger.log(`StorageService initialized: ${this.publicUrl}`);
  }

  /**
   * Upload a file buffer to object storage.
   * @param buffer  Raw file bytes
   * @param key     Object key (e.g. "{tenantId}/products/uuid.jpg")
   * @param mimeType e.g. "image/jpeg"
   * @returns The public URL of the stored object
   */
  async upload(buffer: Buffer, key: string, mimeType: string): Promise<string> {
    if (!this.isConfigured) {
      const uploadRoot = join(process.cwd(), 'apps', 'api', 'uploads');
      const localPath = join(uploadRoot, key);
      const dir = join(uploadRoot, key.replace(/\/[^/]+$/, ''));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(localPath, buffer);
      this.logger.warn(`Storage not configured — saved to local path: ${localPath}`);
      return `/uploads/${key}`;
    }

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        Metadata: { 'cache-control': 'public, max-age=31536000' },
      }),
    );

    return `${this.publicUrl}/${key}`;
  }

  /**
   * Delete an object from storage.
   * @param key Object key to delete
   */
  async delete(key: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Storage not configured — skipping delete for key: ${key}`);
      return;
    }

    // Strip public URL prefix if present to get raw key
    const rawKey = key.startsWith(`${this.publicUrl}/`)
      ? key.slice(this.publicUrl.length + 1)
      : key;

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: rawKey,
      }),
    );
  }

  /**
   * Generate a pre-signed URL for direct browser upload (avoids streaming through API).
   * @param key      Object key
   * @param mimeType Expected content type
   * @param expiresIn Seconds the signed URL remains valid (default 15 minutes)
   */
  async getPresignedUploadUrl(key: string, mimeType: string, expiresIn = 900): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Storage is not configured — cannot generate presigned URL');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Returns whether object storage is active (vs. local disk fallback).
   */
  isObjectStorageActive(): boolean {
    return this.isConfigured;
  }
}
