import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsList } from "../notifications-list";
import type { Notification } from "@/lib/supabase/realtime";

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "notif-1",
    user_id: "user-1",
    type: "application_received",
    title: "New application",
    body: "Alice applied to your posting",
    read: false,
    related_posting_id: null,
    related_application_id: null,
    related_user_id: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("NotificationsList", () => {
  const onMarkAsRead = vi.fn();
  const onMarkAllAsRead = vi.fn();
  const onDelete = vi.fn();
  const onClick = vi.fn();

  const defaultProps = {
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no notifications", () => {
    render(<NotificationsList {...defaultProps} notifications={[]} />);
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });

  it("renders notification title and body", () => {
    const notification = makeNotification();
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    expect(screen.getByText("New application")).toBeInTheDocument();
    expect(
      screen.getByText("Alice applied to your posting"),
    ).toBeInTheDocument();
  });

  it("renders multiple notifications", () => {
    const notifications = [
      makeNotification({ id: "n-1", title: "First" }),
      makeNotification({ id: "n-2", title: "Second" }),
    ];
    render(
      <NotificationsList {...defaultProps} notifications={notifications} />,
    );
    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
  });

  it("shows Mark all as read button when unread notifications exist", () => {
    const notifications = [makeNotification({ read: false })];
    render(
      <NotificationsList {...defaultProps} notifications={notifications} />,
    );
    expect(screen.getByText("Mark all as read")).toBeInTheDocument();
  });

  it("hides Mark all as read when all notifications are read", () => {
    const notifications = [makeNotification({ read: true })];
    render(
      <NotificationsList {...defaultProps} notifications={notifications} />,
    );
    expect(screen.queryByText("Mark all as read")).not.toBeInTheDocument();
  });

  it("calls onMarkAllAsRead when button is clicked", () => {
    const notifications = [makeNotification({ read: false })];
    render(
      <NotificationsList {...defaultProps} notifications={notifications} />,
    );
    fireEvent.click(screen.getByText("Mark all as read"));
    expect(onMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  it("applies green styling for application_accepted type", () => {
    const notification = makeNotification({
      type: "application_accepted",
      title: "Application accepted",
    });
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    // The icon container has green background classes
    const iconContainer = screen
      .getByText("Application accepted")
      .closest("[class*='group']")
      ?.querySelector("[class*='bg-green']");
    expect(iconContainer).toBeTruthy();
  });

  it("applies red styling for application_rejected type", () => {
    const notification = makeNotification({
      type: "application_rejected",
      title: "Application rejected",
    });
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    const iconContainer = screen
      .getByText("Application rejected")
      .closest("[class*='group']")
      ?.querySelector("[class*='bg-red']");
    expect(iconContainer).toBeTruthy();
  });

  it("calls onClick when notification content is clicked", () => {
    const notification = makeNotification();
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    fireEvent.click(screen.getByText("New application"));
    expect(onClick).toHaveBeenCalledWith(notification);
  });

  it("calls onDelete when delete button is clicked", () => {
    const notification = makeNotification();
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    // The Trash2 icon has class lucide-trash-2; its parent button triggers onDelete
    const trashIcon = document.querySelector(".lucide-trash-2");
    expect(trashIcon).toBeTruthy();
    const deleteBtn = trashIcon!.closest("button");
    expect(deleteBtn).toBeTruthy();
    fireEvent.click(deleteBtn!);
    expect(onDelete).toHaveBeenCalledWith("notif-1");
  });

  it("renders relative time for recent notifications", () => {
    const justNow = new Date().toISOString();
    const notification = makeNotification({ created_at: justNow });
    render(
      <NotificationsList {...defaultProps} notifications={[notification]} />,
    );
    expect(screen.getByText("Just now")).toBeInTheDocument();
  });

  it("unread notifications have distinct styling", () => {
    const unread = makeNotification({
      id: "n-1",
      read: false,
      title: "Unread",
    });
    const read = makeNotification({ id: "n-2", read: true, title: "Read" });
    render(
      <NotificationsList {...defaultProps} notifications={[unread, read]} />,
    );
    const unreadEl = screen.getByText("Unread").closest("[class*='group']");
    const readEl = screen.getByText("Read").closest("[class*='group']");
    // Unread has primary bg class
    expect(unreadEl?.className).toContain("bg-primary");
    // Read does not
    expect(readEl?.className).not.toContain("bg-primary");
  });
});
