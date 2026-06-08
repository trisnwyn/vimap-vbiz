// Fullscreen wrapper for the dashboard. The root layout body is scrollable
// (for the landing page); this restores the app's fixed, no-scroll viewport.
export default function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="h-screen overflow-hidden">{children}</div>;
}
