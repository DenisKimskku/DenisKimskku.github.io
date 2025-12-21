import Link from 'next/link'

export const metadata = {
  title: 'Calendar++',
  description: 'A powerful menu bar calendar app for macOS with Google Calendar integration, event management, and beautiful design.',
}

export default function CalendarPlusPlus() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Calendar++
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] mb-8">
            Smart menu bar calendar for macOS
          </p>
          <div className="flex gap-4 justify-center mb-8">
            <a
              href="#download"
              className="px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-80 transition"
            >
              Download
            </a>
            <a
              href="https://github.com/DenisKimskku/Calendarpp"
              className="px-6 py-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-secondary)] transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
          <div className="flex gap-4 justify-center text-sm">
            <Link href="/calendar-plus-plus/privacy" className="text-[var(--color-accent)] hover:underline">
              Privacy Policy
            </Link>
            <span className="text-[var(--color-text-secondary)]">•</span>
            <Link href="/calendar-plus-plus/terms" className="text-[var(--color-accent)] hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Privacy Notice - Prominent for Google Verification */}
        <div className="mb-8 bg-[var(--color-bg-secondary)] rounded-lg p-4 border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text)] mb-2">
            <strong>Calendar++</strong> respects your privacy and security.
          </p>
          <div className="flex gap-4 justify-center text-sm">
            <Link href="/calendar-plus-plus/privacy" className="text-[var(--color-accent)] hover:underline font-medium">
              Read our Privacy Policy
            </Link>
            <span className="text-[var(--color-text-secondary)]">•</span>
            <Link href="/calendar-plus-plus/terms" className="text-[var(--color-accent)] hover:underline font-medium">
              Terms of Service
            </Link>
          </div>
        </div>

        {/* About Section - What is Calendar++? */}
        <div className="mb-16 bg-[var(--color-bg-secondary)] rounded-lg p-8 border border-[var(--color-border)]">
          <h2 className="text-3xl font-bold mb-4 text-[var(--color-text)]">What is Calendar++?</h2>
          <div className="text-lg text-[var(--color-text)] space-y-4">
            <p>
              Calendar++ is a powerful menu bar calendar application for macOS that helps you stay organized and productive.
              Access your schedule instantly from your Mac's menu bar without opening multiple apps.
            </p>
            <p>
              The app integrates seamlessly with both your local macOS Calendar and Google Calendar, providing a unified
              view of all your events in one convenient location. With secure OAuth 2.0 authentication, your Google Calendar
              data stays private and is never stored on external servers - everything remains on your device.
            </p>
            <p>
              Built natively for macOS with SwiftUI, Calendar++ features a beautiful liquid glass design that adapts to
              macOS Sequoia's visual style, offering quick event creation, smart event management, and instant access to
              your schedule right from your menu bar.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Features</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard
              icon="📅"
              title="Smart Calendar Management"
              description="View and manage your calendar events directly from the menu bar"
            />
            <FeatureCard
              icon="☁️"
              title="Google Calendar Integration"
              description="Seamlessly sync with your Google Calendar using OAuth 2.0"
            />
            <FeatureCard
              icon="🎯"
              title="Unified Timeline"
              description="See all your events from local Calendar app and Google Calendar in one place"
            />
            <FeatureCard
              icon="🔒"
              title="Secure & Private"
              description="Your credentials are stored securely in macOS Keychain"
            />
            <FeatureCard
              icon="✨"
              title="Beautiful Design"
              description="Liquid glass transparency effect for macOS 26 Sequoia"
            />
            <FeatureCard
              icon="⚡️"
              title="Fast & Lightweight"
              description="Native macOS app built with SwiftUI for optimal performance"
            />
          </div>
        </div>

        {/* Installation */}
        <div id="download" className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[var(--color-text)]">Installation</h2>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-8 border border-[var(--color-border)]">
            <h3 className="text-xl font-semibold mb-4">Via Homebrew (Recommended)</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code>brew tap DenisKimskku/tap{'\n'}brew install --cask calendar-plus-plus</code>
            </pre>

            <h3 className="text-xl font-semibold mb-4 mt-8 text-[var(--color-text)]">Manual Installation</h3>
            <ol className="list-decimal list-inside space-y-2 text-[var(--color-text-secondary)]">
              <li>Download the latest release from the <a href="https://github.com/DenisKimskku/Calendarpp/releases" className="text-[var(--color-accent)] hover:underline">releases page</a></li>
              <li>Unzip the file</li>
              <li>Move calendar++.app to your Applications folder</li>
              <li>Launch the app and grant calendar permissions</li>
            </ol>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[var(--color-text)]">System Requirements</h2>
          <div className="bg-[var(--color-bg-secondary)] rounded-lg p-8 border border-[var(--color-border)]">
            <ul className="space-y-2 text-[var(--color-text-secondary)]">
              <li>• macOS 13.0 (Ventura) or later</li>
              <li>• Apple Silicon (M1/M2/M3) or Intel Mac</li>
              <li>• Calendar app permissions (for local events)</li>
              <li>• Google account (optional, for Google Calendar integration)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-[var(--color-text-secondary)] space-y-2">
          <div className="flex gap-4 justify-center">
            <Link href="/calendar-plus-plus/privacy" className="hover:text-[var(--color-accent)]">
              Privacy Policy
            </Link>
            <Link href="/calendar-plus-plus/terms" className="hover:text-[var(--color-accent)]">
              Terms of Service
            </Link>
          </div>
          <p>© 2025 Denis Kim. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-lg p-6 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-[var(--color-text)]">{title}</h3>
      <p className="text-[var(--color-text-secondary)]">{description}</p>
    </div>
  )
}
