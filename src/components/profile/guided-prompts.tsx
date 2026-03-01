"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

interface GuidedPromptsProps {
  onComplete: (assembledText: string) => void;
  onSkip: () => void;
}

const QUESTIONS = [
  {
    question: labels.guidedPrompts.step1Question,
    placeholder: labels.guidedPrompts.step1Placeholder,
  },
  {
    question: labels.guidedPrompts.step2Question,
    placeholder: labels.guidedPrompts.step2Placeholder,
  },
  {
    question: labels.guidedPrompts.step3Question,
    placeholder: labels.guidedPrompts.step3Placeholder,
  },
] as const;

const TOTAL_STEPS = QUESTIONS.length;

export function GuidedPrompts({ onComplete, onSkip }: GuidedPromptsProps) {
  const [answers, setAnswers] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [reviewText, setReviewText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus textarea when step changes
  useEffect(() => {
    if (step < 3) {
      textareaRef.current?.focus();
    }
  }, [step]);

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => {
      const next = [...prev] as [string, string, string];
      next[step as 0 | 1 | 2] = value;
      return next;
    });
  };

  const assembleText = (ans: [string, string, string]) => {
    const parts: string[] = [];
    if (ans[0].trim()) {
      parts.push(`## ${labels.guidedPrompts.aboutMeHeading}\n${ans[0].trim()}`);
    }
    if (ans[1].trim()) {
      parts.push(
        `## ${labels.guidedPrompts.interestsHeading}\n${ans[1].trim()}`,
      );
    }
    if (ans[2].trim()) {
      parts.push(
        `## ${labels.guidedPrompts.projectsHeading}\n${ans[2].trim()}`,
      );
    }
    return parts.join("\n\n");
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((step + 1) as 0 | 1 | 2 | 3);
    } else if (step === 2) {
      // Go to review
      setReviewText(assembleText(answers));
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
    } else if (step > 0) {
      setStep((step - 1) as 0 | 1 | 2 | 3);
    }
  };

  const handleSave = () => {
    onComplete(reviewText);
  };

  // Question steps (0, 1, 2)
  if (step === 0 || step === 1 || step === 2) {
    const currentQuestion = QUESTIONS[step];
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">
            {labels.guidedPrompts.title}
          </h2>
          <p className="mt-1 text-muted-foreground">
            {labels.guidedPrompts.subtitle}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">{currentQuestion.question}</h3>
            <span className="text-sm text-muted-foreground">
              {labels.guidedPrompts.stepIndicator(step + 1, TOTAL_STEPS)}
            </span>
          </div>

          <textarea
            ref={textareaRef}
            value={answers[step]}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder={currentQuestion.placeholder}
            rows={6}
            className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />

          <div className="flex items-center justify-between">
            <div>
              {step > 0 ? (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="h-10 sm:h-9"
                >
                  {labels.guidedPrompts.backButton}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={onSkip}
                  className="h-10 sm:h-9"
                >
                  {labels.guidedPrompts.skipButton}
                </Button>
              )}
            </div>
            <Button onClick={handleNext} className="h-10 sm:h-9">
              {step === 2
                ? labels.guidedPrompts.reviewButton
                : labels.guidedPrompts.nextButton}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Review step (step === 3)
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold">
          {labels.guidedPrompts.reviewTitle}
        </h2>
        <p className="mt-1 text-muted-foreground">
          {labels.guidedPrompts.reviewDescription}
        </p>
      </div>

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        rows={12}
        className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-base leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
      />

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} className="h-10 sm:h-9">
          {labels.guidedPrompts.backButton}
        </Button>
        <Button
          onClick={handleSave}
          disabled={!reviewText.trim()}
          className="h-10 sm:h-9"
        >
          {labels.guidedPrompts.saveButton}
        </Button>
      </div>
    </div>
  );
}
