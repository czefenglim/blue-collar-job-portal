# Entity Relationship Diagram (ERD)

This ERD reflects the current Prisma schema in `backend/prisma/schema.prisma`.

## Render Instructions
- VS Code: install "PlantUML", open `docs/erd.puml`, and preview.
- Online: paste `docs/erd.puml` content into https://www.plantuml.com/plantuml/.
- CLI: `java -jar plantuml.jar docs/erd.puml` to generate an image.

## Highlights
- One‑to‑one: `User ↔ UserProfile`, `User ↔ Company`, `Company ↔ CompanyVerification`, `JobApplication ↔ Conversation`, `JobApplication ↔ JobOffer`, `Company ↔ Subscription`.
- One‑to‑many: `Company → Job`, `Industry → Company`, `Industry → Job`, `User → JobApplication/SavedJob/Notification/ChatMessage/Review/Report/PasswordResetOTP/ResumeAnswer`, `Subscription → Invoice`, `Conversation → ChatMessage`.
- Many‑to‑many via link tables: `UserProfile ↔ Industry` through `UserIndustry`, `UserProfile ↔ language` through `UserLanguage`, `UserProfile ↔ skill` through `UserSkill`.
- Moderation flows: `Report` connects `User` (reporter) and `Job`, with `Appeal` linking to `Report` and `User` (employer/reviewer). Separate `JobAppeal` links `Job` and `User` (employer/reviewer).
- Chat: `Conversation` ties an application (`JobApplication`) with `employer` and `jobSeeker` users, plus the related `Job`; messages live in `ChatMessage`.

## File
- Diagram source: `docs/erd.puml`

