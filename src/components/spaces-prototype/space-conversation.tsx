"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { SystemMessage } from "./system-message";
import { TimeProposalCard } from "./time-proposal-card";
import { RsvpCard } from "./rsvp-card";
import { PollCard } from "./poll-card";
import { PostingCardInline } from "./posting-card-inline";
import type { Message } from "./mock-data";

type SpaceConversationProps = {
  messages: Message[];
};

export function SpaceConversation({ messages }: SpaceConversationProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
      {messages.map((msg) => {
        // Rich card
        if (msg.card) {
          switch (msg.card.type) {
            case "time-proposal":
              return <TimeProposalCard key={msg.id} card={msg.card} />;
            case "rsvp":
              return <RsvpCard key={msg.id} card={msg.card} />;
            case "poll":
              return <PollCard key={msg.id} card={msg.card} />;
            case "posting-card":
              return <PostingCardInline key={msg.id} card={msg.card} />;
          }
        }

        // System message
        if (msg.type === "system") {
          return <SystemMessage key={msg.id} content={msg.content} />;
        }

        // Regular message
        return (
          <MessageBubble
            key={msg.id}
            sender={msg.sender}
            senderInitials={msg.senderInitials}
            content={msg.content}
            time={msg.time}
            isOwn={msg.isOwn}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
