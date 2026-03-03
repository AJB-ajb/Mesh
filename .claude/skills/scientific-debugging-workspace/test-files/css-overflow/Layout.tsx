import "./Layout.css";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <nav>Navigation</nav>
      </aside>
      <main className="content-area">{children}</main>
    </div>
  );
}
