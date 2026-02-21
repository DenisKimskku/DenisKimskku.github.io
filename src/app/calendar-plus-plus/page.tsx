import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import StructuredData from '@/components/StructuredData'
import { siteMetadata } from '@/lib/siteMetadata'

const description = 'A powerful menu bar calendar app for macOS with Google Calendar integration, event management, and beautiful design.'

export const metadata: Metadata = {
  title: 'Calendar++',
  description,
  alternates: {
    canonical: '/calendar-plus-plus',
  },
  openGraph: {
    title: `Calendar++ | ${siteMetadata.authorName}`,
    description,
    url: `${siteMetadata.siteUrl}/calendar-plus-plus`,
    type: 'website',
    images: [`${siteMetadata.siteUrl}/images/calendar-plus-plus/overview-main-live.png`],
  },
}

export default function CalendarPlusPlus() {
  const pageUrl = `${siteMetadata.siteUrl}/calendar-plus-plus`
  const screenshots = [
    {
      src: '/images/calendar-plus-plus/overview-main-live.png',
      width: 1148,
      height: 956,
      title: 'Large-screen monthly view',
      caption: 'Use calendar++ as a full productivity app with month grid and integrated event list.',
    },
    {
      src: '/images/calendar-plus-plus/toolbar-controls.png',
      width: 1148,
      height: 140,
      title: 'Fast top-bar controls',
      caption: 'Today jump, view switch, refresh, navigation, and settings are all reachable in one row.',
    },
    {
      src: '/images/calendar-plus-plus/event-chips-focus.png',
      width: 1148,
      height: 300,
      title: 'Readable event density',
      caption: 'Multiple events are visible inside each day cell with compact chip styling.',
    },
    {
      src: '/images/calendar-plus-plus/day-events-panel-wide.png',
      width: 1148,
      height: 300,
      title: 'Day-level event panel',
      caption: 'Below the month grid, the event panel lists all-day and timed entries clearly.',
    },
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Calendar++',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'macOS',
    description,
    url: pageUrl,
    author: {
      '@type': 'Person',
      name: siteMetadata.authorName,
      url: siteMetadata.siteUrl,
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    downloadUrl: 'https://github.com/DenisKimskku/Calendarpp/releases',
    softwareRequirements: 'macOS 13.0 or later',
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        <StructuredData data={jsonLd} />
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
              Access your schedule instantly from your Mac&apos;s menu bar without opening multiple apps.
            </p>
            <p>
              The app integrates seamlessly with both your local macOS Calendar and Google Calendar, providing a unified
              view of all your events in one convenient location. With secure OAuth 2.0 authentication, your Google Calendar
              data stays private and is never stored on external servers - everything remains on your device.
            </p>
            <p>
              Built natively for macOS with SwiftUI, Calendar++ supports both menu bar workflow and a larger, desktop-style
              planning window. You can quickly navigate months, review day details, and manage events from one consistent interface.
            </p>
          </div>
        </div>

        {/* Screenshots */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center text-[var(--color-text)]">Screenshots</h2>
          <div className="space-y-6">
            {screenshots.map((shot) => (
              <figure
                key={shot.src}
                className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] overflow-hidden"
              >
                <Image
                  src={shot.src}
                  alt={shot.title}
                  width={shot.width}
                  height={shot.height}
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <figcaption className="p-4">
                  <p className="font-semibold text-[var(--color-text)]">{shot.title}</p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-1">{shot.caption}</p>
                </figcaption>
              </figure>
            ))}
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

        {/* Related Writing */}
        <div className="mb-16 text-center">
          <Link
            href="/writing"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Read more on the blog
          </Link>
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
          <p>© 2025 Minseok Kim. All rights reserved.</p>
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
