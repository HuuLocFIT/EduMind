import React, { forwardRef } from 'react';
import type { QuizQuestionDto } from '@edumind/shared-types';

interface QuizQuestionFieldsetProps {
  question: QuizQuestionDto;
  questionIndex: number;
  selectedAnswer: number;
  disabled?: boolean;
  /** Unique name for the radio group so inline and modal flows never collide. */
  name: string;
  onChange: (optionIndex: number) => void;
}

export const QuizQuestionFieldset = forwardRef<
  HTMLFieldSetElement,
  QuizQuestionFieldsetProps
>(({ question, questionIndex, selectedAnswer, disabled, name, onChange }, ref) => {
  return (
    <fieldset
      ref={ref}
      disabled={disabled}
      tabIndex={-1}
      className="border rounded-lg p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <legend className="font-semibold text-gray-900 mb-3">
        {questionIndex + 1}. {question.question}
      </legend>
      <div className="space-y-2">
        {question.options.map((option, optionIndex) => (
          <label
            key={optionIndex}
            className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <input
              type="radio"
              name={name}
              value={optionIndex}
              checked={selectedAnswer === optionIndex}
              onChange={() => onChange(optionIndex)}
              className="mr-3"
            />
            <span className="text-gray-700">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
});

QuizQuestionFieldset.displayName = 'QuizQuestionFieldset';

export default QuizQuestionFieldset;
