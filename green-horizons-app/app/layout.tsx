import Header from "@/components/header/header";
import Footer from "@/components/footer/footer";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Green Horizons",
  icons: {
    icon: '/favicon.ico',
  },
  description:
    "we believe in the power of cannabis to improve health and well-being on a global scale.",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <main className="min-h-screen flex flex-col items-center">
            <div className="flex-1 w-full flex flex-col gap-20 items-center">
              {/* Include the Header component */}
              <Header />

              {/* Main content area */}
              <div className="flex flex-col gap-20 max-w-5xl p-5">
                {children}
              </div>

              {/* Include the Footer component */}
              <Footer />
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}