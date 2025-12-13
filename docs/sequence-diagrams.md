# Sequence Diagrams

PlantUML sequence diagrams for each use case in the Blue‑Collar Job Portal.

## Common Use Cases
- `docs/sequence-auth.puml` — Sign Up and Login (User & Employer).
- `docs/sequence-chat.puml` — Real‑time chat between Job Seeker and Employer.
- `docs/sequence-notify.puml` — View and manage notifications.
- `docs/sequence-prefs.puml` — Manage preferences (Language, Notification settings).

## Job Seeker Use Cases
- `docs/sequence-browse.puml` — Browse and search for jobs.
- `docs/sequence-save.puml` — Save and unsave jobs.
- `docs/sequence-apply.puml` — Apply for a job.
- `docs/sequence-profile.puml` — Manage job seeker profile and resume.
- `docs/sequence-write-review.puml` — Write a review for a company.

## Employer Use Cases
- `docs/sequence-job-manage.puml` — Create, edit, and close job posts.
- `docs/sequence-company.puml` — Manage company profile and details.
- `docs/sequence-view-apps.puml` — View and manage applicants for a job.
- `docs/sequence-sub.puml` — Manage subscription plans.
- `docs/sequence-pay.puml` — Process payments.
- `docs/sequence-respond-review.puml` — Respond to company reviews.

## Admin Use Cases
- `docs/sequence-admin-users.puml` — Manage users (suspend, ban, edit).
- `docs/sequence-admin-jobs.puml` — Manage job postings (approve, reject).
- `docs/sequence-admin-companies.puml` — Verify and manage companies.
- `docs/sequence-admin-industries.puml` — Manage industry categories.
- `docs/sequence-admin-reviews.puml` — Moderate reviews and reports.
- `docs/sequence-admin-subs.puml` — Manage subscription plans.
- `docs/sequence-admin-payments.puml` — View payment history and process refunds.
- `docs/sequence-admin-lang.puml` — Manage languages and translations.

## Render Instructions
- VS Code: install "PlantUML", open any `.puml` and preview.
- Online: paste contents into https://www.plantuml.com/plantuml/.
- CLI: `java -jar plantuml.jar docs/sequence-auth.puml` (repeat for others).

## Notes
- Diagrams map to codebase controllers and services.
- `Backend API` generally represents the route handlers and controllers.
- `Database` represents interactions via Prisma/ORM.
