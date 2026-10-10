import type { Metadata } from "next";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Inter, JetBrains_Mono, Noto_Color_Emoji } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

const notoColorEmoji = Noto_Color_Emoji({
  subsets: ["emoji"],
  weight: "400",
  variable: "--font-noto-emoji",
});

export const metadata: Metadata = {
  title: "OntoKit - Collaborative Ontology Editor",
  description:
    "A modern platform for collaborative OWL ontology curation with real-time editing and GitHub integration.",
  keywords: ["ontology", "OWL", "RDF", "semantic web", "knowledge graph", "collaboration"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // next-intl resolves the locale from the NEXT_LOCALE cookie, falling back to
  // Accept-Language and then to "en" (see lib/i18n/request.ts). Both the locale
  // and the messages have to be handed to the client provider here — without it
  // every `useTranslations()` call in a client component throws.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var s=JSON.parse(localStorage.getItem("ontokit-editor-preferences")||"{}");var t=(s.state&&s.state.theme)||"system";if(t==="dark")document.documentElement.classList.add("dark");else if(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}})()`}
        </Script>
      </head>
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${notoColorEmoji.variable} font-sans antialiased`}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
