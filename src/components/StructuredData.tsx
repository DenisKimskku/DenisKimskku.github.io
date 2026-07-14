// src/components/StructuredData.tsx
import React from 'react';

interface StructuredDataProps {
  data: Record<string, unknown>;
}

const StructuredData: React.FC<StructuredDataProps> = ({ data }) => {
  // Escape "<" so data can never close the script tag and inject HTML.
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
};

export default StructuredData;
