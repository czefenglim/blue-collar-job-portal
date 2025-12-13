# Use Case Specifications

This document outlines the detailed specifications for each use case in the Blue-Collar Job Portal system, corresponding to the provided activity diagrams.

## 1. Manage Users

**1. Use Case Name**
Manage Users

**2. Description (Purpose)**
This use case allows the Admin to view, search, filter, and manage user accounts (Job Seekers and Employers). The Admin can suspend, activate, or delete user accounts as necessary to maintain system integrity.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to ensure only valid and compliant users are on the platform.
- **User (Job Seeker/Employer):** Wants their account to remain active and secure; expects fair moderation.

**6. Preconditions**

- Admin must be logged in.
- Admin must have "User Management" privileges.

**7. Postconditions**

- **Success:** User status is updated (Suspended, Active, or Deleted) in the database. Affected user is notified (if applicable).
- **Failure:** No changes are made to the user account; error message is displayed.

**8. Trigger**
Admin navigates to the "User Management" section of the dashboard.

**9. Main Success Scenario (Standard Flow)**

1.  Admin accesses User Management.
2.  System fetches and displays the list of users.
3.  Admin selects a user from the list.
4.  System fetches and displays user details.
5.  Admin reviews user details.
6.  Admin clicks "Activate" (if user is suspended/pending).
7.  Admin confirms the action.
8.  System updates user status to "Active".
9.  System displays a success message.

**10. Alternative Flows**

- **A1: Search/Filter Users (at step 2)**
  1.  Admin enters search criteria or applies filters.
  2.  System filters data and updates the list display.
  3.  Flow returns to step 3.
- **A2: Suspend User (at step 6)**
  1.  Admin clicks "Suspend".
  2.  Admin enters the reason for suspension.
  3.  Admin confirms.
  4.  System updates status to "Suspended".
  5.  System notifies the user.
  6.  Flow ends.
- **A3: Delete User (at step 6)**
  1.  Admin clicks "Delete".
  2.  Admin confirms the warning.
  3.  System soft-deletes the user record.
  4.  Flow ends.

**11. Exception Flows**

- **E1: Database Error:** System shows an error message and logs the incident.

---

## 2. Manage Jobs

**1. Use Case Name**
Manage Jobs

**2. Description (Purpose)**
This use case allows the Admin to review job posts created by employers. The Admin can approve pending jobs or reject jobs that violate policies.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to ensure job listings are high quality and legitimate.
- **Employer:** Wants their job post approved quickly.
- **Job Seeker:** Wants to see valid and safe job opportunities.

**6. Preconditions**

- Admin must be logged in.
- Job posts exist in the system.

**7. Postconditions**

- **Success:** Job status is updated to "Active" or "Rejected". Employer is notified.
- **Failure:** Job status remains unchanged.

**8. Trigger**
Admin navigates to the "Job Management" section.

**9. Main Success Scenario (Standard Flow - Approve)**

1.  Admin accesses Job Management.
2.  System fetches and displays the job list.
3.  Admin filters by status (e.g., "Pending").
4.  System updates the job list.
5.  Admin selects a job.
6.  System fetches and displays job details.
7.  Admin reviews the details.
8.  Admin clicks "Approve Job".
9.  System updates status to "Active".
10. System publishes the job.
11. System shows success message.

**10. Alternative Flows**

- **A1: Reject Job (at step 8)**
  1.  Admin clicks "Reject Job".
  2.  Admin enters the rejection reason.
  3.  System updates status to "Rejected".
  4.  System notifies the employer.
  5.  Flow ends.

**11. Exception Flows**

- **E1: Data Fetch Error:** If job details cannot be loaded, show error.

---

## 3. Manage Companies

**1. Use Case Name**
Manage Companies

**2. Description (Purpose)**
This use case allows the Admin to review and verify company profiles. The Admin can verify legitimate companies or reject/suspend fraudulent ones.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to verify business legitimacy.
- **Employer:** Wants their company verified to build trust.

**6. Preconditions**

- Admin must be logged in.
- Company profiles exist.

**7. Postconditions**

- **Success:** Company status is updated (Verified, Rejected, Suspended).
- **Failure:** No change in status.

**8. Trigger**
Admin accesses the "Company Management" section.

