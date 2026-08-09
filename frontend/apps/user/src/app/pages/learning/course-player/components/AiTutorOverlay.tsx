import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAiChatStore } from '../../../../stores/aiChat.store';

const AiChatPanel = React.lazy(() =>
  import('../../../../components/learning/AiChatPanel').then((m) => ({ default: m.AiChatPanel }))
);

export interface AiTutorOverlayProps {
  courseId: number;
}

export const AiTutorOverlay: React.FC<AiTutorOverlayProps> = ({ courseId }) => {
  const { isOpen: isChatOpen, closeChat, toggleChat } = useAiChatStore();

  return (
    <>
      {/* Mobile backdrop */}
      {isChatOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close AI Course Tutor"
          className="fixed inset-0 z-40 xl:hidden"
          onClick={closeChat}
        />
      )}

      {/* Panel */}
      {isChatOpen && (
        <React.Suspense fallback={null}>
          <AiChatPanel courseId={courseId} onClose={closeChat} />
        </React.Suspense>
      )}

      {/* Floating pill trigger */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isChatOpen ? 'Close AI Course Tutor' : 'Open AI Course Tutor'}
        aria-expanded={isChatOpen}
        aria-controls="ai-course-tutor-dialog"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-4 py-3
                   bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold
                   rounded-full shadow-lg transition-all duration-200
                   md:bottom-24 md:right-6"
      >
        {isChatOpen ? (
          <X aria-hidden="true" className="w-4 h-4" />
        ) : (
          <Sparkles aria-hidden="true" className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">
          {isChatOpen ? 'Close' : 'AI Tutor'}
        </span>
      </button>
    </>
  );
};
