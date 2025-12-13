import re

file_path = r"c:\Users\czefe\blue-collar-job-portal\docs\use-case-specifications.md"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the new section content
new_section = """
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
"""

# Find the insertion point (before ## 18. Create Job Post)
match = re.search(r"^## 18\.", content, re.MULTILINE)
if not match:
    print("Could not find Section 18.")
    exit(1)

insert_index = match.start()

# Split content
before = content[:insert_index]
after = content[insert_index:]

# Renumber sections in 'after'
# We need to increment all section numbers starting from 18
def replace_header(m):
    num = int(m.group(1))
    return f"## {num + 1}."

# Use regex to find "## N." where N >= 18
# Note: re.sub with a function receives the match object
after_renumbered = re.sub(r"^## (\d+)\.", lambda m: f"## {int(m.group(1)) + 1}.", after, flags=re.MULTILINE)

# Combine
new_content = before + new_section + after_renumbered

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully inserted Employer Onboarding and renumbered sections.")