**9. Main Success Scenario (Standard Flow - Verify)**

1.  Admin accesses Company Management.
2.  System fetches and displays company list.
3.  Admin selects a company.
4.  System displays company details and documents.
5.  Admin reviews documents.
6.  Admin clicks "Verify".
7.  System updates status to "Verified".
8.  System notifies the employer.

**10. Alternative Flows**

- **A1: Reject Company (at step 6)**
  1.  Admin clicks "Reject".
  2.  Admin enters reason.
  3.  System updates status to "Rejected".
  4.  System notifies employer.
- **A2: Suspend Company (at step 6)**
  1.  Admin clicks "Suspend".
  2.  System updates status to "Suspended".

**11. Exception Flows**

- **E1: System Error:** Generic error handling.

---

## 4. Manage Industries

**1. Use Case Name**
Manage Industries

**2. Description (Purpose)**
This use case allows the Admin to manage the list of industries available in the system. Admins can add new industries, edit existing ones, or delete unused ones.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to maintain an organized categorization of jobs.
- **Users:** Want accurate industry categories for searching/posting.

**6. Preconditions**

- Admin logged in.

**7. Postconditions**

- **Success:** Industry list is updated.
- **Failure:** No change.

**8. Trigger**
Admin accesses "Industry Management".

**9. Main Success Scenario (Standard Flow - Add)**

1.  Admin views industry list.
2.  Admin clicks "Add New Industry".
3.  Admin enters industry name.
4.  Admin clicks "Save".
5.  System validates uniqueness.
6.  System saves new industry.
7.  System updates list.

**10. Alternative Flows**

- **A1: Edit Industry**
  1.  Admin selects an industry.
  2.  Admin clicks "Edit".
  3.  Admin updates name.
  4.  System saves changes.
- **A2: Delete Industry**
  1.  Admin clicks "Delete".
  2.  System checks if used by jobs.
  3.  If not used, System deletes it.
  4.  If used, System prevents delete and shows error.

**11. Exception Flows**

- **E1: Duplicate Name:** System warns that industry already exists.

---

## 5. Manage Reviews

**1. Use Case Name**
Manage Reviews

**2. Description (Purpose)**
This use case allows the Admin to moderate reviews posted by Job Seekers. Admins can delete reviews that violate content policies.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to keep platform content civil and constructive.
- **Employer:** Wants to be protected from false/abusive reviews.
- **Job Seeker:** Wants to share honest feedback.

**6. Preconditions**

- Admin logged in.
- Reviews exist.

**7. Postconditions**

- **Success:** Review is kept or deleted.
- **Failure:** No change.

**8. Trigger**
Admin accesses "Review Moderation" or receives a report.

**9. Main Success Scenario (Standard Flow - No Action)**

1.  Admin views reported reviews.
2.  System displays review content.
3.  Admin reads review.
4.  Admin decides no violation occurred.
5.  Admin dismisses report.

**10. Alternative Flows**

- **A1: Delete Review**
  1.  Admin determines review violates policy.
  2.  Admin clicks "Delete Review".
  3.  System removes review from display.
  4.  System notifies author (optional).

**11. Exception Flows**

- **E1: Database Error.**

---

## 6. Manage Subscriptions (Admin)

**1. Use Case Name**
Manage Subscriptions

**2. Description (Purpose)**
This use case allows the Admin to view and manage subscription plans and employer subscriptions.

**3. Primary Actor**
Admin

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Admin:** Wants to manage revenue streams.
- **Employer:** Wants correct subscription status.

**6. Preconditions**

- Admin logged in.

**7. Postconditions**

- **Success:** Subscription plans updated or employer status modified.

**8. Trigger**
Admin accesses "Subscription Management".

**9. Main Success Scenario (Standard Flow - Update Plan)**

1.  Admin views subscription plans.
2.  Admin selects a plan to edit.
3.  Admin updates price or features.
4.  System saves changes.

**10. Alternative Flows**

- **A1: View Employer Subs**
  1.  Admin views list of subscribed employers.
  2.  Admin filters by status (Active/Expired).

**11. Exception Flows**

- **E1: System Error.**

---

## 7. Sign Up / Login (Job Seeker)

**1. Use Case Name**
Sign Up / Login (Job Seeker)

