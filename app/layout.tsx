import type { Metadata } from "next";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import GoogleAnalytics from "./components/GoogleAnalytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "Python Speedrun",
  description: "Adaptive Python course for experienced developers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="antialiased">
          <Suspense>
            <GoogleAnalytics />
          </Suspense>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
