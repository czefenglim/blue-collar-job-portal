import { CohereClientV2 } from 'cohere-ai';
import { AssistantMessageResponseContentItem } from 'cohere-ai/api/types/AssistantMessageResponseContentItem';

interface Answer {
  questionId: string;
  answer: string;
}

// Initialize Cohere client with your API key
const cohere = new CohereClientV2({
  token: '9KjRTgmeA7d93zMJ5yBcZDOlXHLZFGXNaPebOf2q',
});

export async function refineAnswers(answers: Answer[]) {
  const refined: Answer[] = [];

  for (const ans of answers) {
    try {
      const response = await cohere.chat({
        model: 'command-a-03-2025',
        messages: [
          {
            role: 'user',
            content: `Convert this answer into a short, professional, resume-style sentence. Remove all explanations, commentary, or AI phrases: ${ans.answer}`,
          },
        ],
      });

      const text = response.message?.content
        ?.filter(
          (
            c
          ): c is Extract<
            AssistantMessageResponseContentItem,
            { type: 'text' }
          > => c.type === 'text'
        )
        .map((c) => c.text)
        .join(' ')
        .trim();

      refined.push({
        questionId: ans.questionId,
        answer: text || ans.answer,
      });

      console.log('Cohere raw result:', text);
    } catch (error) {
      console.error('Error refining answer:', error);
      refined.push({ questionId: ans.questionId, answer: ans.answer });
    }
  }

  return refined;
}
