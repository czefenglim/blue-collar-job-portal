import re
import os

file_path = r'c:\Users\czefe\blue-collar-job-portal\docs\use-case-specifications.md'

new_use_case = """## 8. Onboarding

**1. Use Case Name**
Onboarding

**2. Description (Purpose)**
This use case guides a new Job Seeker through setting up their profile, including personal details, industry preferences, and resume generation, to ensure they are ready to apply for jobs.

**3. Primary Actor**
Job Seeker

**4. Supporting Actors**
System

**5. Stakeholders and Interests**

- **Job Seeker:** Wants to quickly set up their profile to start applying.
- **Employer:** Wants candidates to have complete profiles for better evaluation.
- **System:** Needs to collect user data to provide relevant job recommendations.

**6. Preconditions**

- Job Seeker has successfully registered and verified their account.
- Job Seeker has not completed the onboarding process.

**7. Postconditions**

- **Success:** Job Seeker profile is complete, preferences are set, resume is generated, and onboarding status is finalized.
- **Failure:** Onboarding is incomplete; user stays in the onboarding flow.

**8. Trigger**
Job Seeker completes account verification or logs in for the first time.

**9. Main Success Scenario (Standard Flow)**

1.  System initiates the Onboarding Flow.
2.  Job Seeker completes Personal Profile (Name, Contact, Address).
3.  System validates and saves profile data.
4.  Job Seeker selects Preferred Industries.
5.  System saves preferences.
6.  Job Seeker initiates Resume Generation.
7.  System generates resume (AI/Template) and saves it.
8.  System displays a summary of the provided information.
9.  Job Seeker reviews the information.
10. Job Seeker confirms and clicks "Continue".
11. System finalizes onboarding status.
12. System redirects Job Seeker to the Dashboard.

**10. Alternative Flows**

- **A1: Skip Steps**
  1.  At steps 2, 4, or 6, the Job Seeker chooses to skip the step.
  2.  System proceeds to the next step without saving data for that section.
- **A2: Edit Information**
  1.  At step 9, Job Seeker chooses to edit information.
  2.  Flow returns to the relevant section (Step 2, 4, or 6).

**11. Exception Flows**

- **E1: Validation Error:** System shows error message; user corrects input.
- **E2: Generation Failure:** Resume generation fails; system offers retry.

---

"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Split content by lines
lines = content.split('\n')

new_lines = []
inserted = False
current_section_num = 0

# Regex to match section headers like "## 7. Sign Up / Login"
section_pattern = re.compile(r'^## (\d+)\. (.+)')

for line in lines:
    match = section_pattern.match(line)
    if match:
        num = int(match.group(1))
        title = match.group(2)
        
        # Insert before section 8
        if num == 8 and not inserted:
            new_lines.append(new_use_case.strip())
            new_lines.append('')
            new_lines.append('')
            inserted = True
            current_section_num = 9 # The new one is 8, so this one becomes 9
            new_lines.append(f"## {current_section_num}. {title}")
        elif inserted:
            current_section_num += 1
            new_lines.append(f"## {current_section_num}. {title}")
        else:
            new_lines.append(line)
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))

print("Successfully updated use-case-specifications.md")
