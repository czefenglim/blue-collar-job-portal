# Frontend Page Documentation

## 1. (tabs)

### SavedJobsScreen.tsx

**Description**: A screen for job seekers to view and manage their saved job postings.
**Flow**: Users navigate to this tab to see a list of jobs they have saved. The list displays job titles, company names, and other key details. Users can tap on a job card to view the full job details. The screen supports pull-to-refresh to update the list. If there are no saved jobs, a message prompts the user to explore jobs.

### AppliedJobScreen.tsx

**Description**: A screen for job seekers to track their job applications.
**Flow**: Users access this tab to see the status of their applications (e.g., Pending, Shortlisted, Rejected). Each application card shows the job title, company, applied date, and current status. Users can tap on an application to view more details or history.

### companies.tsx

**Description**: A screen for users to explore and search for companies.
**Flow**: Users browse a list of companies, with options to filter by industry or search by name. Tapping on a company card navigates to the company's profile page where users can see company details and open job positions.

### messages/index.tsx

**Description**: The main messaging hub for users (job seekers).
**Flow**: Users view a list of their active conversations with employers. Each list item shows the other party's name, the last message preview, and a timestamp. Tapping on a conversation opens the chat interface (`chat/[id].tsx`).

### HomeScreen.tsx

**Description**: The primary job discovery feed for job seekers.
**Flow**: When users open this tab, they see featured and recommended jobs tailored to their preferences and location. Users can filter by industry, salary, and distance, search by keywords, and scroll through cards showing job titles, company names, salary ranges, and locations. Tapping a card opens Job Details. Users can save jobs or start the application flow.

### ProfileScreen.tsx

**Description**: A hub for managing the job seeker’s profile and settings.
**Flow**: Users view their profile snapshot (name, photo, preferred language, saved jobs count). Action buttons navigate to Edit Profile, Preferences, and Notification settings. Users can update language preferences and log out from this tab.

## 2. user-hidden

### companies/[id].tsx

**Description**: Detailed profile page for a specific company.
**Flow**: Users arrive here by tapping a company card. They can view the company's description, location, website, and a list of their active job postings. Users can also see reviews and ratings for the company.

### offer/[id].tsx

**Description**: A screen for job seekers to view and respond to a job offer.
**Flow**: When an employer sends an offer, the user receives a notification. Tapping it opens this screen, which displays the offer details (salary, start date, contract). The user can choose to Accept or Reject the offer. Accepting may trigger a contract signing flow.

### notifications.tsx

**Description**: A list of notifications for the user.
**Flow**: Users access this from the header or a dedicated icon. It lists system updates, application status changes, and new message alerts. Tapping a notification marks it as read and may navigate the user to the relevant screen (e.g., Job Details, Chat).

### report-history.tsx

**Description**: A screen for users to view the status of reports they have submitted.
**Flow**: Users can track reports they've made against jobs or companies. It shows the report type, date, and current status (e.g., Pending, Resolved).

### report-job.tsx

**Description**: A form for users to report a job posting.
**Flow**: Users access this from a job details page if they find the content inappropriate. They select a reason for reporting (e.g., Scam, Harassment) and can add a description and evidence. Submitting sends the report to admins for review.

### update-location.tsx

**Description**: A screen for users to update their location settings for job matching.
**Flow**: Users can adjust their preferred location or current location to improve job recommendations. This might involve a map interface or text input for city/state.

## 3. employer

### dashboard.tsx

**Description**: The main landing page for logged-in employers.
**Flow**: Employers see an overview of their recruitment activities, including statistics on active jobs, total applicants, and recent applications. It provides quick access to post a new job or manage existing ones.

### job-posts.tsx

**Description**: A management screen for the employer's job postings.
**Flow**: Employers view a list of their posted jobs with statuses (Active, Pending, Closed). They can filter the list, and tap on a job to edit it, view applicants, or close the position.

### applicants/index.tsx

**Description**: A list of applicants across all or specific jobs.
**Flow**: Employers browse candidates who have applied. The list shows applicant names, applied roles, and match scores. Employers can filter by job or status to manage the hiring pipeline.

### messages/index.tsx

**Description**: The messaging hub for employers.
**Flow**: Similar to the user's message tab, this lists conversations with job seekers. Employers can search for specific candidates and open chats to discuss job opportunities or interviews.

### profile/index.tsx

**Description**: The employer's company profile management screen.
**Flow**: Employers view and edit their company details, such as logo, description, industry, and contact information. This information is visible to job seekers.

## 4. employer-hidden

### create-job.tsx

**Description**: The form for employers to create a new job posting.
**Flow**: Employers fill out details like job title, description, requirements, salary range, and location. The form supports AI-assisted suggestions and validation. Upon submission, the job goes into a review queue (AI or Admin).

### job-post-details/[id].tsx

**Description**: Detailed view of a specific job post for the employer.
**Flow**: Employers see the full content of their job post as it appears to users. They can access options to edit, close, or view analytics for this specific job.

