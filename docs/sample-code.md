# Sample Code

This section presents representative code snippets from the three key features of the system: **AI Resume Generation**, **Multilingual Interface**, and **Job Appeal & Suspension System**. The selected snippets demonstrate the implementation across different tiers of the architecture, including UI, Business Logic, Data Access, and Backend Services.

## 1. AI Resume Generation

This feature utilizes Generative AI to refine user inputs into professional descriptions and automatically generates PDF resumes in multiple languages.

### UI Tier

[OnboardingFlow.tsx](file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/OnboardingFlow.tsx#L1642-L1691) Ln1642 – Ln1691

**Purpose:**
To render the interactive resume questions form within the onboarding flow, supporting multiple input types and validation for required fields.

**Action:**
This component iterates through dynamic question definitions, renders appropriate UI controls (multiline text input and select picker), binds user responses to state via handlers, and includes layout spacing for consistent UX across screens.

```tsx
const renderResumeQuestions = () => (
  <View>
    {questions.map((question, index) => (
      <View key={question.questionId} style={styles.questionGroup}>
        <Text style={styles.questionTitle}>
          {index + 1}. {question.question}
          {question.required && <Text style={styles.requiredAsterisk}> *</Text>}
        </Text>

        {question.type === 'multiline' && (
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={resumeAnswers[question.questionId] || ''}
            onChangeText={(text) =>
              handleResumeAnswerChange(question.questionId, text)
            }
            placeholder="Your answer..."
            multiline
            numberOfLines={4}
            returnKeyType="done"
            blurOnSubmit={true}
          />
        )}

        {question.type === 'select' && (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={resumeAnswers[question.questionId] || ''}
              onValueChange={(value) =>
                handleResumeAnswerChange(question.questionId, value)
              }
              style={styles.picker}
              itemStyle={styles.pickerItem}
            >
              <Picker.Item label={t('common.selectOption')} value="" />
              {question.options?.map((option, idx) => (
                <Picker.Item key={idx} label={option} value={option} />
              ))}
            </Picker>
          </View>
        )}
      </View>
    ))}

    {/* Bottom spacer */}
    <View style={{ height: 100 }} />
  </View>
);
```

[OnboardingFlow.tsx](file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/OnboardingFlow.tsx#L445-L486) Ln445 – Ln486

**Purpose:**
To trigger resume generation during onboarding and select the correct language-specific resume key for display.

**Action:**
This function calls the backend generation endpoint, chooses a language-specific S3 key based on the user's preferred language, fetches a signed URL, and updates UI state to display the generated resume.

```tsx
const generateResume = async () => {
  try {
    const token = await AsyncStorage.getItem('jwtToken');
    if (!token) throw new Error('JWT token missing');

    const response = await fetch(`${URL}/api/onboarding/generateResume`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Backend error:', data);
      throw new Error(data.error || 'Failed to generate resume');
    }

    const storedLang = await AsyncStorage.getItem('preferredLanguage');
    const lang = storedLang || 'en';
    const keys = (data && data.keys) || {};
    const selectedKey = keys[lang as keyof typeof keys] || keys['en'];

    if (!selectedKey) {
      throw new Error('No resume key returned');
    }

    const resume = await fetchResumeUrl(selectedKey);
    setResumeUrl(resume.resumeUrl);

    return { ...data, selectedKey, resumeUrl: resume.resumeUrl };
  } catch (error) {
    console.error('❌ Error generating resume:', error);
    throw error;
  }
};
```

[resume-questions.tsx](file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/resume-questions.tsx#L99-L114) Ln99 – Ln114

**Purpose:**
To initiate the AI resume generation process from the mobile application.

**Action:**
This function retrieves the user's authentication token and sends a POST request to the backend `generateResume` endpoint. It handles the asynchronous response and error states before returning the generated data to the UI for display.

```tsx
const generateResume = async () => {
  const token = await AsyncStorage.getItem('jwtToken');
  if (!token) throw new Error('JWT token missing');
  const response = await fetch(`${URL}/api/onboarding/generateResume`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || 'Failed to generate resume');
  return data;
};
```

### Backend Code Tier

[employerController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/employerController.ts#L944-L963) Ln944 – Ln963

**Purpose:**
To handle the creation of a new job post and trigger the background translation process.

**Action:**
This controller receives the job creation request. Upon successful approval (e.g., auto-approval by AI), it asynchronously calls the `translateJobs()` worker to generate multilingual content without blocking the response.

```ts
    // Trigger translation in background
    if (approvalStatus === ApprovalStatus.APPROVED) {
      translateJobs().catch((err) =>
        console.error('Translation error for job:', err)
      );
    }

    return res.status(jobId ? 200 : 201).json({
      success: true,
      jobId: job.id,
      message:
        approvalStatus === 'APPROVED'
          ? jobId
            ? 'Job post updated and approved automatically by AI!'
            : 'Job post created and approved automatically by AI!'
          : approvalStatus === 'REJECTED_AI'
          ? 'Job post rejected by AI verification. You can appeal this decision from your job posts page.'
          : jobId
          ? 'Job post updated and is pending human review.'
          : 'Job post created and is pending human review.',
```

[jobController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobController.ts#L376-L399) Ln376 – Ln399

**Purpose:**
To retrieve job details and map the content to the requested language.

**Action:**
The controller uses the `lang` query parameter to dynamically select the appropriate language fields (e.g., `title_ms` for Malay) and overwrites the base properties (`title`, `description`) in the response object, ensuring the client receives the correct localized data.

```ts
    // Replace with translated fields
    const jobData = job as unknown as JobWithDetails;
    const currentLang = (lang as SupportedLang) || 'en';

    const jobWithTranslated = {
      ...jobData,
      // Job translations
      title: jobData[`title_${currentLang}`] || jobData.title,
      description: jobData[`description_${currentLang}`] || jobData.description,
      requirements:
        jobData[`requirements_${currentLang}`] || jobData.requirements,
      benefits: jobData[`benefits_${currentLang}`] || jobData.benefits,

      // Enum label translations
      jobTypeLabel: labelEnum('JobType', jobData.jobType, currentLang),
      workingHoursLabel: labelEnum(
        'WorkingHours',
        jobData.workingHours,
        currentLang
      ),
      experienceLevelLabel: labelEnum(
        'ExperienceLevel',
        jobData.experienceLevel,
        currentLang
      ),
```

### Business Logic Tier

[aiRefine.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/services/aiRefine.ts#L13-L47) Ln13 – Ln47

**Purpose:**
To construct a structured prompt for the Large Language Model (LLM) that instructs it to professionally refine user inputs.

**Action:**
The code defines context-specific prompts for different resume sections (e.g., work experience, achievements). It iterates through user answers and sends a request to the Cohere API, instructing the model to convert informal "Manglish" or simple text into professional resume language.

```ts
export async function refineAnswers(answers: Answer[]) {
  const refined: Answer[] = [];

  const questionContext: Record<string, string> = {
    educationLevel:
      'education level (e.g. Primary School, Secondary School, Bachelor Degree)',
    // ... other context mappings
  };

  for (const ans of answers) {
    // ... logic to skip 'No' answers

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
            1. Professional Tone: Convert "Manglish" (Malay-style English) or limited-literacy input into formal, high-quality resume language.`,
// ... rest of the logic
```

### Backend Code Tier

[onboardingController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/onboardingController.ts#L815-L838) Ln815 – Ln838

**Purpose:**
To orchestrate the storage of generated resume files and return their references to the client.

**Action:**
After PDF generation, this controller updates the user's profile in the database with the S3 object keys for resumes in four languages (English, Malay, Chinese, Tamil). It then returns these keys to the frontend, allowing the user to immediately view their generated documents.

```ts
          resumeUrl_en: up_en.key,
          resumeUrl_ms: up_ms.key,
          resumeUrl_zh: up_zh.key,
          resumeUrl_ta: up_ta.key,
          // Clear uploaded resume reference when regenerating AI resumes
          resumeUrl_uploaded: null,
          resumeSource: 'AI_GENERATED',
          resumeGeneratedAt: new Date(),
          resumeVersion: (profile.resumeVersion ?? 0) + 1,
        },
      });

      // 11. Return keys for client
      res.json({
        message: 'Resume generated in all languages',
        keys: {
          en: up_en.key,
          ms: up_ms.key,
          zh: up_zh.key,
          ta: up_ta.key,
        },
      });
```

### Model Tier

[schema.prisma](file:///c:/Users/czefe/blue-collar-job-portal/backend/prisma/schema.prisma#L85-L103) Ln85 – Ln103

**Purpose:**
To define the database schema for storing references to multiple versions of a user's resume.

**Action:**
The `UserProfile` model includes specific fields for storing the S3 keys of resumes generated in different languages (`resumeUrl_en`, `resumeUrl_ms`, etc.), supporting the system's multilingual capability.

```prisma
model UserProfile {
  id                 Int            @id @default(autoincrement())
  userId             Int            @unique
  // ... personal details

  // AI-GENERATED RESUMES (4 language versions)
  resumeUrl_en       String?        @db.Text
  resumeUrl_ms       String?        @db.Text
  resumeUrl_zh       String?        @db.Text
  resumeUrl_ta       String?        @db.Text

  // USER-UPLOADED RESUME (original language only)
  resumeUrl_uploaded String?        @db.Text
  // ... metadata
}
```

---

## 2. Multilingual Interface (Static & Dynamic)

This feature ensures the platform is accessible to diverse demographic groups by supporting English, Malay, Chinese, and Tamil for both static UI elements and dynamic user content.

### Library / API Usage

[googleTranslation.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/services/googleTranslation.ts#L8-L21) Ln8 – Ln21

**Purpose:**
To provide a wrapper service for the Google Cloud Translation API.

**Action:**
This utility function takes an input string and a target language code. It constructs a request object and invokes the Google Translation client to translate dynamic content (such as job descriptions or chat messages) in real-time.

```ts
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
```

### Static UI Translations (JSON)

[en.json](file:///c:/Users/czefe/blue-collar-job-portal/frontend/locales/en.json#L1-L20) Ln1 – Ln20

**Purpose:**
To provide localized string resources for static UI across multiple screens.

**Action:**
Defines hierarchical keys and messages (with variable interpolation) used by the i18n layer to render UI text based on the user’s selected language. Similar files exist for Malay (ms), Chinese (zh), and Tamil (ta).

```json
{
  "report": {
    "title": "Report Job",
    "reportingJob": "Reporting Job",
    "selectType": "Report Type",
    "selectTypeDescription": "Choose the reason for reporting this job",
    "description": "Description",
    "descriptionHint": "Please provide detailed information about your concern (minimum 10 characters)",
    "descriptionPlaceholder": "Describe the issue you found with this job posting..."
  }
}
```

[tabs/\_layout.tsx](<file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/(tabs)/_layout.tsx#L89-L114>) Ln89 – Ln114

**Purpose:**
To demonstrate how static translation keys from JSON are consumed in UI components via the `useLanguage` hook.

**Action:**
Uses `t('tabsLayout.*')` to provide localized tab labels. The keys are resolved by the i18n layer using the selected language and translation JSON files.

```tsx
<Tabs.Screen
  name="HomeScreen"
  options={{
    title: t('tabsLayout.home'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home" size={size} color={color} />
    ),
  }}
/>
<Tabs.Screen
  name="SavedJobsScreen"
  options={{
    title: t('tabsLayout.favorite'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="bookmark" size={size} color={color} />
    ),
  }}
/>
<Tabs.Screen
  name="AppliedJobScreen"
  options={{
    title: t('tabsLayout.applied'),
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="briefcase" size={size} color={color} />
    ),
  }}
/>
```

### Business Logic Tier

[translationWorker.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/workers/translationWorker.ts#L54-L96) Ln54 – Ln96

**Purpose:**
To translate job fields (title, description, requirements, benefits, reasons) into all supported languages and persist them in the database.

**Action:**
Fetches jobs missing translations, calls a generic translation pipeline for multiple fields, and writes language-specific variants (e.g., `description_ms`, `description_zh`) back to the Job model for downstream consumption.

```ts
/**
 * Translates all jobs that don't have translations
 */
export async function translateJobs() {
  const jobs = await prisma.job.findMany({
    where: {
      OR: [
        { title_ms: null },
        { title_zh: null },
        { title_ta: null },
        { title_en: null },
        { suspensionReason_ms: null },
        { suspensionReason_zh: null },
        { suspensionReason_ta: null },
        { suspensionReason_en: null },
      ],
    },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      benefits: true,
      rejectionReason: true,
      suspensionReason: true,
    },
  });

  await Promise.allSettled(
    jobs.map((job) =>
      translateFieldSet(
        'job',
        job.id,
        {
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          benefits: job.benefits,
          rejectionReason: job.rejectionReason,
          suspensionReason: job.suspensionReason || null,
        },
        ['ms', 'zh', 'ta', 'en']
      )
    )
  );
}
```

### UI Tier

[create-job.tsx](<file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/(employer-hidden)/create-job.tsx#L415-L424>) Ln415 – Ln424

**Purpose:**
To submit a new job post from the employer UI. The backend translates the job content into multiple languages and stores per-language fields in the database.

**Action:**
Builds the job payload (title, description, requirements, benefits, metadata) and sends it to `/api/jobs/create`. After creation, background translation processes populate language-specific fields for future localized rendering.

```tsx
const response = await fetch(`${URL}/api/jobs/create`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(payload),
});
```

[JobDetailsScreen/[slug].tsx](file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/JobDetailsScreen/[slug].tsx#L96-L106) Ln96 – Ln106

**Purpose:**
To fetch and render a job description in the user’s preferred language.

**Action:**
Sends a request with `?lang=${currentLanguage}`; the backend returns localized fields mapped to base properties (e.g., description, title). The UI then renders the selected language version transparently.

```tsx
const fetchJobDetails = useCallback(
  async (userToken: string) => {
    try {
      const lang = currentLanguage || 'en';
      const response = await fetch(`${URL}/api/jobs/${slug}?lang=${lang}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setJob(data.data);
      }
    } catch (error) {
      // ...
    }
  },
  [slug, currentLanguage, URL]
);
```

---

## 3. Job Moderation and Appeal System

This feature applies AI job moderation immediately after a job is created. If the AI cannot conclusively identify legitimacy, the job is flagged for admin review. Employers can later submit an appeal for AI-rejected jobs (JOB_VERIFICATION type only), and admins issue final decisions.

### AI Job Moderation

[aiJobVerification.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/services/aiJobVerification.ts#L46-L105) Ln46 – Ln105

**Purpose:**
To analyze a job post and produce a moderation decision input (risk score, flags, auto-approve signal) used by controllers to set approval status.

**Action:**
Runs multiple checks (required fields, duplicates, company track record) and a Cohere-based content analysis to compute a risk score and flags, returning a `VerificationResult` with `autoApprove`, `riskScore`, and `flagReason`.

```ts
export class AIJobVerificationService {
  static async verifyJob(jobData: JobData): Promise<VerificationResult> {
    const flags: string[] = [];
    let riskScore = 0;

    // 1. Basic field validation (quick check)
    const requiredFieldsCheck = this.checkRequiredFields(jobData);
    if (!requiredFieldsCheck.isValid) {
      flags.push(...requiredFieldsCheck.flags);
      riskScore += 15;
    }

    // 2. Check for duplicate/spam posts
    const duplicateCheck = await this.checkDuplicatePosts(jobData);
    if (duplicateCheck.isDuplicate) {
      flags.push(...duplicateCheck.flags);
      riskScore += 25;
    }

    // 3. Check company track record
    const companyCheck = await this.checkCompanyHistory(jobData.companyId);
    if (companyCheck.isNewOrSuspicious) {
      flags.push(...companyCheck.flags);
      riskScore += 15;
    }

    // 4. Use AI for content analysis
    const aiAnalysis = await this.analyzeJobContentWithAI(jobData);
    if (aiAnalysis) {
      riskScore += aiAnalysis.riskScore;
      flags.push(...aiAnalysis.specificFlags);
    } else {
      flags.push('AI analysis unavailable - flagged for manual review');
      riskScore += 20;
    }

    const isClean = riskScore < 30 && flags.length === 0;
    const autoApprove = riskScore < 20 && !aiAnalysis?.isScam;

    return {
      isClean,
      autoApprove,
      flagReason: flags.length > 0 ? flags.join('; ') : undefined,
      riskScore,
      flags,
    };
  }
}
```

[jobController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobController.ts#L996-L1024) Ln996 – Ln1024

**Purpose:**
To run AI verification right after job creation and determine the initial moderation outcome.

**Action:**
Calls the AI verification service, then sets `approvalStatus` to `APPROVED` (auto-approve), `REJECTED_AI` (high-risk), or `PENDING` (flag for admin review) based on the AI result.

```ts
const verificationResult: VerificationResult =
  await AIJobVerificationService.verifyJob({
    title,
    description,
    requirements,
    benefits,
    salaryMin,
    salaryMax,
    salaryType,
    city,
    state,
    industryId,
    companyId: company.id,
  });

let approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED_AI' = 'PENDING';
let rejectionReason: string | null = null;

if (verificationResult.autoApprove) {
  approvalStatus = 'APPROVED';
} else if (verificationResult.riskScore > 70) {
  approvalStatus = 'REJECTED_AI';
  rejectionReason = `Auto-rejected by AI verification (Risk Score: ${verificationResult.riskScore}/100):\n\n${verificationResult.flagReason}`;
} else {
  approvalStatus = 'PENDING';
}
```

[jobController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobController.ts#L1820-L1860) Ln1820 – Ln1860

**Purpose:**
To approve jobs flagged as `PENDING` during AI moderation via admin action.

**Action:**
Provides an admin endpoint to mark the job as `APPROVED`, activate it, log the action, and notify the employer and matching job seekers.

```ts
export const approveJob = async (req: AdminAuthRequest, res: Response) => {
  const job = await prisma.job.update({
    where: { id: parseInt(req.params.id) },
    data: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      isActive: true,
      rejectionReason: null,
    },
  });
};
```

[jobController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobController.ts#L1925-L1975) Ln1925 – Ln1975

**Purpose:**
To reject jobs flagged as `PENDING` during AI moderation via admin action.

**Action:**
Provides an admin endpoint to mark the job as `REJECTED_FINAL`, record a reason, deactivate the post, log the action, and notify the employer.

```ts
export const rejectJob = async (req: AdminAuthRequest, res: Response) => {
  const job = await prisma.job.update({
    where: { id: parseInt(req.params.id) },
    data: {
      approvalStatus: 'REJECTED_FINAL',
      rejectedAt: new Date(),
      rejectionReason: req.body.rejectionReason.trim(),
      isActive: false,
    },
  });
};
```

### Appeal Decision (JOB_VERIFICATION)

[schema.prisma](file:///c:/Users/czefe/blue-collar-job-portal/backend/prisma/schema.prisma#L594-L620) Ln594 – Ln620

**Purpose:**
To define the model for employer appeals on AI-rejected jobs, with multilingual fields for explanations.

**Action:**
The `JobAppeal` model stores the employer’s explanation, multilingual variants, evidence, and tracks status and decision metadata for JOB_VERIFICATION appeals.

```prisma
model JobAppeal {
  id          Int      @id @default(autoincrement())
  jobId       Int
  employerId  Int
  explanation String   @db.Text
  explanation_ms String? @db.Text
  explanation_en String? @db.Text
  explanation_zh String? @db.Text
  explanation_ta String? @db.Text
  evidence    String?  @db.Text
  status      AppealStatus @default(PENDING)
  appealType  AppealType   @default(JOB_VERIFICATION)
  reviewedBy  Int?
  reviewedAt  DateTime?
  reviewNotes String?  @db.Text
  adminDecision String?
}
```

[appeals/[id].tsx](<file:///c:/Users/czefe/blue-collar-job-portal/frontend/app/(admin-hidden)/appeals/[id].tsx#L161-L173>) Ln161 – Ln173

**Purpose:**
To submit the admin’s final decision on a JOB_VERIFICATION appeal.

**Action:**
Sends a PATCH request with decision and notes to the appeal review endpoint, ensuring authenticated and documented moderation actions.

```tsx
const response = await fetch(
  `${URL}/api/job-appeals/admin/appeals/${id}/review`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      decision: reviewAction,
      reviewNotes: reviewNotes.trim(),
    }),
  }
);
```

[jobAppealController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobAppealController.ts#L254-L265) Ln254 – Ln265

**Purpose:**
To apply the admin decision to the job record.

**Action:**
Updates the job to `APPROVED` or `REJECTED_FINAL` based on the decision and sets visibility fields accordingly.

```ts
const newJobStatus = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED_FINAL';
await prisma.job.update({
  where: { id: appeal.jobId },
  data: {
    approvalStatus: newJobStatus,
    isActive: decision === 'APPROVE',
    approvedAt: decision === 'APPROVE' ? new Date() : null,
    rejectedAt: decision === 'REJECT' ? new Date() : null,
  },
});
```

[jobAppealController.ts](file:///c:/Users/czefe/blue-collar-job-portal/backend/controllers/jobAppealController.ts#L290-L315) Ln290 – Ln315

**Purpose:**
To notify the employer of the appeal outcome in multiple languages.

**Action:**
Builds a localized notification message and stores it, linking back to the job post for context.

```ts
const notificationMessage =
  decision === 'APPROVE'
    ? `Your appeal for "${appeal.job.title}" has been approved. Your job post is now live!`
    : `Your appeal for "${
        appeal.job.title
      }" has been rejected. This decision is final.${
        reviewNotes ? ` Reason: ${reviewNotes}` : ''
      }`;
await prisma.notification.create({
  data: {
    userId: appeal.employerId,
    title: decision === 'APPROVE' ? 'Appeal Approved' : 'Appeal Rejected',
    message: notificationMessage,
    type: 'SYSTEM_UPDATE',
    actionUrl: `/(employer-hidden)/job-post-details/${appeal.jobId}`,
  },
});
```
