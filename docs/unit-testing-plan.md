# Unit Testing Plan

This document outlines the unit test cases for the Blue Collar Job Portal system, categorized by pages/features.

## 1. Authentication & User Management

### 1.1 Signup & Registration Page

| Test Case ID | Test Scenario                           | Test Data / Input                                                                      | Expected Result                                        |
| :----------- | :-------------------------------------- | :------------------------------------------------------------------------------------- | :----------------------------------------------------- |
| TC-AUTH-001  | Verify successful user signup           | `name`: "John Doe", `email`: "new@example.com", `password`: "Pass123!", `role`: "USER" | User created, OTP sent to email, response 201 Created  |
| TC-AUTH-002  | Verify signup with existing email       | `name`: "John Doe", `email`: "existing@example.com", `password`: "Pass123!"            | Error 400, "Email already exists" message              |
| TC-AUTH-003  | Verify signup with missing fields       | `name`: "", `email`: "test@example.com", `password`: "Pass123!"                        | Error 400, "Missing required fields" message           |
| TC-AUTH-004  | Verify signup with invalid email format | `email`: "invalid-email", `password`: "Pass123!"                                       | Error 400, "Invalid email format" message              |
| TC-AUTH-005  | Verify OTP Verification Success         | `email`: "new@example.com", `otp`: "123456" (Valid)                                    | Verification successful, user status updated to ACTIVE |
| TC-AUTH-006  | Verify OTP Verification Failure         | `email`: "new@example.com", `otp`: "000000" (Invalid)                                  | Error 400, "Invalid OTP" message                       |
| TC-AUTH-007  | Verify OTP Expiry                       | `email`: "new@example.com", `otp`: "123456" (Expired > 10m)                            | Error 400, "OTP expired" message                       |

### 1.2 Login Page

| Test Case ID | Test Scenario                         | Test Data / Input                                          | Expected Result                                          |
| :----------- | :------------------------------------ | :--------------------------------------------------------- | :------------------------------------------------------- |
| TC-AUTH-008  | Verify successful login               | `email`: "valid@example.com", `password`: "CorrectPass123" | Login successful, JWT token returned, user data returned |
| TC-AUTH-009  | Verify login with incorrect password  | `email`: "valid@example.com", `password`: "WrongPass"      | Error 401, "Invalid credentials" message                 |
| TC-AUTH-010  | Verify login with non-existent email  | `email`: "unknown@example.com", `password`: "AnyPass"      | Error 404, "User not found" or "Invalid credentials"     |
| TC-AUTH-011  | Verify login with deactivated account | `email`: "banned@example.com", `password`: "Pass123"       | Error 403, "Account deactivated" message                 |
| TC-AUTH-012  | Verify login with empty fields        | `email`: "", `password`: ""                                | Error 400, "Email and password are required"             |

### 1.3 Password Management

| Test Case ID | Test Scenario                     | Test Data / Input                                                           | Expected Result                                |
| :----------- | :-------------------------------- | :-------------------------------------------------------------------------- | :--------------------------------------------- |
| TC-AUTH-013  | Verify Forgot Password Request    | `email`: "valid@example.com"                                                | Reset OTP sent to email, response 200 OK       |
| TC-AUTH-014  | Verify Reset Password Success     | `email`: "valid@example.com", `otp`: "123456", `newPassword`: "NewPass123!" | Password updated successfully, response 200 OK |
| TC-AUTH-015  | Verify Reset Password Invalid OTP | `email`: "valid@example.com", `otp`: "000000", `newPassword`: "NewPass123!" | Error 400, "Invalid OTP"                       |

## 2. Job Seeker Features

### 2.1 Home / Job Search Page

