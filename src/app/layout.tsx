import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WorkspaceProvider } from "@/context/WorkspaceProvider";

export const metadata: Metadata = {
  title: "Tenure — Loan EMI Workspace",
  description:
    "A loan EMI calculator with a real-time, multi-tab shared workspace. No backend, no polling — tabs sync over BroadcastChannel.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F5F5B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans antialiased">
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </body>
    </html>
  );
}
