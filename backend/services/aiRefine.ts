// import { CohereClientV2 } from 'cohere-ai';
// import { AssistantMessageResponseContentItem } from 'cohere-ai/api/types/AssistantMessageResponseContentItem';

// interface Answer {
//   questionId: string;
//   answer: string;
// }

// // Initialize Cohere client with your API key
// const cohere = new CohereClientV2({
//   token: '9KjRTgmeA7d93zMJ5yBcZDOlXHLZFGXNaPebOf2q',
// });

// export async function refineAnswers(answers: Answer[]) {
//   const refined: Answer[] = [];

//   // ✅ Context map per questionId for clearer AI instruction
//   const questionContext: Record<string, string> = {
//     educationLevel:
//       'education level (e.g. Primary School, Secondary School, Bachelor Degree)',
//     hasAchievements: 'achievements (if user said "No", output only "No")',
//     hasWorkExperience:
//       'whether the user has work experience, output only "Yes" or "No"',
//     workExperience: 'work experience (e.g. "Uber Driver, 2022–2025")',
//     references:
//       'references (list name and contact number only, e.g. "John Tan, 0184738661")',
//   };

//   for (const ans of answers) {
//     const context =
//       questionContext[ans.questionId] || 'general resume information';

//     try {
//       const response = await cohere.chat({
//         model: 'command-a-03-2025',
//         messages: [
//           {
//             role: 'user',
//             content: `You are refining a resume answer.

// Question type: ${context}
// Answer: ${ans.answer}

// Convert this answer into a short, clean, resume-style sentence.
// Do not add labels like "Education:" or "Experience:".
// If the answer is "No", empty, or irrelevant, simply return "No".
// If the question is about references, keep only the person's name and phone number.
// If the question is about work experience, format it like "Uber Driver, 2022–2025".
// Output only the final text with no Markdown or extra explanation.`,
//           },
//         ],
//       });

//       const text = response.message?.content
//         ?.filter(
//           (
//             c
//           ): c is Extract<
//             AssistantMessageResponseContentItem,
//             { type: 'text' }
//           > => c.type === 'text'
//         )
//         .map((c) => c.text)
//         .join(' ')
//         .trim();

//       // ✅ Post-cleaning to remove unwanted prefixes or bold text
//       const cleanedText = text
//         ?.replace(
//           /^(Education( Level)?|Experience|Achievement|Reference)[:\-]?\s*/i,
//           ''
//         )
//         ?.replace(/\*\*(.*?)\*\*/g, '$1') // remove Markdown bold
//         ?.trim();

//       refined.push({
//         questionId: ans.questionId,
//         answer: cleanedText || ans.answer,
//       });

//       console.log('Cohere raw result:', cleanedText);
//     } catch (error) {
//       console.error('Error refining answer:', error);
//       refined.push({ questionId: ans.questionId, answer: ans.answer });
//     }
//   }

//   return refined;
// }

import { CohereClientV2 } from 'cohere-ai';
import { AssistantMessageResponseContentItem } from 'cohere-ai/api/types/AssistantMessageResponseContentItem';

interface Answer {
  questionId: string;
  answer: string;
}

const cohere = new CohereClientV2({
  token: '9KjRTgmeA7d93zMJ5yBcZDOlXHLZFGXNaPebOf2q', // Ensure your actual key is used here
});

export async function refineAnswers(answers: Answer[]) {
  const refined: Answer[] = [];

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

  for (const ans of answers) {
    // Skip if the answer is "No" as per logic in generateResume.ts
    if (ans.answer.toLowerCase() === 'no') {
      refined.push(ans);
      continue;
    }

    const context =
      questionContext[ans.questionId] || 'general resume information';

    try {
      const response = await cohere.chat({
        model: 'command-r-plus',
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

      refined.push({
        questionId: ans.questionId,
        answer: cleanedText || ans.answer,
      });
    } catch (error) {
      console.error('Cohere refinement error:', error);
      refined.push(ans); // Fallback to original answer on error
    }
  }

  return refined;
}
