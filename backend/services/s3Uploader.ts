// // import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// // const s3 = new S3Client({ region: process.env.AWS_REGION });

// // export async function uploadResumeToS3(userId: number, pdfBuffer: Buffer) {
// //   const key = `resumes/${userId}.pdf`;

// //   await s3.send(
// //     new PutObjectCommand({
// //       Bucket: process.env.AWS_BUCKET_NAME!,
// //       Key: key,
// //       Body: pdfBuffer,
// //       ContentType: 'application/pdf',
// //     })
// //   );

// //   return {
// //     key,
// //     resumeUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
// //   };
// // }
// import {
//   S3Client,
//   PutObjectCommand,
//   DeleteObjectCommand,
// } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import path from 'path';

// const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-southeast-2' });

// // Existing resume upload function
// export async function uploadResumeToS3(userId: number, pdfBuffer: Buffer) {
//   const key = `resumes/${userId}.pdf`;

//   await s3.send(
//     new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME!,
//       Key: key,
//       Body: pdfBuffer,
//       ContentType: 'application/pdf',
//     })
//   );

//   return {
//     key,
//     resumeUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
//   };
// }

// // Upload file to S3 for reports
// export async function uploadToS3(
//   file: Express.Multer.File,
//   folder: string = 'reports'
// ): Promise<string> {
//   try {
//     // Generate unique filename
//     const timestamp = Date.now();
//     const randomString = Math.random().toString(36).substring(2, 15);
//     const fileExtension = path.extname(file.originalname);
//     const fileName = `${timestamp}-${randomString}${fileExtension}`;
//     const key = `${folder}/${fileName}`;

//     // Determine content type
//     const contentType = file.mimetype || 'application/octet-stream';

//     // Upload to S3
//     const command = new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME!,
//       Key: key,
//       Body: file.buffer,
//       ContentType: contentType,
//       // Optional: Add metadata
//       Metadata: {
//         originalName: file.originalname,
//         uploadedAt: new Date().toISOString(),
//       },
//     });

//     await s3.send(command);

//     // Return the public URL
//     const fileUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
//     return fileUrl;
//   } catch (error) {
//     console.error('Error uploading file to S3:', error);
//     throw new Error('Failed to upload file to S3');
//   }
// }

// // Delete file from S3
// export async function deleteFromS3(fileUrl: string): Promise<void> {
//   try {
//     // Extract the key from the URL
//     // Expected format: https://bucket-name.s3.region.amazonaws.com/folder/filename
//     const urlParts = fileUrl.split('.amazonaws.com/');
//     if (urlParts.length < 2) {
//       throw new Error('Invalid S3 URL format');
//     }

//     const key = urlParts[1];

//     // Delete from S3
//     const command = new DeleteObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME!,
//       Key: key,
//     });

//     await s3.send(command);
//     console.log(`Successfully deleted file: ${key}`);
//   } catch (error) {
//     console.error('Error deleting file from S3:', error);
//     // Don't throw error to prevent deletion failures from blocking the main operation
//     // Just log the error
//   }
// }

// // Get signed URL for secure file access (if needed)
// export async function getSignedUrlForFile(
//   key: string,
//   expiresIn: number = 300
// ): Promise<string> {
//   try {
//     const command = new PutObjectCommand({
//       Bucket: process.env.AWS_BUCKET_NAME!,
//       Key: key,
//     });

//     return await getSignedUrl(s3, command, { expiresIn });
//   } catch (error) {
//     console.error('Error generating signed URL:', error);
//     throw new Error('Failed to generate signed URL');
//   }
// }

// // Upload multiple files (for report evidence)
// export async function uploadMultipleToS3(
//   files: Express.Multer.File[],
//   folder: string = 'reports'
// ): Promise<string[]> {
//   try {
//     const uploadPromises = files.map((file) => uploadToS3(file, folder));
//     const urls = await Promise.all(uploadPromises);
//     return urls;
//   } catch (error) {
//     console.error('Error uploading multiple files to S3:', error);
//     throw new Error('Failed to upload files to S3');
//   }
// }

// // Delete multiple files (for cleaning up report evidence)
// export async function deleteMultipleFromS3(fileUrls: string[]): Promise<void> {
//   try {
//     const deletePromises = fileUrls.map((url) => deleteFromS3(url));
//     await Promise.all(deletePromises);
//   } catch (error) {
//     console.error('Error deleting multiple files from S3:', error);
//     // Don't throw error to prevent deletion failures from blocking the main operation
//   }
// }

// // Validate file before upload
// export function validateFile(
//   file: Express.Multer.File,
//   allowedTypes: string[] = [
//     'image/jpeg',
//     'image/png',
//     'image/jpg',
//     'application/pdf',
//   ],
//   maxSizeInMB: number = 5
// ): { valid: boolean; error?: string } {
//   // Check file type
//   if (!allowedTypes.includes(file.mimetype)) {
//     return {
//       valid: false,
//       error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
//     };
//   }

//   // Check file size (convert MB to bytes)
//   const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
//   if (file.size > maxSizeInBytes) {
//     return {
//       valid: false,
//       error: `File size exceeds ${maxSizeInMB}MB limit`,
//     };
//   }

//   return { valid: true };
// }
