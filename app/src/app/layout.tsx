import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tinsmith',
  description: 'HVAC equipment selection, load calculations, and installation cost estimates powered by ASHRAE standards and AHRI-certified efficiency data.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
