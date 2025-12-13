import { TranslationServiceClient } from '@google-cloud/translate';

// Path to your service account JSON
const client = new TranslationServiceClient({
  keyFilename: './omega-terrain-457507-n1-a662ff7ad9cc.json',
});

const projectId = 'omega-terrain-457507-n1';
const location = 'global'; // use 'us-central1' or other if needed

export async function translateText(
  text: string,
  targetLang: string
): Promise<string> {
  const request = {
    parent: `projects/${projectId}/locations/${location}`,
    contents: [text],
    mimeType: 'text/plain',
    targetLanguageCode: targetLang,
  };

  const [response] = await client.translateText(request);
  return response.translations?.[0]?.translatedText || '';
}
