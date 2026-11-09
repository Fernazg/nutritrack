/** Re-mounts on every navigation: a short fade gives screens a smooth entry. */
export default function TabsTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
