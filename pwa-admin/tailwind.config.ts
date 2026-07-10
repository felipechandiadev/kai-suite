import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    '../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary, #002B59)',
        background: 'var(--color-background, #ffffff)',
        foreground: 'var(--color-foreground, #131615)',
        border: 'var(--color-border, #c1c1c2)',
        accent: 'var(--color-accent, #0A7CAD)',
        active: 'var(--color-active, #0A7CAD)',
        secondary: 'var(--color-secondary, #04C9E6)',
        muted: 'var(--color-muted, #6b7280)',
        success: 'var(--color-success, #4CAF50)',
        info: 'var(--color-info, #2196F3)',
        warning: 'var(--color-warning, #FFC107)',
        error: 'var(--color-error, #F44336)',
        neutral: 'var(--color-neutral, #F3F4F6)',
      },
    },
  },
  plugins: [],
};

export default config;
