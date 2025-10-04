import puppeteer from 'puppeteer';

interface Skill {
  id: number;
  name: string;
}

interface Profile {
  fullName: string;
  email: string;
  phone: string;
  skills: {
    id: number;
    name: string;
  }[];
}

interface RefinedAnswer {
  questionId: string;
  answer: string;
}

export async function generateResumePDF(
  profile: Profile,
  refinedAnswers: RefinedAnswer[]
): Promise<Buffer> {
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
        
        /* Sidebar with accent color */
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
        
        /* Main content area */
        .main-content {
          flex: 1;
          padding: 40px 50px;
          background: #ffffff;
        }
        
        /* Header section */
        .header {
          margin-bottom: 20px;
        }
        
        .name {
          font-size: 42px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
          color: white;
          text-transform: uppercase;
        }
        
        .title {
          font-size: 16px;
          font-weight: 400;
          opacity: 0.95;
          margin-bottom: 30px;
          letter-spacing: 0.5px;
        }
        
        /* Contact info in sidebar */
        .contact-section {
          margin-top: 40px;
        }
        
        .contact-title {
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 20px;
          opacity: 0.9;
        }
        
        .contact-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px;
          font-size: 13px;
          line-height: 1.5;
        }
        
        .contact-icon {
          width: 18px;
          height: 18px;
          margin-right: 12px;
          flex-shrink: 0;
          opacity: 0.9;
        }
        
        .contact-text {
          word-break: break-word;
        }
        
        /* Skills section in sidebar */
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
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        /* Main content sections */
        .section {
          margin-bottom: 35px;
        }
        
        .section-title {
          font-size: 24px;
          font-weight: 700;
          color: #1a202c;
          margin-bottom: 16px;
          padding-bottom: 8px;
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
        
        /* Profile summary styling */
        .profile-summary {
          font-size: 15px;
          line-height: 1.9;
          color: #2d3748;
          padding: 20px;
          background: #f7fafc;
          border-left: 4px solid #667eea;
          border-radius: 4px;
        }
        
        /* Experience styling */
        .experience-content {
          padding-left: 0;
        }
        
        .experience-content p {
          margin-bottom: 12px;
        }
        
        /* Decorative elements */
        .decorative-line {
          height: 2px;
          background: linear-gradient(90deg, #667eea 0%, transparent 100%);
          margin: 30px 0;
        }
        
        /* Print optimization */
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .container {
            page-break-inside: avoid;
          }
        }
        
        /* Icons as SVG embedded */
        .icon-email::before {
          content: '✉';
          margin-right: 8px;
        }
        
        .icon-phone::before {
          content: '☎';
          margin-right: 8px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Sidebar -->
        <div class="sidebar">
          <div class="header">
            <h1 class="name">${profile.fullName}</h1>
            <p class="title">Professional Resume</p>
          </div>
          
          <!-- Contact Information -->
          <div class="contact-section">
            <h3 class="contact-title">Contact</h3>
            <div class="contact-item">
              <span class="icon-email"></span>
              <span class="contact-text">${profile.email}</span>
            </div>
            <div class="contact-item">
              <span class="icon-phone"></span>
              <span class="contact-text">${profile.phone}</span>
            </div>
          </div>
          
          <!-- Skills -->
          ${
            profile.skills.length > 0
              ? `
          <div class="skills-section">
            <h3 class="skills-title">Skills</h3>
            ${profile.skills
              .map(
                (skill) => `
              <div class="skill-item">${skill.name}</div>
            `
              )
              .join('')}
          </div>
          `
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
              (a) => a.questionId !== 'summary' && a.questionId !== 'experience'
            )
            .map(
              (answer) => `
          <div class="decorative-line"></div>
          <div class="section">
            <h2 class="section-title">${
              answer.questionId.charAt(0).toUpperCase() +
              answer.questionId.slice(1)
            }</h2>
            <div class="section-content">
              ${answer.answer}
            </div>
          </div>
          `
            )
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
