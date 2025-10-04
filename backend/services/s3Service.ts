import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: 'ap-southeast-2' });

export async function getResumeSignedUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: 'bluecollar-resume-storage',
    Key: key,
  });

  // Generate URL valid for 5 minutes
  return await getSignedUrl(s3, command, { expiresIn: 300 });
}
