'use client';

export default function NewsletterSignup() {
  return (
    <div className="mt-16 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-8">
      <h2 className="text-lg font-semibold font-serif text-[var(--color-text)] mb-2">
        Stay updated
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6">
        Get notified when new research articles and technical writings are published.
      </p>
      <form
        action="https://buttondown.com/api/emails/kor8821"
        method="post"
        target="_blank"
        className="flex flex-col sm:flex-row gap-3"
      >
        <label htmlFor="newsletter-email" className="sr-only">Email address</label>
        <input
          type="email"
          name="email"
          id="newsletter-email"
          placeholder="your@email.com"
          required
          className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors text-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[var(--color-accent)] text-white font-medium text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          Subscribe
        </button>
      </form>
    </div>
  );
}