| Test Case ID | Test Scenario                 | Test Data / Input                    | Expected Result                                          |
| :----------- | :---------------------------- | :----------------------------------- | :------------------------------------------------------- |
| TC-JOB-001   | Verify Search by Keyword      | `search`: "Plumber"                  | List of jobs containing "Plumber" in title/desc returned |
| TC-JOB-002   | Verify Search with No Results | `search`: "Astronaut"                | Empty list returned, status 200 OK                       |
| TC-JOB-003   | Verify Filter by Industry     | `industry`: "construction"           | Only jobs with industry "construction" returned          |
| TC-JOB-004   | Verify Filter by Salary       | `minSalary`: 2000, `maxSalary`: 3000 | Jobs within 2000-3000 range returned                     |
| TC-JOB-005   | Verify Filter by Job Type     | `jobType`: "FULL_TIME"               | Only FULL_TIME jobs returned                             |
| TC-JOB-006   | Verify Pagination             | `page`: 2, `limit`: 10               | Second set of 10 jobs returned                           |

### 2.2 Job Details & Application

| Test Case ID | Test Scenario                          | Test Data / Input                    | Expected Result                                       |
| :----------- | :------------------------------------- | :----------------------------------- | :---------------------------------------------------- |
| TC-APP-001   | Verify Apply for Job (Success)         | `jobId`: 101, `resume`: "resume.pdf" | Application submitted, status "PENDING", response 201 |
| TC-APP-002   | Verify Apply for Job (Already Applied) | `jobId`: 101 (previously applied)    | Error 400, "Already applied" message                  |
| TC-APP-003   | Verify Apply for Closed Job            | `jobId`: 999 (Closed)                | Error 400, "Job is no longer active" message          |
| TC-SAVE-001  | Verify Save Job                        | `jobId`: 101                         | Job added to saved list, response 200                 |
| TC-SAVE-002  | Verify Unsave Job                      | `jobId`: 101 (already saved)         | Job removed from saved list, response 200             |

### 2.3 Company Discovery & Reviews

| Test Case ID | Test Scenario                | Test Data / Input                                  | Expected Result                                |
| :----------- | :--------------------------- | :------------------------------------------------- | :--------------------------------------------- |
| TC-COMP-001  | Verify Browse Companies      | `status`: "APPROVED"                               | List of verified companies returned            |
| TC-COMP-002  | Verify Create Review         | `companyId`: 50, `rating`: 5, `comment`: "Great!"  | Review created, response 201                   |
| TC-COMP-003  | Verify Review Validation     | `companyId`: 50, `rating`: 6                       | Error 400, "Rating must be between 1-5"        |
| TC-COMP-004  | Verify Report Job            | `jobId`: 101, `reason`: "Scam", `desc`: "Fake job" | Report created, status "PENDING", response 201 |
| TC-COMP-005  | Verify Report Job Validation | `jobId`: 101, `desc`: "Short"                      | Error 400, "Description too short"             |

### 2.4 Chat (Job Seeker Side)

| Test Case ID | Test Scenario               | Test Data / Input                       | Expected Result                                   |
| :----------- | :-------------------------- | :-------------------------------------- | :------------------------------------------------ |
| TC-CHAT-001  | Verify View Conversations   | `userId`: 10 (Job Seeker)               | List of active conversations returned             |
| TC-CHAT-002  | Verify Send Message         | `conversationId`: 5, `content`: "Hello" | Message sent, stored in DB, emitted via Socket    |
| TC-CHAT-003  | Verify Receive Notification | Event: New Message                      | Notification created in DB, socket event received |

## 3. Employer Features

### 3.1 Company Profile Management

| Test Case ID | Test Scenario                 | Test Data / Input                               | Expected Result                         |
| :----------- | :---------------------------- | :---------------------------------------------- | :-------------------------------------- |
| TC-EMP-001   | Verify Create Company Profile | `name`: "Acme Corp", `industry`: "Construction" | Company profile created, slug generated |
| TC-EMP-002   | Verify Upload Logo            | `file`: "logo.png" (2MB)                        | File uploaded to S3, key stored in DB   |
| TC-EMP-003   | Verify Upload Invalid Logo    | `file`: "logo.txt"                              | Error 400, "Invalid file type"          |
| TC-EMP-004   | Verify Upload Large Logo      | `file`: "large.png" (10MB)                      | Error 400, "File too large"             |

### 3.2 Job Management