### job-post-details/[id]/edit.tsx

**Description**: The editing form for an existing job post.
**Flow**: Employers modify details of a job. Pre-filled with existing data, this form allows updates to description, salary, etc. Changes may trigger re-verification.

### applicant-details/[id].tsx

**Description**: Detailed profile view of a specific applicant.
**Flow**: Employers view the candidate's resume, skills, experience, and answers to screening questions. Action buttons allow the employer to Shortlist, Reject, or Message the candidate.

### hire/[id].tsx

**Description**: The screen to initiate the hiring process for an applicant.
**Flow**: Employers select an applicant and configure the job offer details (start date, salary, contract terms). Submitting sends the offer to the candidate.

### hire/verify/[id].tsx

**Description**: A verification screen for the hiring process.
**Flow**: Employers review the signed contract or final details before the hiring is official. This ensures all legal and compliance steps are met.

### payment/payment-failed.tsx

**Description**: A screen displayed when a payment transaction fails.
**Flow**: If a subscription or feature purchase fails, the user is redirected here. It explains the error and provides options to Retry or Contact Support.

### payment/payment-success.tsx

**Description**: A screen displayed upon successful payment.
**Flow**: Confirms the transaction and redirects the user back to the main flow (e.g., Dashboard or Job Post).

### pricing.tsx

**Description**: A screen displaying subscription plans and pricing.
**Flow**: Employers view different tiers (Free, Pro, Enterprise) and their features. They can select a plan to upgrade their account.

### company-preview.tsx

**Description**: A preview of how the company profile looks to job seekers.
**Flow**: Employers use this to verify their branding and information presentation before publishing updates.

### notifications.tsx

**Description**: Employer-specific notifications.
**Flow**: Alerts for new applications, message replies, and system updates relevant to the employer's account.

### pending-verification.tsx

**Description**: A status screen for unverified employer accounts.
**Flow**: If an account is pending admin approval, this screen blocks access to certain features and informs the user of the status.

### reviews.tsx

**Description**: A screen for employers to manage or view company reviews.
**Flow**: Employers can see feedback left by employees or candidates. They may have the option to report inappropriate reviews.

### reports/index.tsx

**Description**: A dashboard for reports related to the employer.
**Flow**: Employers can view reports they've filed or reports against their jobs (if applicable/visible).

### reports/[id]/page.tsx

**Description**: Details of a specific report.
**Flow**: Shows the content and status of a report.

### reports/[id]/appeal.tsx

**Description**: A form to appeal a decision made on a report or job suspension.
**Flow**: If a job is suspended, the employer can submit an appeal here, providing explanation and evidence.

### edit-company-profile.tsx

**Description**: A screen to update company information and branding.
**Flow**: Employers edit fields like company name, industry, description, logo, address, and contact details. Validation highlights required sections. Saving updates the profile and may trigger preview or re-verification if key identity fields change.

## 5. admin

### dashboard.tsx

**Description**: The main command center for administrators.
**Flow**: Admins see high-level metrics: total users, active jobs, pending approvals, and system health. It serves as a launchpad for moderation tasks.

### company-approval/page.tsx

**Description**: A queue of companies waiting for verification.
**Flow**: Admins review company documents and details. They can Approve or Reject the company registration.

### job-management.tsx

**Description**: A comprehensive list of all jobs in the system.
**Flow**: Admins search and filter jobs to moderate content. They can manually suspend or approve jobs that were flagged.

### report.tsx

**Description**: A dashboard for managing user reports.
**Flow**: Admins view a list of reported content (jobs, users, companies). They can investigate and take action (e.g., ban user, remove post).

### users.tsx

**Description**: User management screen.
**Flow**: Admins view all registered users. They can manage roles, suspend accounts, or reset passwords if necessary.

## 6. admin-hidden

### login.tsx

**Description**: Dedicated login screen for administrators.
**Flow**: Admins enter secure credentials to access the admin panel. Separate from the main user login to ensure security.

### admin-job-approval/page.tsx

**Description**: A specialized queue for job posts requiring manual approval.
**Flow**: Admins review jobs that failed AI verification or were flagged. They compare the content against guidelines and make a decision.

### job-statistics.tsx

**Description**: Detailed analytics and reporting screen.
**Flow**: Admins view graphs and data on user growth, job posting trends, and revenue.

### review-moderation.tsx

**Description**: A screen for moderating user reviews.
**Flow**: Admins review flagged or reported reviews. They can delete reviews that violate policies.

### subscription.tsx

**Description**: Management screen for subscription plans.
**Flow**: Admins create, edit, or disable subscription packages and pricing.

### appeals/[id].tsx

**Description**: Detail view for processing an appeal.
**Flow**: Admins review an employer's appeal against a suspension. They see the original reason and the employer's defense before making a final ruling.

### admin-job-approval/[id].tsx

