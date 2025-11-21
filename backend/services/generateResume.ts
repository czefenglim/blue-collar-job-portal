import puppeteer from 'puppeteer';

interface Skill {
  id: number;
  name: string;
}

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  dateOfBirth?: string;
  profilePicture?: string;
  skills: {
    id: number;
    name: string;
  }[];
}

interface RefinedAnswer {
  questionId: string;
  answer: string;
}

function calculateAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const diff = Date.now() - dob.getTime();
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
}

export async function generateResumePDF(
  profile: Profile,
  refinedAnswers: RefinedAnswer[]
): Promise<Buffer> {
  const age = calculateAge(profile.dateOfBirth);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #2d3748;
      background: #ffffff;
    }

    .container {
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px 30px;
      position: relative;
    }

    .sidebar::after {
      content: '';
      position: absolute;
      top: 0;
      right: -20px;
      width: 40px;
      height: 100%;
      background: inherit;
      clip-path: polygon(0 0, 0% 100%, 100% 100%);
    }

    .profile-photo {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      margin-bottom: 20px;
      border: 3px solid rgba(255, 255, 255, 0.6);
    }

    .header {
      text-align: center;
      margin-bottom: 25px;
    }

    .name {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 5px;
      color: white;
      text-transform: uppercase;
    }

    .personal-info {
      font-size: 13px;
      opacity: 0.9;
      line-height: 1.4;
    }

    .contact-section {
      margin-top: 30px;
    }

    .contact-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 15px;
      opacity: 0.9;
    }

    .contact-item {
      display: flex;
      align-items: flex-start;
      margin-bottom: 12px;
      font-size: 13px;
      line-height: 1.5;
    }

    .contact-icon {
      width: 18px;
      height: 18px;
      margin-right: 10px;
      opacity: 0.9;
    }

    .skills-section {
      margin-top: 40px;
    }

    .skills-title {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 20px;
      opacity: 0.9;
    }

    .skill-item {
      background: rgba(255, 255, 255, 0.2);
      padding: 8px 14px;
      margin-bottom: 10px;
      border-radius: 6px;
      font-size: 13px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .main-content {
      flex: 1;
      padding: 40px 50px;
      background: #ffffff;
    }

    .section {
      margin-bottom: 35px;
    }

    .section-title {
      font-size: 22px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 16px;
      border-bottom: 3px solid #667eea;
      display: inline-block;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .section-content {
      font-size: 14px;
      line-height: 1.8;
      color: #4a5568;
      text-align: justify;
    }

    .decorative-line {
      height: 2px;
      background: linear-gradient(90deg, #667eea 0%, transparent 100%);
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Sidebar -->
    <div class="sidebar">
      <div class="header">
        ${
          profile.profilePicture
            ? `<img src="${profile.profilePicture}" class="profile-photo" />`
            : ''
        }
        <h1 class="name">${profile.fullName}</h1>
        <p class="personal-info">
          ${profile.gender ? `${profile.gender}<br>` : ''}
          ${age ? `Age: ${age}` : ''}
        </p>
      </div>

      <div class="contact-section">
        <h3 class="contact-title">Contact</h3>
        <div class="contact-item">
          <span class="icon-email"></span>
          <span>${profile.email}</span>
        </div>
        <div class="contact-item">
          <span class="icon-phone"></span>
          <span>${profile.phone}</span>
        </div>
      </div>

      ${
        profile.skills.length > 0
          ? `
      <div class="skills-section">
        <h3 class="skills-title">Skills</h3>
        ${profile.skills
          .map((s) => `<div class="skill-item">${s.name}</div>`)
          .join('')}
      </div>`
          : ''
      }
    </div>
        
        <!-- Main Content -->
        <div class="main-content">
          ${
            refinedAnswers.find((a) => a.questionId === 'summary')?.answer
              ? `
          <div class="section">
            <h2 class="section-title">Profile Summary</h2>
            <div class="profile-summary">
              ${refinedAnswers.find((a) => a.questionId === 'summary')?.answer}
            </div>
          </div>
          `
              : ''
          }
          
          <div class="decorative-line"></div>
          
          ${
            refinedAnswers.find((a) => a.questionId === 'experience')?.answer
              ? `
          <div class="section">
            <h2 class="section-title">Experience</h2>
            <div class="section-content experience-content">
              ${
                refinedAnswers.find((a) => a.questionId === 'experience')
                  ?.answer
              }
            </div>
          </div>
          `
              : ''
          }
          
         ${refinedAnswers
           .filter(
             (a) =>
               ![
                 'summary',
                 'experience',
                 'hasWorkExperience',
                 'hasAchievements',
                 'hasReferences',
                 'hasEducation',
               ].includes(a.questionId)
           )

           .map((answer) => {
             // ✅ Map question IDs to friendly section titles
             const titleMap: Record<string, string> = {
               workExperience: 'Work Experience',
               educationLevel: 'Education Level',
               achievements: 'Achievements', // we show if user actually wrote content
               references: 'References',
             };

             const sectionTitle =
               titleMap[answer.questionId] ||
               answer.questionId.charAt(0).toUpperCase() +
                 answer.questionId.slice(1);

             return `
              <div class="decorative-line"></div>
              <div class="section">
                <h2 class="section-title">${sectionTitle}</h2>
                <div class="section-content">
                  ${answer.answer}
                </div>
              </div>
            `;
           })
           .join('')}

        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfUint8 = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    },
  });

  const pdfBuffer = Buffer.from(pdfUint8);

  await browser.close();

  return pdfBuffer;
}
