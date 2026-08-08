import React from "react";
import type { LessonResponse } from "@edumind/shared-types";
import { Modal } from "@edumind/user-ui";
import { QuizTakerContent } from "./QuizTakerContent";

interface QuizTakerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: LessonResponse;
  onQuizPass?: () => void;
}

export const QuizTakerModal: React.FC<QuizTakerModalProps> = ({
  isOpen,
  onClose,
  lesson,
  onQuizPass,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Take Quiz" size="lg">
    {isOpen && (
      <div className="max-h-[75vh] overflow-y-auto pr-2">
        <QuizTakerContent
          key={lesson.id}
          lesson={lesson}
          onQuizPass={onQuizPass}
          onClose={onClose}
        />
      </div>
    )}
  </Modal>
);