**2. Description (Purpose)**
This use case allows a Job Seeker to create a new account or log in to an existing account to access the platform's features.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants access to the system.
- **System:** Needs to authenticate users for security.

**6. Preconditions**

- User is not logged in.

**7. Postconditions**

- **Success:** User is authenticated and redirected to the Home Screen.
- **Failure:** User remains on the Auth screen with an error message.

**8. Trigger**
User opens the app or clicks "Login/Register".

**9. Main Success Scenario (Standard Flow - Login)**

1.  User selects "Login".
2.  User enters Email and Password.
3.  User clicks "Login".
4.  System validates credentials.
5.  System generates session/token.
6.  System redirects to Home Screen.

**10. Alternative Flows**

- **A1: Register**
  1.  User selects "Register".
  2.  User enters Name, Email, Password.
  3.  User clicks "Sign Up".
  4.  System validates input (format, uniqueness).
  5.  System creates new user record.
  6.  System redirects to Onboarding/Home.
- **A2: Forgot Password**
  1.  User clicks "Forgot Password".
  2.  User enters email.
  3.  System sends reset link/OTP.

**11. Exception Flows**

- **E1: Invalid Credentials:** System shows "Incorrect email or password".
- **E2: Email Already Exists (Register):** System shows error.

---

## 8. Onboarding

**1. Use Case Name**
Onboarding

**2. Description (Purpose)**
This use case guides the Job Seeker through the initial profile setup, including personal details, industry preferences, and resume generation.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to quickly set up their profile to start applying.
- **Employer:** Wants candidates to have complete profiles for better evaluation.

**6. Preconditions**

- Job Seeker account is verified.
- Onboarding is not completed.

**7. Postconditions**

- **Success:** Profile is complete and user is redirected to Dashboard.
- **Failure:** Onboarding remains incomplete.

**8. Trigger**
User completes account verification or logs in with an incomplete profile.

**9. Main Success Scenario (Standard Flow)**

1.  System initiates Onboarding Flow.
2.  User completes Personal Profile.
3.  System validates and saves profile.
4.  User selects Preferred Industries.
5.  System saves preferences.
6.  User initiates Resume Generation.
7.  System generates resume (AI/Template) and saves it.
8.  System displays summary.
9.  User reviews information.
10. User clicks "Continue".
11. System finalizes onboarding status.
12. System redirects to Dashboard.

**10. Alternative Flows**

- **A1: Skip Steps**
  1.  User chooses to skip a step (Profile, Industries, or Resume).
  2.  System proceeds to the next step.
- **A2: Edit Information**
  1.  User chooses to edit information during review.
  2.  System navigates back to the relevant step.

**11. Exception Flows**

- **E1: Validation Error:** System shows error message.
- **E2: Generation Failed:** Resume generation fails; system prompts to retry.

---

## 9. Browse & Search Jobs

**1. Use Case Name**
Browse & Search Jobs

**2. Description (Purpose)**
This use case allows the Job Seeker to view available job listings and search for specific jobs using keywords or filters.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to find relevant jobs.
- **Employer:** Wants their jobs to be seen.

**6. Preconditions**

- User is logged in (or guest, depending on policy, but usually logged in for full features).

**7. Postconditions**

- **Success:** A list of jobs matching the criteria is displayed.

**8. Trigger**
User navigates to the "Jobs" tab.

**9. Main Success Scenario (Standard Flow)**

1.  User navigates to Home/Jobs screen.
2.  System fetches recent/recommended jobs.
3.  System displays job cards.
4.  User scrolls through the list.
5.  User clicks on a job card.
6.  System displays Job Details.

**10. Alternative Flows**

- **A1: Search/Filter**
  1.  User enters keywords in search bar.
  2.  User applies filters (Location, Salary, Industry).
  3.  System updates list based on criteria.

**11. Exception Flows**

- **E1: No Results:** System displays "No jobs found".

---

## 9. Save Jobs

**1. Use Case Name**
Save Jobs

**2. Description (Purpose)**
This use case allows the Job Seeker to bookmark jobs they are interested in for later viewing or applying.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to organize potential opportunities.

**6. Preconditions**

- User is logged in.
- Job post is active.

**7. Postconditions**

