import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy - calendar++',
  description: 'Privacy Policy for calendar++ macOS application',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="container-custom py-12 md:py-20">
        <Link href="/calendar-plus-plus" className="text-[var(--color-accent)] hover:underline mb-8 inline-block">
          ← Back to calendar++
        </Link>

        <h1 className="text-4xl font-bold mb-8 text-[var(--color-text)]">Privacy Policy</h1>
        <p className="text-[var(--color-text-secondary)] mb-8">Last updated: December 21, 2025</p>

        <div className="article-content">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4 text-[var(--color-text)]">Introduction</h2>
            <p className="text-[var(--color-text)] mb-4">
              calendar++ ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our macOS application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Local Calendar Data</h3>
            <p className="text-[var(--color-text)] mb-4">
              calendar++ accesses your local macOS Calendar app data to display your events in the menu bar. This data:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Remains on your device only</li>
              <li>Is never transmitted to our servers</li>
              <li>Is never shared with third parties</li>
              <li>Requires your explicit permission via macOS privacy settings</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-6">Google Calendar Data (Optional)</h3>
            <p className="text-[var(--color-text)] mb-4">
              If you choose to connect your Google Calendar:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>We use OAuth 2.0 for secure authentication</li>
              <li>We only request read-only access to your calendars</li>
              <li>OAuth tokens are stored securely in your macOS Keychain</li>
              <li>Calendar data is fetched directly from Google's servers to your device</li>
              <li>We never store your Google credentials or calendar data on our servers</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">How We Use Your Information</h2>
            <p className="text-[var(--color-text)] mb-4">
              The information we access is used solely to:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Display your calendar events in the menu bar</li>
              <li>Provide calendar management features</li>
              <li>Sync events between your local Calendar app and Google Calendar</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Data Storage and Security</h2>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li><strong>Local Storage:</strong> All calendar data remains on your device</li>
              <li><strong>Keychain:</strong> OAuth tokens are stored in macOS Keychain with encryption</li>
              <li><strong>No Cloud Storage:</strong> We do not operate any servers that store your data</li>
              <li><strong>No Analytics:</strong> We do not collect usage analytics or telemetry</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>

            <h3 className="text-xl font-semibold mb-3 mt-6">Google Calendar API</h3>
            <p className="text-[var(--color-text)] mb-4">
              When you connect Google Calendar, we use the Google Calendar API. This connection is governed by:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li><a href="https://policies.google.com/privacy" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a></li>
              <li><a href="https://policies.google.com/terms" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">Google Terms of Service</a></li>
            </ul>
            <p className="text-[var(--color-text)] mb-4">
              calendar++'s use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Your Rights</h2>
            <p className="text-[var(--color-text)] mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li><strong>Revoke Access:</strong> Disconnect Google Calendar at any time through app settings</li>
              <li><strong>Delete Data:</strong> Uninstall the app to remove all local data</li>
              <li><strong>Control Permissions:</strong> Manage calendar permissions in macOS System Settings</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
            <p className="text-[var(--color-text)] mb-4">
              calendar++ does not knowingly collect information from children under 13. The app is designed for general audiences.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Changes to This Privacy Policy</h2>
            <p className="text-[var(--color-text)] mb-4">
              We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last updated" date at the top of this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-[var(--color-text)] mb-4">
              If you have questions about this Privacy Policy, please contact us:
            </p>
            <ul className="list-disc list-inside text-[var(--color-text)] mb-4 space-y-2">
              <li>Email: kor8821@naver.com</li>
              <li>GitHub: <a href="https://github.com/DenisKimskku/Calendarpp" className="text-[var(--color-accent)] hover:underline" target="_blank" rel="noopener noreferrer">github.com/DenisKimskku/Calendarpp</a></li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <Link href="/calendar-plus-plus" className="text-[var(--color-accent)] hover:underline">
            ← Back to calendar++
          </Link>
        </div>
      </div>
    </div>
  )
}
