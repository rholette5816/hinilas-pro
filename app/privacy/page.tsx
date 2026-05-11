"use client";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-12" style={{ background: "#F0F2F5" }}>
      <div className="mx-auto max-w-2xl rounded-2xl border bg-white p-8" style={{ borderColor: "#E4E6EB" }}>
        <div className="mb-10">
          <h1 className="mb-2 text-3xl font-black text-slate-950">Privacy Policy</h1>
          <p className="text-sm text-slate-500">Last updated: April 2025</p>
        </div>

        <div className="space-y-8 text-sm leading-7 text-slate-600">
          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">1. Introduction</h2>
            <p>Hinilas Pro (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates hinilas.pro. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">2. Information We Collect</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Name and email address from your Google or Facebook account when you sign in</li>
              <li>Profile picture from your social login provider</li>
              <li>Usage data such as features used, credits consumed, and content generated</li>
              <li>Feedback and messages you submit through the platform</li>
              <li>Payment receipts you upload for credit top-ups</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">3. How We Use Your Information</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>To provide and operate the Hinilas Pro platform</li>
              <li>To manage your account, credits, and subscription</li>
              <li>To send important updates about your account or transactions</li>
              <li>To improve our platform based on feedback</li>
              <li>To display your name and profile picture in community features</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">4. Data Storage</h2>
            <p>Your data is stored securely using Supabase, a cloud database provider. Payment screenshots are stored in Supabase Storage. We do not store your social media passwords.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">5. Third-Party Services</h2>
            <p>We use the following third-party services:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong className="text-slate-900">Google OAuth</strong> - for sign-in</li>
              <li><strong className="text-slate-900">Facebook Login</strong> - for sign-in</li>
              <li><strong className="text-slate-900">Supabase</strong> - for database and storage</li>
              <li><strong className="text-slate-900">Resend</strong> - for transactional emails</li>
              <li><strong className="text-slate-900">Vercel</strong> - for hosting</li>
              <li><strong className="text-slate-900">OpenAI</strong> - for AI-generated content</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">6. Data Sharing</h2>
            <p>We do not sell, trade, or share your personal data with third parties for marketing purposes. Data is only shared with the service providers listed above to operate the platform.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">7. Your Rights</h2>
            <p>You may request to access, update, or delete your personal data at any time by contacting us. You can also delete your account which will remove all associated data.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">8. Cookies</h2>
            <p>We use session cookies to keep you logged in. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">9. Children&apos;s Privacy</h2>
            <p>Hinilas Pro is not intended for users under the age of 13. We do not knowingly collect data from children.</p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-bold text-slate-900">10. Contact</h2>
            <p>For any privacy-related questions or requests, contact us at:</p>
            <p className="mt-1 font-semibold text-slate-900">support@hinilas.pro</p>
          </section>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8">
          <p className="text-center text-xs text-slate-500">2026 Hinilas Pro - Basta Mag Ads Hilas</p>
        </div>
      </div>
    </div>
  );
}