- **Success:** Job is added to or removed from the user's "Saved Jobs" list.

**8. Trigger**
User clicks the "Save" icon on a job card or detail view.

**9. Main Success Scenario (Standard Flow - Save)**

1.  User views job list or details.
2.  User clicks the "Save" button/icon.
3.  System adds job to Saved Jobs table.
4.  System updates icon state to "Saved".

**10. Alternative Flows**

- **A1: Unsave Job**
  1.  User clicks "Save" icon on an already saved job.
  2.  System removes job from Saved Jobs table.
  3.  System updates icon state to "Unsaved".

**11. Exception Flows**

- **E1: Network Error:** Action fails, user notified.

---

## 10. Apply to Jobs

**1. Use Case Name**
Apply to Jobs

**2. Description (Purpose)**
This use case allows the Job Seeker to submit an application for a specific job post.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
Notification Service (System)

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to get the job.
- **Employer:** Wants to receive applications.

**6. Preconditions**

- User logged in.
- Profile is sufficiently complete.
- User has not already applied to this job.

**7. Postconditions**

- **Success:** Application record created. Employer notified.
- **Failure:** Application not sent.

**8. Trigger**
User clicks "Apply Now" on Job Details screen.

**9. Main Success Scenario (Standard Flow)**

1.  User views Job Details.
2.  User clicks "Apply Now".
3.  System checks profile completeness.
4.  System shows Application Confirmation screen (Resume preview).
5.  User adds optional message.
6.  User clicks "Submit Application".
7.  System saves application to DB.
8.  System notifies Employer.
9.  System shows Success Message.

**10. Alternative Flows**

- **A1: Profile Incomplete**
  1.  System prompts user to complete profile.
  2.  User redirected to Edit Profile.

**11. Exception Flows**

- **E1: Already Applied:** System disables button or shows message.

---

## 11. View Profile

**1. Use Case Name**
View Profile

**2. Description (Purpose)**
This use case allows the Job Seeker to view their own profile details as they appear to employers.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to verify their information is correct.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Profile details displayed.

**8. Trigger**
User navigates to "Profile" tab.

**9. Main Success Scenario (Standard Flow)**

1.  User clicks Profile tab.
2.  System fetches user data (Education, Experience, Skills).
3.  System displays Profile screen.

**10. Alternative Flows**
None.

**11. Exception Flows**

- **E1: Data Load Error.**

---

## 12. Edit Profile

**1. Use Case Name**
Edit Profile

**2. Description (Purpose)**
This use case allows the Job Seeker to update their personal information, experience, education, and skills.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to keep resume up to date.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Profile data updated in DB.

**8. Trigger**
User clicks "Edit" on Profile screen.

**9. Main Success Scenario (Standard Flow)**

1.  User views Profile.
2.  User clicks "Edit Profile".
3.  User selects section to edit (e.g., Address, Job Preferences).
4.  User updates information.
5.  User clicks "Save".
6.  System validates input.
7.  System updates record.
8.  System shows success message.

**10. Alternative Flows**

- **A1: Invalid Input**
  1.  System shows validation error.
  2.  User corrects input.

**11. Exception Flows**

- **E1: Save Failed.**

---

## 13. Manage Preferences

**1. Use Case Name**
Manage Preferences

**2. Description (Purpose)**
This use case allows the Job Seeker to set their job preferences (industries, location) and app settings (language, notifications).

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants a personalized experience.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Preferences saved.

**8. Trigger**
User accesses "Settings" or "Preferences".

**9. Main Success Scenario (Standard Flow)**

1.  User navigates to Settings.
2.  User changes a setting (e.g., Language).
3.  System applies change immediately or on save.
4.  System confirms update.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.

---

## 14. Write Reviews

**1. Use Case Name**
Write Reviews

**2. Description (Purpose)**
This use case allows the Job Seeker to write a review for a company they have worked for.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to share experience.
- **Community:** Wants information on employers.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Review saved to DB.

**8. Trigger**
User navigates to a Company page and clicks "Write Review".

**9. Main Success Scenario (Standard Flow)**

1.  User selects a company.
2.  User clicks "Write Review".
3.  User selects Star Rating (1-5).
4.  (Optional) User enters Title.
5.  (Optional) User enters Content.
6.  (Optional) User checks "Anonymous".
7.  User clicks "Submit".
8.  System saves review.
9.  System shows success message.

