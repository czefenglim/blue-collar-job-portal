import { CohereClientV2 } from 'cohere-ai';
import { AssistantMessageResponseContentItem } from 'cohere-ai/api/types/AssistantMessageResponseContentItem';

interface Answer {
  questionId: string;
  answer: string;
}

export async function refineAnswers(answers: Answer[]) {
  // Instantiate client inside function to ensure thread safety/isolation during parallel execution
  const cohere = new CohereClientV2({
    token: process.env.COHERE_API_KEY,
  });

  const questionContext: Record<string, string> = {
    educationLevel:
      'education level (e.g. Primary School, Secondary School, Bachelor Degree)',
    hasAchievements: 'achievements (if user said "No", output only "No")',
    hasWorkExperience:
      'whether the user has work experience, output only "Yes" or "No"',
    workExperience:
      'professional work experience descriptions including job title, years, and key responsibilities',
    references:
      'references (list name and contact number only, e.g. "John Tan, 0184738661")',
  };

  // Process all answers in parallel to improve speed
  const refined = await Promise.all(
    answers.map(async (ans) => {
      // Skip if the answer is "No" as per logic in generateResume.ts
      if (ans.answer.toLowerCase() === 'no') {
        return ans;
      }

      const context =
        questionContext[ans.questionId] || 'general resume information';

      let retries = 0;
      let success = false;
      const MAX_RETRIES = 5;
      let retryDelay = 2000; // Start with 2 seconds
      let refinedAnswer = ans; // Default to original

      while (retries < MAX_RETRIES && !success) {
        try {
          // Add a small random delay to jitter requests and prevent exact concurrency spikes
          if (retries === 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 500)
            );
          }

          const response = await cohere.chat({
            model: 'command-r-plus-08-2024',
            messages: [
              {
                role: 'system',
                content: `You are a professional Resume Expert. Your task is to take a user's raw, informal, or simple answers and elaborate on them to create a professional, detailed resume description.
            
            GUIDELINES:
            1. Professional Tone: Convert "Manglish" (Malay-style English) or limited-literacy input into formal, high-quality resume language.
            2. Elaborate: Do not just list the title and date. Describe the duties and environment based on the user's input.
            3. Accuracy: Do not fabricate entirely new jobs or skills, but expand on the context provided.
            4. Formatting: Do not add labels like "Experience:" or "Education:". 
            5. References: For the "references" section, keep it simple (Name and Phone only).
            6. "No" Answers: If the input is "No", empty, or irrelevant, return only the word "No".
            7. Education: If the input is an education level (e.g. "Primary", "Secondary"), describe it professionally (e.g. "Completed Primary School education"). Do NOT return "No" for valid education levels.
            
            EXAMPLE OF WORK EXPERIENCE TRANSFORMATION:
            User Input: "I work at Uber driver since 2021 until now 2025. I drive car take people everywhere in KL. Sometime send food also. Always follow GPS and safe."
            Refined Output: "Dedicated Professional Driver (2021–2025) providing reliable transportation and delivery services across Kuala Lumpur. Responsible for safe passenger transit, proficient navigation using GPS systems to ensure timely arrivals, and managing multi-tasking demands including food delivery services while maintaining high safety standards."
            
            Output only the final refined text with no extra explanation.`,
              },
              {
                role: 'user',
                content: `Question category: ${context}\nUser's raw answer: ${ans.answer}`,
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

          // Post-cleaning to ensure no AI-generated labels or bolding
          const cleanedText = text
            ?.replace(
              /^(Education( Level)?|Experience|Achievement|Reference)[:\-]?\s*/i,
              ''
            )
            ?.replace(/\*\*(.*?)\*\*/g, '$1')
            ?.trim();

          // SAFEGUARD: If AI returns "No" but the original answer was NOT "No" (especially for Education), revert to original.
          if (
            cleanedText === 'No' &&
            ans.answer.toLowerCase() !== 'no' &&
            ans.questionId === 'educationLevel'
          ) {
            console.warn(
              `AI returned 'No' for valid education level '${ans.answer}'. Reverting to original.`
            );
            refinedAnswer = ans;
          } else {
            refinedAnswer = {
              questionId: ans.questionId,
              answer: cleanedText || ans.answer,
            };
          }
          success = true;
        } catch (error: any) {
          if (error.statusCode === 429 || error.message?.includes('429')) {
            retries++;
            console.warn(
              `Cohere rate limit hit (429). Retrying in ${retryDelay}ms... (Attempt ${retries}/${MAX_RETRIES})`
            );

            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
          } else {
            console.error('Cohere refinement error:', error);
            // refinedAnswer remains original
            break; // Don't retry for other errors
          }
        }
      }

      if (!success && retries >= MAX_RETRIES) {
        console.error(
          'Max retries reached for Cohere refinement. Using original answer.'
        );
      }

      return refinedAnswer;
    })
  );

  return refined;
}
