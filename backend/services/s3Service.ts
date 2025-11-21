import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'bluecollar-resume-storage';
const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-2';

// Use multer's File type
type MulterFile = Express.Multer.File;

export interface UploadResult {
  url: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

// ==========================================
// EXISTING RESUME FUNCTIONS
// ==========================================

export async function uploadResumeToS3(userId: number, pdfBuffer: Buffer) {
  const key = `resumes/${userId}.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    })
  );

  return {
    key,
    resumeUrl: `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`,
  };
}

export async function getResumeSignedUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // Generate URL valid for 5 minutes
  return await getSignedUrl(s3, command, { expiresIn: 300 });
}

// ==========================================
// NEW REPORT EVIDENCE FUNCTIONS
// ==========================================

/**
 * Upload a file to S3 (for report evidence)
 * @param file - Multer file object
 * @param folder - S3 folder path (default: 'reports')
 * @returns Promise<string> - Public URL of uploaded file
 */
export async function uploadToS3(
  file: MulterFile,
  folder: string = 'reports'
): Promise<string> {
  try {
    // Generate unique filename to prevent overwrites
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(file.originalname);
    const safeFileName = file.originalname
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .substring(0, 50); // Sanitize filename
    const fileName = `${timestamp}-${randomString}-${safeFileName}${fileExtension}`;
    const key = `${folder}/${fileName}`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          fileSize: file.size.toString(),
        },
      })
    );

    // Return public URL
    const fileUrl = `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    return fileUrl;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete a file from S3
 * @param fileUrl - Full S3 URL of the file to delete
 */
export async function deleteFromS3(fileUrl: string): Promise<void> {
  try {
    // Extract key from URL
    // Format: https://bucket-name.s3.region.amazonaws.com/folder/filename
    const key = extractKeyFromUrl(fileUrl);

    if (!key) {
      console.error('Invalid S3 URL format:', fileUrl);
      return; // Don't throw error, just log
    }

    // Delete from S3
    await s3.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    console.log(`Successfully deleted file: ${key}`);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    // Don't throw - we don't want deletion failures to break the main operation
  }
}

/**
 * Upload multiple files to S3
 * @param files - Array of Multer file objects
 * @param folder - S3 folder path
 * @returns Promise<string[]> - Array of public URLs
 */
export async function uploadMultipleToS3(
  files: MulterFile[],
  folder: string = 'reports'
): Promise<string[]> {
  const uploadPromises = files.map((file) => uploadToS3(file, folder));
  return Promise.all(uploadPromises);
}

/**
 * Delete multiple files from S3
 * @param fileUrls - Array of S3 URLs to delete
 */
export async function deleteMultipleFromS3(fileUrls: string[]): Promise<void> {
  const deletePromises = fileUrls.map((url) => deleteFromS3(url));
  await Promise.all(deletePromises);
}

/**
 * Get signed URL for temporary secure access to a file
 * @param key - S3 object key
 * @param expiresIn - Expiration time in seconds (default: 300 = 5 minutes)
 * @returns Promise<string> - Signed URL
 */
export async function getSignedUrlForReport(
  key: string,
  expiresIn: number = 300
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(s3, command, { expiresIn });
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Extract S3 key from full URL
 * @param url - Full S3 URL
 * @returns string | null - Extracted key or null if invalid
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    // Handle different S3 URL formats
    // Format 1: https://bucket-name.s3.region.amazonaws.com/folder/file
    // Format 2: https://s3.region.amazonaws.com/bucket-name/folder/file

    if (url.includes('.amazonaws.com/')) {
      const parts = url.split('.amazonaws.com/');
      if (parts.length >= 2) {
        return parts[1];
      }
    }

    // If it's already a key (not a full URL)
    if (!url.startsWith('http')) {
      return url;
    }

    return null;
  } catch (error) {
    console.error('Error extracting key from URL:', error);
    return null;
  }
}

// Helper function to generate presigned URLs for evidence array
export async function generatePresignedUrlsForEvidence(
  evidenceJson: string | null
): Promise<string[]> {
  if (!evidenceJson) return [];

  try {
    const evidenceUrls = JSON.parse(evidenceJson) as string[];
    const presignedUrls = await Promise.all(
      evidenceUrls.map(async (url) => {
        try {
          const key = extractKeyFromUrl(url);
          if (!key) return url; // fallback to original URL if key extraction failed
          return await getSignedUrlForReport(key);
        } catch (error) {
          console.error('Error generating presigned URL:', error);
          return url; // Return original URL as fallback
        }
      })
    );
    return presignedUrls;
  } catch (error) {
    console.error('Error parsing evidence JSON:', error);
    return [];
  }
}

/**
 * Validate file before upload
 * @param file - Multer file object
 * @param allowedTypes - Array of allowed MIME types
 * @param maxSizeInMB - Maximum file size in MB
 * @returns Object with validation result
 */
export function validateFile(
  file: MulterFile,
  allowedTypes: string[] = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf',
  ],
  maxSizeInMB: number = 5
): { valid: boolean; error?: string } {
  // Check file type
  if (!allowedTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    };
  }

  // Check file size
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      valid: false,
      error: `File size exceeds ${maxSizeInMB}MB limit`,
    };
  }

  // Check if file has content
  if (!file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files
 * @param files - Array of Multer file objects
 * @param maxFiles - Maximum number of files allowed
 * @returns Object with validation result
 */
export function validateMultipleFiles(
  files: MulterFile[],
  maxFiles: number = 5
): { valid: boolean; error?: string } {
  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Maximum ${maxFiles} files allowed`,
    };
  }

  // Validate each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}

/**
 * Get file info from S3 URL
 * @param url - S3 URL
 * @returns Object with file information
 */
export function getFileInfoFromUrl(url: string): {
  key: string | null;
  fileName: string | null;
  folder: string | null;
} {
  const key = extractKeyFromUrl(url);

  if (!key) {
    return { key: null, fileName: null, folder: null };
  }

  const parts = key.split('/');
  const fileName = parts[parts.length - 1];
  const folder = parts.slice(0, -1).join('/');

  return { key, fileName, folder };
}

/**
 * Upload a file to S3 for chat attachments
 */
export const uploadChatAttachment = async (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  conversationId: number
): Promise<UploadResult> => {
  const fileExtension = originalName.split('.').pop() || '';
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const key = `chat-attachments/${conversationId}/${uniqueFileName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalName: originalName,
    },
  });

  await s3.send(command);

  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return {
    url,
    key,
    fileName: originalName,
    fileSize: fileBuffer.length,
    mimeType,
  };
};

/**
 * Delete a file from S3
 */
export const deleteChatAttachment = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3.send(command);
};

/**
 * Get a signed URL for private file access
 */
export const getSignedDownloadUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
};

/**
 * Validate file type for chat attachments
 */
export const isAllowedFileType = (mimeType: string): boolean => {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    // Text
    'text/plain',
  ];

  return allowedTypes.includes(mimeType);
};

/**
 * Get max file size (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Check if file is an image
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};
