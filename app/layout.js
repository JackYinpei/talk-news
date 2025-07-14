import "./globals.css";
import { LanguageProvider } from './context/LanguageContext';

export const metadata = {
  title: "Talk News",
  description: "Learn languages by talking about the news.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
