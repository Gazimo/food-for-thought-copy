import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import ClientProviders from "./client-providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Food for Thought – A Delicious Guessing Game",
  description:
    "A daily global game about food and geography. Uncover the dish. Track it to its origin. Become a Chef.",
  openGraph: {
    title: "Food for Thought – A Delicious Guessing Game",
    description:
      "A daily global game about food and geography. Uncover the dish. Track it to its origin. Become a Chef.",
    url: "https://f4t.xyz",
    siteName: "Food for Thought",
    images: [
      {
        url: "https://f4t.xyz/og-image.jpeg",
        width: 1200,
        height: 630,
        alt: 'Cartoon chef holding a world map with "Food for Thought" logo',
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Food for Thought – A Delicious Guessing Game",
    description:
      "A daily global game about food and geography. Uncover the dish. Track it to its origin. Become a Chef.",
    images: ["https://f4t.xyz/og-image.jpeg"], // ✅ absolute URL
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`bg-white text-black font-sans ${geistSans.variable} ${geistMono.variable}`}
      >
        <ClientProviders>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 2000,
              style: {
                borderRadius: "8px",
                background: "#333",
                color: "#fff",
              },
            }}
          />
        </ClientProviders>
      </body>
    </html>
  );
}
