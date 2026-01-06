export default function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] mt-16 py-8 no-print">
      <div className="container-custom">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex gap-6">
            <a
              href="mailto:for8821@g.skku.edu"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Email
            </a>
            <a
              href="https://scholar.google.com/citations?user=81uf6x0AAAAJ"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Scholar
            </a>
            <a
              href="https://github.com/DenisKimskku"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)]">
            © {new Date().getFullYear()} Minseok (Denis) Kim. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
