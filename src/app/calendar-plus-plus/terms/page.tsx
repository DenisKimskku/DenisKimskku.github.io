import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service - calendar++',
  description: 'Terms of Service for calendar++ macOS application',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <Link href="/calendar-plus-plus" className="text-[var(--color-accent)] hover:underline mb-8 inline-block">
          ← Back to calendar++
        </Link>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Last updated: December 21, 2025</p>

        <div className="article-content max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-[var(--color-text)] mb-4">
              By downloading, installing, or using calendar++ (the "Application"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">License</h2>
            <p className="text-[var(--color-text)] mb-4">
              calendar++ grants you a revocable, non-exclusive, non-transferable, limited license to download, install, and use the Application for your personal, non-commercial purposes strictly in accordance with these Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Permitted Use</h2>
            <p className="text-[var(--color-text)] mb-4">You may use calendar++ to:</p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>View and manage your calendar events</li>
              <li>Integrate with your Google Calendar account</li>
              <li>Access features provided by the Application</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Prohibited Use</h2>
            <p className="text-[var(--color-text)] mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Modify, adapt, or hack the Application</li>
              <li>Reverse engineer, decompile, or disassemble the Application</li>
              <li>Use the Application for any illegal or unauthorized purpose</li>
              <li>Violate any laws in your jurisdiction</li>
              <li>Remove any copyright or proprietary notices</li>
              <li>Use the Application in any way that could damage, disable, or impair the service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Google Calendar Integration</h3>
            <p className="text-[var(--color-text)] mb-4">
              If you choose to integrate with Google Calendar, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>You must comply with Google's Terms of Service</li>
              <li>The integration depends on Google's API availability</li>
              <li>We are not responsible for Google service interruptions</li>
              <li>You can disconnect at any time through app settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Disclaimer of Warranties</h2>
            <p className="text-[var(--color-text)] mb-4">
              THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Implied warranties of merchantability</li>
              <li>Fitness for a particular purpose</li>
              <li>Non-infringement</li>
            </ul>
            <p className="text-[var(--color-text)] mb-4">
              We do not warrant that the Application will be uninterrupted, error-free, or secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Limitation of Liability</h2>
            <p className="text-[var(--color-text)] mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL CALENDAR++ OR ITS DEVELOPERS BE LIABLE FOR ANY:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, use, or goodwill</li>
              <li>Service interruption</li>
              <li>Computer damage or system failure</li>
            </ul>
            <p className="text-[var(--color-text)] mb-4">
              This limitation applies whether based on warranty, contract, tort, or any other legal theory.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Updates and Modifications</h2>
            <p className="text-[var(--color-text)] mb-4">
              We reserve the right to:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Modify or discontinue the Application at any time</li>
              <li>Update these Terms at any time</li>
              <li>Change features or functionality</li>
            </ul>
            <p className="text-[var(--color-text)] mb-4">
              Continued use of the Application after changes constitutes acceptance of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Privacy</h2>
            <p className="text-[var(--color-text)] mb-4">
              Your use of the Application is also governed by our <Link href="/calendar-plus-plus/privacy" className="text-[var(--color-accent)] hover:underline">Privacy Policy</Link>. Please review it to understand our data practices.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Open Source</h2>
            <p className="text-[var(--color-text)] mb-4">
              calendar++ is open source software available on <a href="https://github.com/DenisKimskku/Calendarpp" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>. Contributions and modifications are subject to the repository's license terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Termination</h2>
            <p className="text-[var(--color-text)] mb-4">
              We may terminate or suspend your access to the Application immediately, without prior notice, for any reason, including breach of these Terms.
            </p>
            <p className="text-[var(--color-text)] mb-4">
              You may terminate these Terms by uninstalling the Application and ceasing all use.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p className="text-[var(--color-text)] mb-4">
              These Terms shall be governed by and construed in accordance with the laws of South Korea, without regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Information</h2>
            <p className="text-[var(--color-text)] mb-4">
              If you have any questions about these Terms, please contact us:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Email: kor8821@naver.com</li>
              <li>GitHub: <a href="https://github.com/DenisKimskku/Calendarpp" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">github.com/DenisKimskku/Calendarpp</a></li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Severability</h2>
            <p className="text-[var(--color-text)] mb-4">
              If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that these Terms will otherwise remain in full force and effect.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[var(--color-border)]">
          <Link href="/calendar-plus-plus" className="text-[var(--color-accent)] hover:underline">
            ← Back to calendar++
          </Link>
        </div>
      </div>
    </div>
  )
}
