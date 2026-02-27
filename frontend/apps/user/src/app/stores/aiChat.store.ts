import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SourceLessonDto } from "@edumind/shared-types";

export type AiChatMessage = {
  role: "user" | "ai";
  content: string;
  sourceLessons?: SourceLessonDto[];
};

interface AiChatState {
  isOpen: boolean;
  chatsByCourse: Record<string, AiChatMessage[]>;

  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  getMessages: (courseId: number) => AiChatMessage[];
  addMessage: (courseId: number, message: AiChatMessage) => void;
  clearCourse: (courseId: number) => void;
  updateLastAiMessage: (
    courseId: number,
    updater: (prev: AiChatMessage) => AiChatMessage
  ) => void;
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      chatsByCourse: {},

      openChat: () => set({ isOpen: true }),
      closeChat: () => set({ isOpen: false }),
      toggleChat: () => set((state) => ({ isOpen: !state.isOpen })),

      getMessages: (courseId) => {
        const key = courseId.toString();
        return get().chatsByCourse[key] || [];
      },

      addMessage: (courseId, message) =>
        set((state) => {
          const key = courseId.toString();
          const existing = state.chatsByCourse[key] || [];
          const next = [...existing, message];
          const capped =
            next.length > 50 ? next.slice(next.length - 50) : next;

          return {
            chatsByCourse: {
              ...state.chatsByCourse,
              [key]: capped,
            },
          };
        }),

      updateLastAiMessage: (courseId, updater) =>
        set((state) => {
          const key = courseId.toString();
          const existing = state.chatsByCourse[key] || [];
          if (existing.length === 0) {
            return state;
          }

          const updated = [...existing];
          const lastIndex = updated.length - 1;
          updated[lastIndex] = updater(updated[lastIndex]);

          return {
            chatsByCourse: {
              ...state.chatsByCourse,
              [key]: updated,
            },
          };
        }),

      clearCourse: (courseId) =>
        set((state) => {
          const key = courseId.toString();
          const { [key]: _removed, ...rest } = state.chatsByCourse;
          return { chatsByCourse: rest };
        }),
    }),
    {
      name: "ai-chat-storage",
      partialize: (state) => ({
        chatsByCourse: state.chatsByCourse,
      }),
    }
  )
);

