import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";
import { ThemeProvider } from "@/components/theme-provider";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "STAIPO AI",
  description: "Премиум платформа за автоматизирани оферти за мебели по поръчка.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.__ENV = {
                    NEXT_PUBLIC_SUPABASE_URL: ${JSON.stringify(process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"] || "")},
                    NEXT_PUBLIC_SUPABASE_ANON_KEY: ${JSON.stringify(process.env["SUPABASE_ANON_KEY"] || process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] || "")}
                  };
                `,
              }}
            />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <WorkspaceProvider>
            {children}
            <Toaster position="top-center" richColors />
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