**10. Alternative Flows**
None.

**11. Exception Flows**

- **E1: Submission Failed.**

---

## 15. Chat with Employer

**1. Use Case Name**
Chat with Employer

**2. Description (Purpose)**
This use case allows the Job Seeker to communicate directly with an Employer regarding a job application.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
Employer

**5. Stakeholders and Interests**

- **Both:** Want to clarify details and schedule interviews.

**6. Preconditions**

- User logged in.
- A chat session exists (usually initiated after application/shortlist).

**7. Postconditions**

- **Success:** Message sent and stored.

**8. Trigger**
User clicks "Chat" on an application or notification.

**9. Main Success Scenario (Standard Flow)**

1.  User opens Chat list.
2.  User selects a conversation.
3.  System loads message history.
4.  User types message.
5.  User clicks Send.
6.  System delivers message to Employer.

**10. Alternative Flows**
None.

**11. Exception Flows**

- **E1: Message Failed to Send.**

---

## 16. View Notifications

**1. Use Case Name**
View Notifications

**2. Description (Purpose)**
This use case allows the Job Seeker to see updates about their applications, messages, and system alerts.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to stay informed.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Notifications displayed and marked read.

**8. Trigger**
User clicks Notification icon.

**9. Main Success Scenario (Standard Flow)**

1.  User clicks Notification bell.
2.  System fetches notifications.
3.  System displays list.
4.  User clicks a notification.
5.  System marks as read and redirects to relevant screen.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.

---

## 17. Sign Up / Login (Employer)

**1. Use Case Name**
Sign Up / Login (Employer)

**2. Description (Purpose)**
This use case allows an Employer to create a company account or log in to manage their hiring process.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Wants access to post jobs.
- **System:** Needs to authenticate business users.

**6. Preconditions**

- User is not logged in.

**7. Postconditions**

- **Success:** User is authenticated and redirected to Employer Dashboard.

**8. Trigger**
User selects "Employer Login/Register".

**9. Main Success Scenario (Standard Flow - Login)**

1.  User selects "Login".
2.  User enters Email and Password.
3.  User clicks "Login".
4.  System validates credentials.
5.  System generates session/token.
6.  System redirects to Dashboard.

**10. Alternative Flows**

- **A1: Register**
  1.  User selects "Register".
  2.  User enters Name, Email, Password, Company Name.
  3.  User clicks "Sign Up".
  4.  System validates input.
  5.  System creates new employer record.
  6.  System redirects to Dashboard.

**11. Exception Flows**

- **E1: Invalid Credentials.**

---

## 18. Employer Onboarding

**1. Use Case Name**
Employer Onboarding

**2. Description (Purpose)**
This use case guides the Employer through the initial company profile setup and verification document submission.

**3. Primary Actor**
Employer

**4. Supporting Actors**
Admin (for subsequent verification)

**5. Stakeholders and Interests**

- **Employer:** Wants to get their account verified to start posting jobs.
- **Admin:** Needs to verify legitimate businesses.

**6. Preconditions**

- Employer account is created and email verified.
- Onboarding is not completed.

**7. Postconditions**

- **Success:** Company profile and documents submitted for review. Account status set to Pending.
- **Failure:** Onboarding remains incomplete.

**8. Trigger**
User completes account verification or logs in with an incomplete profile/verification.

**9. Main Success Scenario (Standard Flow)**

1.  System initiates Employer Onboarding Flow.
2.  User completes Company Profile details.
3.  User uploads Verification Documents.
4.  System displays summary.
5.  User reviews information.
6.  User clicks "Continue".
7.  System sets account status to "Pending".
8.  System notifies Admin for review.
9.  System shows "Pending Approval" screen.

**10. Alternative Flows**

- **A1: Edit Information**
  1.  User chooses to edit information during review.
  2.  System navigates back to the relevant step.

**11. Exception Flows**

- **E1: Validation Error:** System shows error message.
- **E2: Upload Failed:** Document upload fails; system prompts to retry.

---

## 18. Create Job Post

**1. Use Case Name**
Create Job Post

