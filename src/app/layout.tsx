import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitQuest — Turn fitness into adventure",
  description: "Level up your real-life stats, fight monsters, and earn rewards for healthy habits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-stone-950 text-stone-100 antialiased">{children}</body>
    </html>
  );
}
