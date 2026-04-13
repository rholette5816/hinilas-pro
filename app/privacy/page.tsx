"use client";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: "#0B1120" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: April 2025</p>
        </div>

        <div className="space-y-8 text-gray-400 text-sm leading-relaxed">

          <section>
            <h2 className="text-white font-semibold text-base mb-2">1. Introduction</h2>
            <p>Hinilas Pro ("we", "our", or "us") operates hinilas.pro. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and email address from your Google or Facebook account when you sign in</li>
              <li>Profile picture from your social login provider</li>
              <li>Usage data such as features used, credits consumed, and content generated</li>
              <li>Feedback and messages you submit through the platform</li>
              <li>Payment receipts you upload for credit top-ups</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and operate the Hinilas Pro platform</li>
              <li>To manage your account, credits, and subscription</li>
              <li>To send important updates about your account or transactions</li>
              <li>To improve our platform based on feedback</li>
              <li>To display your name and profile picture in community features</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">4. Data Storage</h2>
            <p>Your data is stored securely using Supabase, a cloud database provider. Payment screenshots are stored in Supabase Storage. We do not store your social media passwords.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong className="text-gray-300">Google OAuth</strong> — for sign-in</li>
              <li><strong className="text-gray-300">Facebook Login</strong> — for sign-in</li>
              <li><strong className="text-gray-300">Supabase</strong> — for database and storage</li>
              <li><strong className="text-gray-300">Resend</strong> — for transactional emails</li>
              <li><strong className="text-gray-300">Vercel</strong> — for hosting</li>
              <li><strong className="text-gray-300">OpenAI</strong> — for AI-generated content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">6. Data Sharing</h2>
            <p>We do not sell, trade, or share your personal data with third parties for marketing purposes. Data is only shared with the service providers listed above to operate the platform.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">7. Your Rights</h2>
            <p>You may request to access, update, or delete your personal data at any time by contacting us. You can also delete your account which will remove all associated data.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">8. Cookies</h2>
            <p>We use session cookies to keep you logged in. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">9. Children's Privacy</h2>
            <p>Hinilas Pro is not intended for users under the age of 13. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="text-white font-semibold text-base mb-2">10. Contact</h2>
            <p>For any privacy-related questions or requests, contact us at:</p>
            <p className="mt-1 text-white">support@hinilas.pro</p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-gray-600 text-xs text-center">© 2025 Hinilas Pro — Basta Mag Ads Hilas</p>
        </div>
      </div>
    </div>
  );
}