**2. Description (Purpose)**
This use case allows the Employer to create and publish a new job listing.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Wants to hire.
- **Job Seeker:** Wants to find jobs.

**6. Preconditions**

- User logged in as Employer.

**7. Postconditions**

- **Success:** Job is published and quota deducted.

**8. Trigger**
User clicks "Create New Job".

**9. Main Success Scenario (Standard Flow)**

1.  User clicks "Create New Job".
2.  System checks Subscription/Quota.
3.  User enters Job Details (Title, Description, Salary, etc.).
4.  User clicks "Publish".
5.  System validates data.
6.  System saves job to DB.
7.  System deducts quota.
8.  System shows success message.

**10. Alternative Flows**

- **A1: No Quota**
  1.  System detects insufficient quota.
  2.  System prompts user to Upgrade/Pay.
  3.  User redirected to Subscription page.

**11. Exception Flows**

- **E1: Validation Error.**

---

## 19. Edit / Manage Job Post

**1. Use Case Name**
Edit / Manage Job Post

**2. Description (Purpose)**
This use case allows the Employer to edit, close, or delete an existing job post.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Wants to keep listings accurate.

**6. Preconditions**

- User logged in.
- Job exists.

**7. Postconditions**

- **Success:** Job updated or status changed.

**8. Trigger**
User selects an existing job.

**9. Main Success Scenario (Standard Flow - Edit)**

1.  User views Job List.
2.  User selects a Job.
3.  User clicks "Edit".
4.  User updates details.
5.  User clicks "Save".
6.  System updates record.

**10. Alternative Flows**

- **A1: Close Job**
  1.  User clicks "Close Job".
  2.  System updates status to Closed.
- **A2: Delete Job**
  1.  User clicks "Delete Job".
  2.  System removes job record.

**11. Exception Flows**

- **E1: Database Error.**

---

## 20. View Applicants

**1. Use Case Name**
View Applicants

**2. Description (Purpose)**
This use case allows the Employer to review applicants and shortlist them.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Wants to screen candidates.

**6. Preconditions**

- User logged in.
- Job has applicants.

**7. Postconditions**

- **Success:** Applicant status updated (Shortlisted).

**8. Trigger**
User clicks "View Applicants" on a job.

**9. Main Success Scenario (Standard Flow)**

1.  User selects a Job.
2.  System displays Applicant list.
3.  User selects an Applicant.
4.  System shows Profile/Resume.
5.  User reviews details.
6.  User clicks "Shortlist".
7.  System updates status.
8.  System notifies Job Seeker.

**10. Alternative Flows**

- **A1: No Action**
  1.  User reviews but takes no action.
  2.  User returns to list.

**11. Exception Flows**
None.

---

## 21. Respond to Reviews

**1. Use Case Name**
Respond to Reviews

**2. Description (Purpose)**
This use case allows the Employer to reply to reviews left by employees.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Manage reputation.

**6. Preconditions**

- User logged in.
- Review exists.

**7. Postconditions**

- **Success:** Reply posted.

**8. Trigger**
User navigates to Reviews section.

**9. Main Success Scenario (Standard Flow)**

1.  User views reviews.
2.  User clicks "Reply" on a review.
3.  User types response.
4.  User clicks "Submit".
5.  System saves response.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.

---

## 22. Flag Review

**1. Use Case Name**
Flag Review

**2. Description (Purpose)**
This use case allows an Employer to report a review that they believe violates policies or is spam.

**3. Primary Actor**
Employer

**4. Supporting Actors**
Admin

**5. Stakeholders and Interests**

- **Employer:** Wants to remove unfair or abusive reviews.
- **Admin:** Wants to moderate content.

**6. Preconditions**

- User logged in.
- Review exists.

**7. Postconditions**

- **Success:** Review is flagged/reported. Admin is notified.
- **Failure:** Flag not recorded.

**8. Trigger**
User clicks the "Flag" icon/button on a review.

**9. Main Success Scenario (Standard Flow)**

1.  User clicks "Flag" on a review.
2.  System prompts for a reason.
3.  User enters reason.
4.  User clicks "Submit".
5.  System validates input.
6.  System records the flag.
7.  System shows success message.

**10. Alternative Flows**

- **A1: Cancel Flag**
  1.  User clicks "Cancel" in the prompt.
  2.  Flow ends.

