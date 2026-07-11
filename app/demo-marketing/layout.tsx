import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo — Mnemora",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function DemoMarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
