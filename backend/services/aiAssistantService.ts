import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '');

// List of models to try in order of preference
const MODEL_HIERARCHY = [
  'models/gemini-2.0-flash-lite',
  'models/gemini-1.5-flash',
  'models/gemini-2.0-flash',
  'models/gemini-2.5-flash',
  'models/gemini-2.5-pro',
];

const prisma = new PrismaClient();

// Define available tools
export const TOOLS = {
  SEARCH_JOBS: 'search_jobs',
  GET_MY_APPLICATIONS: 'get_my_applications',
  GET_SAVED_JOBS: 'get_saved_jobs',
  GET_EMPLOYER_JOBS: 'get_employer_jobs',
  GET_JOB_APPLICATIONS: 'get_job_applications',
};

// Tool Definitions for the System Prompt
const TOOL_DEFINITIONS = `
You have access to the following tools to fetch live data. 
When you need data, reply ONLY with a JSON object describing the tool call: { "tool": "TOOL_NAME", "params": { ... } }

1. ${TOOLS.SEARCH_JOBS}: Search for jobs. Params: { keyword?: string, location?: string, jobType?: string }
2. ${TOOLS.GET_MY_APPLICATIONS}: Get applications for the current user (worker). Params: { status?: string, keyword?: string }
3. ${TOOLS.GET_SAVED_JOBS}: Get saved jobs for the current user (worker). Params: {}
4. ${TOOLS.GET_EMPLOYER_JOBS}: Get jobs posted by the current employer. Params: { status?: string }
5. ${TOOLS.GET_JOB_APPLICATIONS}: Get applicants for a specific job (employer only). Params: { jobId: number, status?: string }

If you have sufficient information or are answering a general question, reply with a JSON object: 
{ 
  "response": "Your conversational response here", 
  "actions": [ { "label": "Button Label", "route": "frontend_route_path" } ] 
}

When listing jobs found via tools, ALWAYS include a button in 'actions' for each job with the label "View [Job Title]" and route "/JobDetailsScreen/[slug]".
Example: "Here are jobs that you may want to find:" followed by actions.

Frontend Routes Mapping:
- Worker Home: /(tabs)/HomeScreen
- Worker Applications: /(tabs)/AppliedJobScreen
- Worker Saved Jobs: /(tabs)/SavedJobsScreen
- Worker Profile: /(tabs)/ProfileScreen
- Preferences: /PreferencesScreen
- Job Details: /JobDetailsScreen/[slug]
- Employer Dashboard: /(employer)/dashboard
- Employer Job Posts: /(employer)/job-posts
- Employer Create Job: /(employer-hidden)/create-job
- Employer Applicants: /(employer)/applicants
- Employer Job Details: /(employer-hidden)/job-post-details/[id]
`;

export const generateAIResponse = async (
  userId: number,
  userRole: string,
  message: string,
  toolResult?: { tool: string; result: any }
) => {
  let lastError;

  for (const modelName of MODEL_HIERARCHY) {
    try {
      console.log(`Attempting to generate response using model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });

      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [
              {
                text: `System: You are a helpful Blue Collar Job Portal assistant. Current User ID: ${userId}, Role: ${userRole}. \n${TOOL_DEFINITIONS}`,
              },
            ],
          },
        ],
      });

      let prompt = message;
      if (toolResult) {
        prompt = `System: The tool ${
          toolResult.tool
        } returned: ${JSON.stringify(
          toolResult.result
        )}. Now generate the final response for the user.`;
      }

      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();

      // Try to parse JSON
      try {
        // Clean up markdown code blocks if present
        const cleanedText = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanedText);
      } catch (e) {
        // If not JSON, return as text response
        return { response: responseText, actions: [] };
      }
    } catch (error: any) {
      console.warn(`Error with model ${modelName}:`, error.message);
      lastError = error;

      // If it's a 503 (Service Unavailable/Overloaded) or 429 (Too Many Requests), try the next model
      if (
        error.status === 503 ||
        error.status === 429 ||
        error.message?.includes('overloaded') ||
        error.message?.includes('404')
      ) {
        // Add a small delay before trying the next model to avoid hitting rate limits immediately
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // For other errors (like invalid API key), throw immediately
      throw error;
    }
  }

  // If all models failed
  console.error('All AI models failed. Last error:', lastError);
  throw lastError;
};
