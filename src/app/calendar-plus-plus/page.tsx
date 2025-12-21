import Link from 'next/link'

export const metadata = {
  title: 'calendar++ - Smart Menu Bar Calendar for macOS',
  description: 'A powerful menu bar calendar app for macOS with Google Calendar integration, event management, and beautiful design.',
}

export default function CalendarPlusPlus() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            calendar++
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Smart menu bar calendar for macOS
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="#download"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Download
            </a>
            <a
              href="https://github.com/DenisKimskku/Calendarpp"
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
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
          <h2 className="text-3xl font-bold mb-8 text-center">Installation</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Via Homebrew (Recommended)</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
              <code>brew tap DenisKimskku/tap{'\n'}brew install --cask calendar-plus-plus</code>
            </pre>

            <h3 className="text-xl font-semibold mb-4 mt-8">Manual Installation</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
              <li>Download the latest release from the <a href="https://github.com/DenisKimskku/Calendarpp/releases" className="text-blue-600 hover:underline">releases page</a></li>
              <li>Unzip the file</li>
              <li>Move calendar++.app to your Applications folder</li>
              <li>Launch the app and grant calendar permissions</li>
            </ol>
          </div>
        </div>

        {/* System Requirements */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">System Requirements</h2>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
            <ul className="space-y-2 text-gray-600 dark:text-gray-300">
              <li>• macOS 13.0 (Ventura) or later</li>
              <li>• Apple Silicon (M1/M2/M3) or Intel Mac</li>
              <li>• Calendar app permissions (for local events)</li>
              <li>• Google account (optional, for Google Calendar integration)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-2">
          <div className="flex gap-4 justify-center">
            <Link href="/calendar-plus-plus/privacy" className="hover:text-blue-600">
              Privacy Policy
            </Link>
            <Link href="/calendar-plus-plus/terms" className="hover:text-blue-600">
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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  )
}
