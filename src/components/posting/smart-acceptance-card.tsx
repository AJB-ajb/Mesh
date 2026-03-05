"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { labels } from "@/lib/labels";
import type {
  AcceptanceCardData,
  AcceptanceQuestion,
  AcceptanceRole,
  ApplicationResponses,
  TimeSlot,
} from "@/lib/types/acceptance-card";

interface SmartAcceptanceCardProps {
  postingId: string;
  onSubmit: (responses: ApplicationResponses) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

type CardState = "loading" | "ready" | "fallback";

export function SmartAcceptanceCard({
  postingId,
  onSubmit,
  onCancel,
  isSubmitting,
}: SmartAcceptanceCardProps) {
  const [cardState, setCardState] = useState<CardState>("loading");
  const [cardData, setCardData] = useState<AcceptanceCardData | null>(null);

  // Form state
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<AcceptanceRole | null>(null);
  const [confirmedTime, setConfirmedTime] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCard() {
      try {
        const res = await fetch(`/api/postings/${postingId}/acceptance-card`);
        if (!res.ok) throw new Error("Failed to fetch acceptance card");
        const data: AcceptanceCardData = await res.json();
        if (cancelled) return;
        setCardData(data);
        setCardState("ready");
      } catch {
        if (cancelled) return;
        setCardState("fallback");
      }
    }

    fetchCard();
    return () => {
      cancelled = true;
    };
  }, [postingId]);

  const toggleSlot = (slotStart: string) => {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slotStart)) next.delete(slotStart);
      else next.add(slotStart);
      return next;
    });
  };

  const setAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const needsTimeSelection =
    cardData && !cardData.skip_time && !cardData.confirmed_time;
  const hasTimeSlots = cardData && cardData.time_slots.length > 0;

  const isValid =
    cardState === "fallback" ||
    (cardData &&
      // Time: either skipped, confirmed, or at least one slot selected
      (cardData.skip_time ||
        cardData.confirmed_time ||
        selectedSlots.size > 0) &&
      // Confirmed time must be acknowledged
      (!cardData.confirmed_time || confirmedTime));

  const handleSubmit = async () => {
    const responses: ApplicationResponses = {
      meta: {
        card_version: 1,
        completed_at: new Date().toISOString(),
      },
    };

    // Questions
    if (cardData?.questions && cardData.questions.length > 0) {
      responses.questions = cardData.questions
        .filter((q) => answers[q.id])
        .map((q) => ({
          id: q.id,
          question: q.question,
          type: q.type,
          answer: answers[q.id],
          answered_at: new Date().toISOString(),
        }));
    }

    // Time selection
    if (needsTimeSelection && selectedSlots.size > 0) {
      responses.time_selection = {
        slots: Array.from(selectedSlots),
        duration_minutes: cardData?.inferred_duration_minutes ?? 60,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    // Role
    if (selectedRole) {
      responses.role = { id: selectedRole.id, name: selectedRole.name };
    }

    await onSubmit(responses);
  };

  // Loading state
  if (cardState === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6 w-full max-w-md">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {labels.acceptanceCard.loading}
        </p>
      </div>
    );
  }

  // Fallback: simple confirm
  if (cardState === "fallback") {
    return (
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {labels.acceptanceCard.confirming}
            </>
          ) : (
            <>
              <Check className="size-4" />
              {labels.acceptanceCard.confirmJoin}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {labels.common.cancel}
        </Button>
      </div>
    );
  }

  // Check if the card is essentially empty (no questions, no time selection, no roles)
  const isEmptyCard =
    cardData &&
    cardData.skip_time &&
    !cardData.confirmed_time &&
    cardData.questions.length === 0 &&
    cardData.roles.length === 0;

  if (isEmptyCard) {
    return (
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {labels.acceptanceCard.confirming}
            </>
          ) : (
            <>
              <Check className="size-4" />
              {labels.acceptanceCard.confirmJoin}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {labels.common.cancel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 w-full max-w-md">
      <p className="text-sm font-medium">{labels.acceptanceCard.title}</p>

      {/* Time section */}
      {cardData?.confirmed_time && (
        <TimeConfirmedSection
          time={cardData.confirmed_time}
          confirmed={confirmedTime}
          onToggle={() => setConfirmedTime(!confirmedTime)}
        />
      )}

      {needsTimeSelection && hasTimeSlots && (
        <TimeSlotsSection
          slots={cardData!.time_slots}
          selectedSlots={selectedSlots}
          onToggle={toggleSlot}
        />
      )}

      {/* Questions section */}
      {cardData && cardData.questions.length > 0 && (
        <QuestionsSection
          questions={cardData.questions}
          answers={answers}
          onAnswer={setAnswer}
        />
      )}

      {/* Roles section */}
      {cardData && cardData.roles.length > 0 && (
        <RolesSection
          roles={cardData.roles}
          selectedRole={selectedRole}
          onSelect={setSelectedRole}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button onClick={handleSubmit} disabled={isSubmitting || !isValid}>
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {labels.acceptanceCard.confirming}
            </>
          ) : (
            <>
              <Check className="size-4" />
              {labels.acceptanceCard.confirmJoin}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {labels.common.cancel}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-sections
// ---------------------------------------------------------------------------

function TimeConfirmedSection({
  time,
  confirmed,
  onToggle,
}: {
  time: { start: string; end: string; label: string };
  confirmed: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        <Clock className="mr-1 inline size-3.5" />
        {labels.acceptanceCard.scheduledFor} {time.label}
      </p>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={onToggle}
          className="size-4 rounded border-input"
        />
        {labels.acceptanceCard.worksForMe}
      </label>
    </div>
  );
}

function TimeSlotsSection({
  slots,
  selectedSlots,
  onToggle,
}: {
  slots: TimeSlot[];
  selectedSlots: Set<string>;
  onToggle: (slotStart: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{labels.acceptanceCard.whenWorks}</p>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => {
          const isSelected = selectedSlots.has(slot.start);
          return (
            <button
              key={slot.start}
              type="button"
              onClick={() => onToggle(slot.start)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background text-foreground hover:bg-accent"
              }`}
              aria-pressed={isSelected}
            >
              {isSelected && <Check className="size-3" />}
              {slot.label}
            </button>
          );
        })}
      </div>
      {slots.some((s) => s.note) && (
        <div className="space-y-0.5">
          {slots
            .filter((s) => s.note && selectedSlots.has(s.start))
            .map((s) => (
              <p key={s.start} className="text-xs text-muted-foreground">
                {s.note}
              </p>
            ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {labels.acceptanceCard.selectAllThatWork}
      </p>
    </div>
  );
}

function QuestionsSection({
  questions,
  answers,
  onAnswer,
}: {
  questions: AcceptanceQuestion[];
  answers: Record<string, string>;
  onAnswer: (id: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-1.5">
          <Label htmlFor={q.id} className="text-sm">
            {q.question}
          </Label>
          <QuestionInput
            question={q}
            value={answers[q.id] ?? ""}
            onChange={(val) => onAnswer(q.id, val)}
          />
        </div>
      ))}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AcceptanceQuestion;
  value: string;
  onChange: (val: string) => void;
}) {
  switch (question.type) {
    case "yes_no":
      return (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange("yes")}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              value === "yes"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-accent"
            }`}
            aria-pressed={value === "yes"}
          >
            {labels.acceptanceCard.yes}
          </button>
          <button
            type="button"
            onClick={() => onChange("no")}
            className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
              value === "no"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-accent"
            }`}
            aria-pressed={value === "no"}
          >
            {labels.acceptanceCard.no}
          </button>
        </div>
      );
    case "select":
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={question.id}>
            <SelectValue placeholder={labels.acceptanceCard.selectOption} />
          </SelectTrigger>
          <SelectContent>
            {question.options?.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    default:
      return (
        <Input
          id={question.id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={labels.acceptanceCard.typeAnswer}
        />
      );
  }
}

function RolesSection({
  roles,
  selectedRole,
  onSelect,
}: {
  roles: AcceptanceRole[];
  selectedRole: AcceptanceRole | null;
  onSelect: (role: AcceptanceRole) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{labels.acceptanceCard.whichRole}</p>
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => {
          const isSelected = selectedRole?.id === role.id;
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => onSelect(role)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-input bg-background hover:bg-accent"
              }`}
              aria-pressed={isSelected}
            >
              {role.name}
            </button>
          );
        })}
      </div>
      {selectedRole?.description && (
        <p className="text-xs text-muted-foreground">
          {selectedRole.description}
        </p>
      )}
    </div>
  );
}