**11. Exception Flows**

- **E1: Missing Reason:** System shows error "Reason is required".
- **E2: System Error:** Alert "Flag failed".

---

## 23. Manage Company Profile

**1. Use Case Name**
Manage Company Profile

**2. Description (Purpose)**
This use case allows the Employer to update company information.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Branding.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Profile updated.

**8. Trigger**
User clicks "Company Profile".

**9. Main Success Scenario (Standard Flow)**

1.  User clicks "Edit Profile".
2.  User updates details (Name, Logo, Desc).
3.  User clicks "Save".
4.  System updates record.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.

---

## 24. Manage Subscription

**1. Use Case Name**
Manage Subscription

**2. Description (Purpose)**
This use case allows the Employer to view, upgrade, or cancel their subscription plan.

**3. Primary Actor**
Employer

**4. Supporting Actors**
Payment Gateway

**5. Stakeholders and Interests**

- **Employer:** Access features.
- **System:** Revenue.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Subscription updated.

**8. Trigger**
User navigates to "Billing / Subscription".

**9. Main Success Scenario (Standard Flow)**

1.  User navigates to Billing.
2.  System displays current plan.
3.  User clicks "Upgrade" or "Renew".
4.  System shows available plans.
5.  User selects a plan.
6.  System redirects to Payment (see UC_Pay).
7.  System updates subscription upon success.

**10. Alternative Flows**

- **A1: Cancel Subscription**
  1.  User clicks "Cancel".
  2.  System processes cancellation.
  3.  System sets expiry date.

**11. Exception Flows**

- **E1: Payment Failed.**

---

## 25. Make Payments

**1. Use Case Name**
Make Payments

**2. Description (Purpose)**
This use case handles the actual payment process for subscriptions or ad-hoc services.

**3. Primary Actor**
Employer

**4. Supporting Actors**
Payment Gateway

**5. Stakeholders and Interests**

- **System:** Secure transaction.

**6. Preconditions**

- User selected a payable item.

**7. Postconditions**

- **Success:** Transaction recorded, Invoice generated.

**8. Trigger**
User proceeds to checkout.

**9. Main Success Scenario (Standard Flow)**

1.  System redirects to Payment Gateway (or internal form).
2.  User enters payment details.
3.  User clicks "Pay".
4.  System processes transaction with Gateway.
5.  System records success.
6.  System sends receipt.

**10. Alternative Flows**
None.

**11. Exception Flows**

- **E1: Transaction Declined.**

---

## 26. Chat with Job Seeker

**1. Use Case Name**
Chat with Job Seeker

**2. Description (Purpose)**
This use case allows the Employer to message a candidate.

**3. Primary Actor**
Employer

**4. Supporting Actors**
Job Seeker

**5. Stakeholders and Interests**

- **Both:** Communication.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Message sent.

**8. Trigger**
User clicks "Message" on candidate.

**9. Main Success Scenario (Standard Flow)**

1.  User opens chat.
2.  User types message.
3.  User sends.
4.  System delivers.

**10. Alternative Flows**
None.

**11. Exception Flows**

- **E1: Network Error.**

---

## 27. View Notifications (Employer)

**1. Use Case Name**
View Notifications (Employer)

**2. Description (Purpose)**
This use case allows the Employer to view system alerts.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Awareness.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Notifications viewed.

**8. Trigger**
User clicks Notification icon.

**9. Main Success Scenario (Standard Flow)**

1.  User clicks Notification icon.
2.  System displays list.
3.  User clicks item.
4.  System redirects.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.

---

## 28. Manage Preferences (Employer)

**1. Use Case Name**
Manage Preferences (Employer)

**2. Description (Purpose)**
This use case allows the Employer to set their account preferences.

**3. Primary Actor**
Employer

**4. Supporting Actors**
None

**5. Stakeholders and Interests**

- **Employer:** Personalization.

**6. Preconditions**

- User logged in.

**7. Postconditions**

- **Success:** Preferences saved.

**8. Trigger**
User accesses "Settings".

**9. Main Success Scenario (Standard Flow)**

1.  User navigates to Settings.
2.  User changes settings.
3.  System saves changes.

**10. Alternative Flows**
None.

**11. Exception Flows**
None.
