import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks for sub-hooks
// ---------------------------------------------------------------------------

const mockRealtimeChat = {
  typingUsers: ["user-typing-dm"],
  onlineUsers: ["user-online-dm"],
  setIsTyping: vi.fn(),
  isConnected: true,
};

const mockRealtimeGroupChat = {
  typingUsers: ["user-typing-group"],
  onlineUsers: ["user-online-group"],
  setIsTyping: vi.fn(),
  isConnected: true,
};

const mockDmMessages = {
  messages: [
    {
      id: "dm-msg-1",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Hello",
      read: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ],
  error: undefined,
  isLoading: false,
  mutate: vi.fn(),
};

const mockGroupMessages = {
  messages: [
    {
      id: "group-msg-1",
      posting_id: "posting-1",
      sender_id: "user-2",
      content: "Hi team",
      created_at: "2026-01-01T00:00:00Z",
      sender_name: "Alice",
    },
  ],
  isLoading: false,
  error: undefined,
  mutate: vi.fn(),
};

const mockInbox = {
  notifications: [],
  conversations: [
    {
      id: "conv-1",
      participant_1: "user-1",
      participant_2: "user-2",
      posting_id: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  currentUserId: "user-1",
  error: undefined,
  isLoading: false,
  mutate: vi.fn(),
};

vi.mock("../use-realtime-chat", () => ({
  useRealtimeChat: vi.fn(() => mockRealtimeChat),
}));

vi.mock("../use-realtime-group-chat", () => ({
  useRealtimeGroupChat: vi.fn(() => mockRealtimeGroupChat),
}));

vi.mock("../use-inbox", () => ({
  useConversationMessages: vi.fn(() => mockDmMessages),
  useInboxData: vi.fn(() => mockInbox),
}));

vi.mock("../use-group-messages", () => ({
  useGroupMessages: vi.fn(() => mockGroupMessages),
}));

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------

import { useChat } from "../use-chat";
import { useRealtimeChat } from "../use-realtime-chat";
import { useRealtimeGroupChat } from "../use-realtime-group-chat";
import { useConversationMessages, useInboxData } from "../use-inbox";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("DM mode (conversationId provided)", () => {
    it("returns DM messages and realtime state", () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: "conv-1", userId: "user-1" }),
      );

      expect(result.current.isGroupChat).toBe(false);
      expect(result.current.messages).toEqual(mockDmMessages.messages);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.typingUsers).toEqual(["user-typing-dm"]);
      expect(result.current.onlineUsers).toEqual(["user-online-dm"]);
      expect(result.current.isConnected).toBe(true);
    });

    it("activates DM realtime hooks with correct params", () => {
      renderHook(() => useChat({ conversationId: "conv-1", userId: "user-1" }));

      expect(useRealtimeChat).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "conv-1",
          currentUserId: "user-1",
        }),
      );
    });

    it("deactivates group realtime hooks", () => {
      renderHook(() => useChat({ conversationId: "conv-1", userId: "user-1" }));

      expect(useRealtimeGroupChat).toHaveBeenCalledWith(
        expect.objectContaining({
          postingId: null,
          currentUserId: null,
        }),
      );
    });

    it("exposes inbox conversations", () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: "conv-1", userId: "user-1" }),
      );

      expect(result.current.conversations).toEqual(mockInbox.conversations);
    });

    it("exposes mutateMessages for DM", () => {
      const { result } = renderHook(() =>
        useChat({ conversationId: "conv-1", userId: "user-1" }),
      );

      result.current.mutateMessages();
      expect(mockDmMessages.mutate).toHaveBeenCalled();
    });
  });

  describe("Group chat mode (postingId provided)", () => {
    it("returns group messages and realtime state", () => {
      const { result } = renderHook(() =>
        useChat({ postingId: "posting-1", userId: "user-2" }),
      );

      expect(result.current.isGroupChat).toBe(true);
      expect(result.current.messages).toEqual(mockGroupMessages.messages);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.typingUsers).toEqual(["user-typing-group"]);
      expect(result.current.onlineUsers).toEqual(["user-online-group"]);
      expect(result.current.isConnected).toBe(true);
    });

    it("activates group realtime hooks with correct params", () => {
      renderHook(() => useChat({ postingId: "posting-1", userId: "user-2" }));

      expect(useRealtimeGroupChat).toHaveBeenCalledWith(
        expect.objectContaining({
          postingId: "posting-1",
          currentUserId: "user-2",
        }),
      );
    });

    it("deactivates DM realtime hooks", () => {
      renderHook(() => useChat({ postingId: "posting-1", userId: "user-2" }));

      expect(useRealtimeChat).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: null,
          currentUserId: null,
        }),
      );
    });

    it("deactivates DM message fetching", () => {
      renderHook(() => useChat({ postingId: "posting-1", userId: "user-2" }));

      expect(useConversationMessages).toHaveBeenCalledWith(null, null);
    });

    it("exposes mutateMessages for group", () => {
      const { result } = renderHook(() =>
        useChat({ postingId: "posting-1", userId: "user-2" }),
      );

      result.current.mutateMessages();
      expect(mockGroupMessages.mutate).toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("defaults to DM mode when neither ID is provided", () => {
      const { result } = renderHook(() => useChat({ userId: "user-1" }));

      expect(result.current.isGroupChat).toBe(false);
    });

    it("prefers group mode when postingId is provided (even with conversationId)", () => {
      const { result } = renderHook(() =>
        useChat({
          conversationId: "conv-1",
          postingId: "posting-1",
          userId: "user-1",
        }),
      );

      expect(result.current.isGroupChat).toBe(true);
      expect(result.current.messages).toEqual(mockGroupMessages.messages);
    });

    it("always exposes inbox regardless of mode", () => {
      const { result } = renderHook(() =>
        useChat({ postingId: "posting-1", userId: "user-1" }),
      );

      expect(useInboxData).toHaveBeenCalled();
      expect(result.current.conversations).toEqual(mockInbox.conversations);
    });
  });
});