| Test Case ID | Test Scenario                      | Test Data / Input                      | Expected Result                                         |
| :----------- | :--------------------------------- | :------------------------------------- | :------------------------------------------------------ |
| TC-EMP-005   | Verify Post New Job                | `title`: "Driver", `salary`: 3000      | Job created, AI translation triggered, status "PENDING" |
| TC-EMP-006   | Verify Update Job                  | `jobId`: 101, `title`: "Senior Driver" | Job details updated, response 200                       |
| TC-EMP-007   | Verify Close Job                   | `jobId`: 101, `isActive`: false        | Job status updated to Closed                            |
| TC-EMP-008   | Verify Post Job Unverified Company | `companyStatus`: "PENDING"             | Error 403, "Company verification required"              |

### 3.3 Candidate Management

| Test Case ID | Test Scenario              | Test Data / Input    | Expected Result                                    |
| :----------- | :------------------------- | :------------------- | :------------------------------------------------- |
| TC-EMP-009   | Verify View Applicants     | `jobId`: 101         | List of applicants returned with profiles          |
| TC-EMP-010   | Verify Shortlist Applicant | `applicationId`: 500 | Status updated to "SHORTLISTED", notification sent |
| TC-EMP-011   | Verify Reject Applicant    | `applicationId`: 500 | Status updated to "REJECTED", notification sent    |
| TC-EMP-012   | Verify View Resume         | `applicationId`: 500 | Valid Signed URL for resume returned               |

### 3.4 Employer Chat

| Test Case ID    | Test Scenario                    | Test Data / Input                | Expected Result                          |
| :-------------- | :------------------------------- | :------------------------------- | :--------------------------------------- |
| TC-EMP-CHAT-001 | Verify Initiate Conversation     | `applicationId`: 500             | New conversation created with applicant  |
| TC-EMP-CHAT-002 | Verify Chat with Job Seeker      | `conversationId`: 5, `msg`: "Hi" | Message sent to job seeker, response 201 |
| TC-EMP-CHAT-003 | Verify Invalid Conversation Init | `applicationId`: 999 (Invalid)   | Error 404, "Application not found"       |

### 3.5 Statistics & Analytics

| Test Case ID | Test Scenario              | Test Data / Input     | Expected Result                                           |
| :----------- | :------------------------- | :-------------------- | :-------------------------------------------------------- |
| TC-STAT-001  | Verify Dashboard Stats     | `companyId`: 50       | Returns correct counts (Active Jobs: 2, Applicants: 10)   |
| TC-STAT-002  | Verify Job Statistics Page | `jobId`: 101          | Returns views, clicks, application count for specific job |
| TC-STAT-003  | Verify Empty Stats         | `companyId`: 51 (New) | Returns all counts as 0                                   |

### 3.6 Appeals

| Test Case ID | Test Scenario               | Test Data / Input                    | Expected Result                  |
| :----------- | :-------------------------- | :----------------------------------- | :------------------------------- |
| TC-APPL-001  | Verify Submit Appeal        | `jobId`: 101, `reason`: "Not a scam" | Appeal created, status "PENDING" |
| TC-APPL-002  | Verify Appeal Non-Owned Job | `jobId`: 202 (Other Company)         | Error 403, "Unauthorized"        |

## 4. Admin Features

### 4.1 Moderation

| Test Case ID | Test Scenario       | Test Data / Input                          | Expected Result                                     |
| :----------- | :------------------ | :----------------------------------------- | :-------------------------------------------------- |
| TC-ADM-001   | Verify Approve Job  | `jobId`: 101                               | Job status updated to "APPROVED", employer notified |
| TC-ADM-002   | Verify Reject Job   | `jobId`: 101, `reason`: "Policy violation" | Job status updated to "REJECTED", employer notified |
| TC-ADM-003   | Verify Suspend User | `userId`: 10                               | User `isActive` set to false, token invalidated     |

## 5. System Services

### 5.1 File & Translation

| Test Case ID | Test Scenario               | Test Data / Input                   | Expected Result                   |
| :----------- | :-------------------------- | :---------------------------------- | :-------------------------------- |
| TC-SYS-001   | Verify S3 Signed URL        | `key`: "logos/abc.png"              | Valid URL with signature returned |
| TC-SYS-002   | Verify Translation Fallback | `text_ms`: null, `text_en`: "Hello" | Returns "Hello" when MS requested |
