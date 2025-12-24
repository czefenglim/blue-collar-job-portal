# System Architecture Diagram Prompt for Gemini

Please generate a high-level system architecture diagram for a **Blue Collar Job Portal** mobile application. The diagram should visualize the following components and their interactions:

## 1. Clients (Frontend)

- **Mobile App (React Native / Expo):** The primary interface for users, featuring role-based routing.
  - **User Segments:**
    - **Job Seekers:** Searching for jobs, applying, managing profiles, building resumes (AI-assisted).
    - **Employers:** Posting jobs, managing applicants, company profiles, viewing insights.
    - **Admins:** Dashboard for content moderation, user verification, and platform analytics.

## 2. Backend (API Server)

- **Node.js & Express.js Server:** Handles business logic and API requests.
- **Middleware Layer:**
  - **Authentication:** JWT-based auth for securing endpoints.
  - **Security & Optimization:** `Helmet` (Headers), `express-rate-limit` (DDoS protection).
  - **File Upload:** Multer for handling multipart/form-data.
  - **Validation:** Input validation middleware.
- **Controllers (Grouped by Domain):**
  - **Auth & User Management:** `authController`, `userController`, `languageController`
  - **Jobs & Applications:** `jobController`, `applicationController`, `industryController`, `hireController`
  - **Employer Services:** `employerController`, `companyController`, `subscriptionController`
  - **AI & Intelligence:** `aiAssistantController`, `intelligenceController`, `onboardingController` (Resume Gen)
  - **Communication:** `chatController`, `notificationController`, `reviewController`
  - **Admin & Moderation:** `adminController`, `reportController`, `appealController`, `statisticController`
  - **Payments:** `paymentController`, `subscriptionPlanController`
- **Background Tasks:** `node-cron` for scheduled notifications and cleanup.

## 3. Services Layer (Business Logic)

- **Real-Time Layer:** **Socket.io** for instant chat and notifications.
- **AI Services:** `aiAssistantService`, `aiJobVerification`, `recruitmentPrediction`, `salaryCompetitivenessService`
- **Core Services:** `s3Service` (Storage), `emailService` (Notifications), `chatService` (Messaging)
- **Translation:** `googleTranslation` (Multi-language support)
- **PDF Generation:** `Puppeteer` service for creating resume PDFs.

## 4. Database Layer

- **MySQL Database:** The primary relational database.
- **Prisma ORM:** Database access layer.
- **Key Models:**
  - **Identity:** Users, UserProfiles, Auth (OTPs)
  - **Marketplace:** Companies, Jobs, Industries, Applications
  - **Engagement:** Reviews, Reports, Conversations, ChatMessages
  - **Resources:** Skills, ResumeQuestions, ResumeAnswers
  - **Monetization:** Subscriptions, Plans, Payments

## 5. External Services & Integrations

- **AI Models:**
  - **LLMs (Cohere / Gemini):** For job matching, resume parsing, and chat assistance.
  - **Translation APIs:** Google Translate for content localization.
- **Payments:** **Stripe API** for subscriptions and secure payments.
- **Storage:** **Amazon S3** (Resumes, Profile Pictures, Company Logos).
- **Notifications:** **Firebase Cloud Messaging (FCM)** for push notifications.

## Data Flow & Connections

1.  **Users** interact with the **Mobile App**.
2.  **Mobile App** sends secure HTTPS/REST API requests to the **Node.js Server**.
3.  **Real-Time** events (chat, alerts) are handled via **Socket.io**.
4.  **Controllers** delegate complex logic to the **Services Layer**.
5.  **Services** interact with **External APIs** (Stripe, AI, S3, Firebase) as needed.
6.  **Prisma ORM** manages data persistence in **MySQL**.
7.  **Background Jobs** run asynchronously for maintenance and scheduled alerts.

## Visual Style

- Use a clean, modern, box-and-arrow block diagram style.
- Group components logically (e.g., Client Side, API Server, Services, Data Layer).
- Use distinct colors for different layers (e.g., Blue for Client, Green for Server, Purple for AI/Services, Grey for Database).
