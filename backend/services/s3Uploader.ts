import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function uploadResumeToS3(userId: number, pdfBuffer: Buffer) {
  const key = `resumes/${userId}.pdf`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
    })
  );

  return {
    key,
    resumeUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}
