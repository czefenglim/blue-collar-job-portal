import { TranslationServiceClient } from '@google-cloud/translate';

const client = new TranslationServiceClient();

const projectId = 'omega-terrain-457507-n1';
const location = 'global';

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
