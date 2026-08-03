import React from "react";
import type { LessonResponse } from "@edumind/shared-types";
import { QuizTakerContent } from "./QuizTakerContent";

interface InlineQuizTakerProps {
  lesson: LessonResponse;
  onQuizPass?: () => void;
}

export const InlineQuizTaker: React.FC<InlineQuizTakerProps> = (props) => (
  <QuizTakerContent {...props} />
);
