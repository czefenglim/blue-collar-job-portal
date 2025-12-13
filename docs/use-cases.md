# Use Case Diagram and Roles

This document summarizes the main use cases in the Blue‑Collar Job Portal and provides a diagram source you can render.

## Actors
- Job Seeker
- Employer
- Admin

## Key Use Cases

### Job Seeker
- Sign up / Login
- Browse and search jobs
- Save jobs
- Apply to jobs
- Chat with employers
- Manage profile and preferences
- View notifications
- Write reviews
- Change language

### Employer
- Sign up / Login
- Create and manage job posts
- Manage company profile
- View applicants
- Chat with job seekers
- Manage subscription and make payments
- Respond to reviews
- View notifications
- Change language

### Admin
- Manage users, jobs, companies, industries
- Moderate reviews and handle reports/appeals
- Manage subscriptions and oversee payments
- Language and localization administration

## Diagram Source (PlantUML)

The diagram is in `docs/use-case-diagram.puml`. You can render it using any PlantUML tool or VS Code extension.

```plantuml
@startuml
left to right direction
actor "Job Seeker" as JS
actor "Employer" as EMP
actor "Admin" as ADM

rectangle "Blue-Collar Job Portal" {
  (Sign Up / Login) as UC_Auth
  (Browse & Search Jobs) as UC_Browse
  (Save Jobs) as UC_Save
  (Apply to Jobs) as UC_Apply
  (Chat) as UC_Chat
  (Manage Profile) as UC_Profile
  (View Notifications) as UC_Notify
  (Write Reviews) as UC_WriteReview
  (Change Language / Preferences) as UC_Prefs

  (Create / Manage Job Posts) as UC_JobManage
  (Manage Company Profile) as UC_Company
  (View Applicants) as UC_ViewApps
  (Manage Subscription) as UC_Sub
  (Make Payments) as UC_Pay
  (Respond to Reviews) as UC_RespondReview

  (Manage Users) as UC_AdminUsers
  (Manage Jobs) as UC_AdminJobs
  (Manage Companies) as UC_AdminCompanies
  (Manage Industries) as UC_AdminIndustries
  (Moderate Reviews & Reports) as UC_AdminReviews
  (Manage Subscriptions) as UC_AdminSubs
  (Oversee Payments) as UC_AdminPayments
  (Language & Localization) as UC_AdminLang
}

JS --> UC_Auth
JS --> UC_Browse
JS --> UC_Save
JS --> UC_Apply
JS --> UC_Chat
JS --> UC_Profile
JS --> UC_Notify
JS --> UC_WriteReview
JS --> UC_Prefs

EMP --> UC_Auth
EMP --> UC_JobManage
EMP --> UC_Company
EMP --> UC_ViewApps
EMP --> UC_Chat
EMP --> UC_Sub
EMP --> UC_Pay
EMP --> UC_RespondReview
EMP --> UC_Notify
EMP --> UC_Prefs

ADM --> UC_AdminUsers
ADM --> UC_AdminJobs
ADM --> UC_AdminCompanies
ADM --> UC_AdminIndustries
ADM --> UC_AdminReviews
ADM --> UC_AdminSubs
ADM --> UC_AdminPayments
ADM --> UC_AdminLang

UC_Apply ..> UC_Notify : <<triggers>>
UC_JobManage ..> UC_Notify : <<triggers>>
UC_Sub ..> UC_Pay : <<include>>
UC_WriteReview ..> UC_RespondReview : <<extends>>
@enduml
```

## Rendering Options
- VS Code: install "PlantUML" extension, open `docs/use-case-diagram.puml`, and preview.
- Online: paste the contents into https://www.plantuml.com/plantuml/.
- CLI: use `java -jar plantuml.jar docs/use-case-diagram.puml` to generate an image.

