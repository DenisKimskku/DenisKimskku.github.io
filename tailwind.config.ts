import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          bg: '#ffffff',
          'bg-secondary': '#f5f5f7',
          text: '#1d1d1f',
          'text-secondary': '#6e6e73',
          accent: '#007aff',
          border: '#e5e5e7',
        },
        // Dark mode colors
        dark: {
          bg: '#000000',
          'bg-secondary': '#1c1c1e',
          text: '#f5f5f7',
          'text-secondary': '#86868b',
          accent: '#0a84ff',
          border: '#3a3a3c',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['var(--font-lora)', 'Georgia', 'serif'],
      },
      maxWidth: {
        'container': '800px',
      },
      spacing: {
        'header': '60px',
      },
    },
  },
  plugins: [],
};

export default config;
