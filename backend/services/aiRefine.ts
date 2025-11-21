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

  // ✅ Context map per questionId for clearer AI instruction
  const questionContext: Record<string, string> = {
    educationLevel:
      'education level (e.g. Primary School, Secondary School, Bachelor Degree)',
    hasAchievements: 'achievements (if user said "No", output only "No")',
    hasWorkExperience:
      'whether the user has work experience, output only "Yes" or "No"',
    workExperience: 'work experience (e.g. "Uber Driver, 2022–2025")',
    references:
      'references (list name and contact number only, e.g. "John Tan, 0184738661")',
  };

  for (const ans of answers) {
    const context =
      questionContext[ans.questionId] || 'general resume information';

    try {
      const response = await cohere.chat({
        model: 'command-a-03-2025',
        messages: [
          {
            role: 'user',
            content: `You are refining a resume answer.

Question type: ${context}
Answer: ${ans.answer}

Convert this answer into a short, clean, resume-style sentence.
Do not add labels like "Education:" or "Experience:".
If the answer is "No", empty, or irrelevant, simply return "No".
If the question is about references, keep only the person's name and phone number.
If the question is about work experience, format it like "Uber Driver, 2022–2025".
Output only the final text with no Markdown or extra explanation.`,
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

      // ✅ Post-cleaning to remove unwanted prefixes or bold text
      const cleanedText = text
        ?.replace(
          /^(Education( Level)?|Experience|Achievement|Reference)[:\-]?\s*/i,
          ''
        )
        ?.replace(/\*\*(.*?)\*\*/g, '$1') // remove Markdown bold
        ?.trim();

      refined.push({
        questionId: ans.questionId,
        answer: cleanedText || ans.answer,
      });

      console.log('Cohere raw result:', cleanedText);
    } catch (error) {
      console.error('Error refining answer:', error);
      refined.push({ questionId: ans.questionId, answer: ans.answer });
    }
  }

  return refined;
}
