import React from "react";
import { Shield, FileText, AlertTriangle } from "lucide-react";
import { SeoMetaTags } from "../../components/Seo/SeoMetaTags";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content:
      "By accessing or using EduMind, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services. We reserve the right to update or modify these terms at any time, and your continued use constitutes acceptance of any changes.",
  },
  {
    id: "account-terms",
    title: "2. Account Terms",
    content:
      "You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information when creating an account. You must notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms.",
  },
  {
    id: "course-enrollment",
    title: "3. Course Enrollment",
    content:
      "Enrollment in a course grants you a non-exclusive, non-transferable license to access the course content for your personal educational purposes. You may not share your account or course access with others. Course content, including videos, materials, and assessments, is provided for educational use only and may not be redistributed or resold.",
  },
  {
    id: "payments-refunds",
    title: "4. Payments & Refunds",
    content:
      "All payments are processed securely through our payment partners. Prices are listed in the currency specified at checkout and are subject to applicable taxes. Refund policies are disclosed at the time of purchase and vary by course. We reserve the right to change pricing for future enrollments with reasonable notice.",
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual Property",
    content:
      "All course materials, including video content, text, graphics, and assessments, are the intellectual property of EduMind or our instructors. You may not reproduce, distribute, modify, or create derivative works without explicit written permission. EduMind's name, logo, and branding are trademarks and may not be used without authorization.",
  },
  {
    id: "certificate-of-completion",
    title: "6. Certificate of Completion",
    content:
      "Upon successful completion of a course, EduMind may issue a certificate of completion. EduMind certificates of completion are not accredited degrees, diplomas, or professional certifications. They represent skills and knowledge demonstrated by completing course requirements. Certificates should not be used for formal academic credit or professional licensure purposes. EduMind makes no guarantee that any certificate will be accepted by any third-party institution, employer, or licensing body.",
  },
  {
    id: "prohibited-conduct",
    title: "7. Prohibited Conduct",
    content:
      "You agree not to: (a) use the platform for any unlawful purpose; (b) harass, abuse, or harm other users or instructors; (c) upload malicious code or interfere with platform operations; (d) attempt to access another user's account without authorization; (e) use automated tools to scrape or extract data from the platform; (f) engage in any activity that disrupts the learning experience of others.",
  },
  {
    id: "limitation-liability",
    title: "8. Limitation of Liability",
    content:
      "EduMind provides its platform and content on an \"as is\" basis without warranties of any kind, either express or implied. To the maximum extent permitted by law, EduMind shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform, including but not limited to loss of data, learning progress, or opportunities.",
  },
  {
    id: "changes-to-terms",
    title: "9. Changes to Terms",
    content:
      "We may revise these Terms of Service at any time. Changes will be effective immediately upon posting. We will notify users of material changes via email or platform notification. Your continued use of EduMind after changes take effect constitutes your acceptance of the revised terms. We encourage you to review these terms periodically.",
  },
  {
    id: "contact",
    title: "10. Contact",
    content:
      "If you have any questions, concerns, or requests regarding these Terms of Service, please contact us through our support channels or by email at support@edumind.nguyenloc.dev. We aim to respond to all inquiries within two business days.",
  },
];

const TermsPage: React.FC = () => {
  return (
    <>
      <SeoMetaTags
        title="Terms of Service"
        description="EduMind Terms of Service — learn about the rules, guidelines, and policies that govern your use of our AI-powered learning platform."
        noIndex
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-2xl mb-6">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Terms of Service
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              These terms govern your use of the EduMind platform. Please read
              them carefully before accessing or using our services.
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Last updated: July 28, 2026
            </p>
          </div>

          {/* Certificate Disclaimer Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-10">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 mb-2">
                  Important Disclaimer — Certificates of Completion
                </h3>
                <p className="text-amber-700 text-sm leading-relaxed">
                  EduMind certificates of completion are not accredited degrees,
                  diplomas, or professional certifications. They represent skills
                  and knowledge demonstrated by completing course requirements.
                  Certificates should not be used for formal academic credit or
                  professional licensure purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
            {sections.map((section) => (
              <div
                key={section.id}
                id={section.id}
                className="px-6 sm:px-8 py-6 sm:py-8"
              >
                <div className="flex items-start gap-3">
                  {section.id === "certificate-of-completion" && (
                    <div className="flex-shrink-0 mt-1">
                      <Shield className="w-5 h-5 text-blue-600" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      {section.title}
                    </h2>
                    <p className="text-gray-600 leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default TermsPage;