**Description**: Detailed view of a single job requiring approval.
**Flow**: Admins inspect the job’s description, salary, and AI flags. They can approve, reject, or request changes, adding notes for transparency. Actions update the job’s moderation status.

### appeals/index.tsx

**Description**: List of all pending and processed appeals.
**Flow**: Admins browse appeals with filters by status and date. Tapping an item opens the detailed appeal page for review and decision.

### companies/page.tsx

**Description**: Paginated list of companies for administration.
**Flow**: Admins search and filter companies by verification status and industry. Selecting a company navigates to its detailed page.

### companies/[id].tsx

**Description**: Detailed company profile for administrative actions.
**Flow**: Admins review company details and uploaded documents. They can approve verification, reject with reasons, or request additional information.

### company-approval/[id].tsx

**Description**: Focused view for a single company’s verification request.
**Flow**: Shows submitted documents and identity checks. Admins take action to approve or reject and log decisions for audit.

### jobs/[id].tsx

**Description**: Administrative job detail page.
**Flow**: Admins view the job post content and history. They can suspend, unsuspend, or edit metadata, and see related reports.

### reports/job-review/[jobId].tsx

**Description**: Moderation of reviews attached to a specific job.
**Flow**: Admins see reviews, flags, and reports for the job. They can remove violating reviews or mark them as resolved.

## 7. Other (Not inside the folders above)

### LoginScreen.tsx

**Description**: The entry point for job seekers.
**Flow**: Users enter their email and password. Options for "Forgot Password" and "Sign Up" are available. Successful login directs them to the main tabs.

### EmployerLoginScreen.tsx

**Description**: The entry point for employers.
**Flow**: Similar to the user login but directed at the employer portal. May include specific branding or info for partners.

### SignUpScreen.tsx

**Description**: Registration screen for new users.
**Flow**: Users provide personal details, email, and password. Verification steps (like OTP) may follow.

### SelectRoleScreen.tsx

**Description**: The initial screen for new or unauthenticated users.
**Flow**: Users choose their intent: "I want a job" (Job Seeker) or "I want to hire" (Employer). This directs them to the appropriate login/signup flow.

### OnboardingFlow.tsx

**Description**: A multi-step wizard for new job seekers.
**Flow**: Users complete their profile: skills, experience, preferences. This data is used for job matching.

### EmployerOnboardingFlow.tsx

**Description**: A multi-step wizard for new employers.
**Flow**: Employers provide company details, verification documents, and initial setup preferences.

### ForgotPasswordScreen.tsx

**Description**: Recovery flow for lost passwords.
**Flow**: Users enter their email to receive a reset link or OTP. They then set a new password.

### TermsAndConditionsScreen.tsx

**Description**: Displays the legal terms of service.
**Flow**: Users read and accept the terms before creating an account. Accessible later from settings.

### suspended.tsx

**Description**: A blocking screen for suspended accounts.
**Flow**: If a suspended user tries to log in, they are redirected here. It explains the suspension and may offer a contact link.

### JobDetailsScreen/[slug].tsx

**Description**: Public or shared view of a job.
**Flow**: Accessible via deep links or shared URLs. Displays job info and prompts unauthenticated users to log in to apply.

### ApplyConfirmationScreen/[slug].tsx

**Description**: Pre-application summary.
**Flow**: Users review their profile and the job requirements before sending their application. They can add a custom note.

### EditProfileScreen.tsx

**Description**: Screen for users to update their personal profile.
**Flow**: Users edit their bio, skills, and resume. Changes are saved to their profile.

### PreferencesScreen.tsx

**Description**: Settings for job matching preferences.
**Flow**: Users adjust filters for job types, locations, and salary expectations.

### resume-questions.tsx

**Description**: A screen for users to answer specific questions for their resume or application.
**Flow**: Part of the application or profile building process, asking structured questions to enhance the candidate's profile.

### VoiceInputDemo.tsx

**Description**: Demonstration of voice input features.
**Flow**: Users tap Record to speak search queries or messages. The app converts speech to text and populates relevant fields. Users can review and submit or discard the transcribed input.

### (shared)/conversation-list.tsx

**Description**: Shared conversation list used across roles.
**Flow**: Displays recent conversations with avatars and unread counts. Selecting a conversation navigates to the chat detail screen for continued messaging.

### (shared)/chat/[id].tsx

**Description**: Shared chat interface for one-on-one messaging.
**Flow**: Shows message history, typing indicators, and input box. Users send text, attachments, or voice notes. Notifications update in real-time as messages are exchanged.

### index.tsx

**Description**: Root entry point for the app routing.
**Flow**: Initializes app context and navigates users based on authentication and role state, commonly directing to SelectRoleScreen or the appropriate dashboard.

### modal.tsx

**Description**: Generic modal route for transient dialogs.
**Flow**: Displays contextual content such as terms updates, help, or confirmation dialogs. Users dismiss or take action, returning to the previous screen.
