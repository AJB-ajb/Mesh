import { DashboardLayout } from "./Layout";
import { Card } from "./Card";

export function DashboardPage() {
  return (
    <DashboardLayout>
      <h2>Dashboard</h2>
      <Card title="Revenue" variant="elevated">
        <p>$12,345 this month</p>
      </Card>
      <Card title="Users">
        <p>1,234 active users</p>
      </Card>
    </DashboardLayout>
  );
}
