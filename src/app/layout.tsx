import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeContext';

export const metadata: Metadata = {
  title: 'CY Admin — Kristujayanti College',
  description: 'Admin portal for Kristujayanti College Church Youth community management.',
  icons: { icon: '/cy-logo.png', apple: '/cy-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--bg-card, #1e2736)',
                color: 'var(--text, #f1f5f9)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
                borderRadius: '10px',
                fontSize: '13.5px',
                backdropFilter: 'blur(12px)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
