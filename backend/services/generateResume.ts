import PDFDocument from 'pdfkit';
import axios from 'axios';
import { getSignedDownloadUrl } from './s3Service';
import { SupportedLang, labelEnum } from '../utils/enumLabels';

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
  refinedAnswers: RefinedAnswer[],
  lang: SupportedLang = 'en'
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 0, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const age = calculateAge(profile.dateOfBirth);

      // Translations for section labels
      const LABELS: Record<SupportedLang, Record<string, string>> = {
        en: {
          contact: 'Contact',
          skills: 'Skills',
          profileSummary: 'Profile Summary',
          experience: 'Experience',
          workExperience: 'Work Experience',
          educationLevel: 'Education Level',
          achievements: 'Achievements',
          references: 'References',
          age: 'Age',
        },
        ms: {
          contact: 'Hubungi',
          skills: 'Kemahiran',
          profileSummary: 'Ringkasan Profil',
          experience: 'Pengalaman',
          workExperience: 'Pengalaman Kerja',
          educationLevel: 'Tahap Pendidikan',
          achievements: 'Pencapaian',
          references: 'Rujukan',
          age: 'Umur',
        },
        zh: {
          contact: '联系方式',
          skills: '技能',
          profileSummary: '个人简介',
          experience: '经历',
          workExperience: '工作经历',
          educationLevel: '教育程度',
          achievements: '成就',
          references: '推荐人',
          age: '年龄',
        },
        ta: {
          contact: 'தொடர்பு',
          skills: 'திறன்கள்',
          profileSummary: 'சுயவிவர சுருக்கம்',
          experience: 'அனுபவம்',
          workExperience: 'வேலை அனுபவம்',
          educationLevel: 'கல்வி நிலை',
          achievements: 'சாதனைகள்',
          references: 'குறிப்புகள்',
          age: 'வயது',
        },
      };

      // Translate gender label if present
      const genderLabel = labelEnum('Gender', profile.gender, lang);

      // --- Colors ---
      const sidebarColor = '#667eea'; // Simplified to solid color for PDFKit (gradients are harder)
      const sidebarTextColor = '#FFFFFF';
      const mainTextColor = '#2d3748';
      const headingColor = '#1a202c';
      const accentColor = '#667eea';

      // --- Layout Constants ---
      const sidebarWidth = 200;
      const contentPadding = 40;
      const contentWidth = doc.page.width - sidebarWidth - contentPadding * 2;
      const startXContent = sidebarWidth + contentPadding;

      // 1. Draw Sidebar Background
      doc.rect(0, 0, sidebarWidth, doc.page.height).fill(sidebarColor);

      // 2. Profile Picture
      let yPos = 40;
      if (profile.profilePicture) {
        try {
          let profileImageUrl = profile.profilePicture.startsWith('http')
            ? profile.profilePicture
            : await getSignedDownloadUrl(profile.profilePicture, 600);

          const response = await axios.get(profileImageUrl, {
            responseType: 'arraybuffer',
          });
          const imageBuffer = Buffer.from(response.data);

          doc.save();
          doc.circle(sidebarWidth / 2, yPos + 60, 60).clip();
          doc.image(imageBuffer, sidebarWidth / 2 - 60, yPos, {
            width: 120,
            height: 120,
          });
          doc.restore();
          yPos += 140;
        } catch (error) {
          console.error('Error fetching profile image:', error);
          // Fallback or skip image
        }
      } else {
        yPos += 20; // Some padding if no image
      }

      // 3. Sidebar Content (Name, Personal Info, Contact, Skills)
      doc.fillColor(sidebarTextColor);
      doc.font('Helvetica-Bold').fontSize(18);

      // Name (centered in sidebar)
      doc.text(profile.fullName.toUpperCase(), 20, yPos, {
        width: sidebarWidth - 40,
        align: 'center',
      });
      yPos +=
        doc.heightOfString(profile.fullName.toUpperCase(), {
          width: sidebarWidth - 40,
        }) + 10;

      // Personal Info (Gender, Age)
      doc.font('Helvetica').fontSize(10);
      let personalInfoText = '';
      if (genderLabel) personalInfoText += `${genderLabel}\n`;
      if (age) personalInfoText += `${LABELS[lang].age}: ${age}`;

      if (personalInfoText) {
        doc.text(personalInfoText, 20, yPos, {
          width: sidebarWidth - 40,
          align: 'center',
        });
        yPos +=
          doc.heightOfString(personalInfoText, { width: sidebarWidth - 40 }) +
          30;
      } else {
        yPos += 20;
      }

      // Contact Section
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text(LABELS[lang].contact, 20, yPos);
      yPos += 20;

      doc.font('Helvetica').fontSize(10);
      doc.text(profile.email, 20, yPos, { width: sidebarWidth - 40 });
      yPos +=
        doc.heightOfString(profile.email, { width: sidebarWidth - 40 }) + 5;

      doc.text(profile.phone, 20, yPos, { width: sidebarWidth - 40 });
      yPos +=
        doc.heightOfString(profile.phone, { width: sidebarWidth - 40 }) + 30;

      // Skills Section
      if (profile.skills.length > 0) {
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(LABELS[lang].skills, 20, yPos);
        yPos += 20;

        doc.font('Helvetica').fontSize(10);
        profile.skills.forEach((skill) => {
          doc.text(`• ${skill.name}`, 20, yPos, { width: sidebarWidth - 40 });
          yPos +=
            doc.heightOfString(`• ${skill.name}`, {
              width: sidebarWidth - 40,
            }) + 5;
        });
      }

      // 4. Main Content
      let yContent = 40;
      doc.fillColor(mainTextColor);

      // Helper to draw section
      const drawSection = (title: string, content: string) => {
        if (!content) return;

        // Check for page break
        if (yContent + 100 > doc.page.height) {
          doc.addPage();
          // Redraw sidebar on new page
          doc.rect(0, 0, sidebarWidth, doc.page.height).fill(sidebarColor);
          yContent = 40;
        }

        doc.fillColor(headingColor);
        doc.font('Helvetica-Bold').fontSize(18);
        doc.text(title.toUpperCase(), startXContent, yContent);

        yContent += 25;

        // Underline
        doc
          .moveTo(startXContent, yContent)
          .lineTo(startXContent + 50, yContent)
          .lineWidth(3)
          .strokeColor(accentColor)
          .stroke();
        yContent += 15;

        doc.fillColor(mainTextColor);
        doc.font('Helvetica').fontSize(12);
        doc.text(content, startXContent, yContent, {
          width: contentWidth,
          align: 'justify',
        });

        yContent += doc.heightOfString(content, { width: contentWidth }) + 30;
      };

      // Profile Summary
      const summary = refinedAnswers.find(
        (a) => a.questionId === 'summary'
      )?.answer;
      if (summary) {
        drawSection(LABELS[lang].profileSummary, summary);
      }

      // Experience
      const experience = refinedAnswers.find(
        (a) => a.questionId === 'experience'
      )?.answer;
      if (experience) {
        drawSection(LABELS[lang].experience, experience);
      }

      // Other Sections
      const otherAnswers = refinedAnswers.filter(
        (a) =>
          ![
            'summary',
            'experience',
            'hasWorkExperience',
            'hasAchievements',
            'hasReferences',
            'hasEducation',
          ].includes(a.questionId)
      );

      otherAnswers.forEach((answer) => {
        const titleMap: Record<string, string> = {
          workExperience: LABELS[lang].workExperience,
          educationLevel: LABELS[lang].educationLevel,
          achievements: LABELS[lang].achievements,
          references: LABELS[lang].references,
        };

        const sectionTitle =
          titleMap[answer.questionId] ||
          answer.questionId.charAt(0).toUpperCase() +
            answer.questionId.slice(1);

        drawSection(sectionTitle, answer.answer);
      });

      doc.end();
    } catch (error) {
      console.error('Error generating PDF with PDFKit:', error);
      reject(error);
    }
  });
}
