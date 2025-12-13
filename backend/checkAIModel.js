require('dotenv').config();
const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

async function listModels() {
  if (!apiKey) {
    console.error('API Key is missing in .env');
    return;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Available Models:');
    if (data.models) {
      data.models.forEach((m) => {
        // Filter for generateContent support
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name}`);
        }
      });
    } else {
      console.log(data);
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels();
