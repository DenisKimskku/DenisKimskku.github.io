import Link from 'next/link';
import StructuredData from './StructuredData';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.href ? `https://deniskim1.com${item.href}` : undefined,
    })),
  };

  return (
    <>
      <StructuredData data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          {items.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-[var(--color-border)]">/</span>
              )}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-[var(--color-accent)] transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span className="text-[var(--color-text)]">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
