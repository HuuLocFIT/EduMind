import React, { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useAiChatStore } from '../../../../stores/aiChat.store';

const AiChatPanel = React.lazy(() =>
  import('../../../../components/learning/AiChatPanel').then((m) => ({ default: m.AiChatPanel }))
);

export interface AiTutorOverlayProps {
  courseId: number;
  hidden?: boolean;
  anchorToPlayerHeader?: boolean;
}

export const AiTutorOverlay: React.FC<AiTutorOverlayProps> = ({
  courseId,
  hidden = false,
  anchorToPlayerHeader = false,
}) => {
  const { isOpen: isChatOpen, closeChat, toggleChat } = useAiChatStore();

  useEffect(() => {
    if (hidden && isChatOpen) closeChat();
  }, [hidden, isChatOpen, closeChat]);

  if (hidden) return null;

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

      {/* Preserve the established VoiceOver control and dynamic accessible
          name. While the modal is open it is only visually suppressed, so a
          second floating X cannot cover the mobile composer. */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isChatOpen ? 'Close AI Course Tutor' : 'Open AI Course Tutor'}
        aria-expanded={isChatOpen}
        aria-controls="ai-course-tutor-dialog"
        className={`${isChatOpen ? 'sr-only' : 'fixed'} bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:bg-indigo-700 [@media(max-height:32rem)]:absolute [@media(max-height:32rem)]:bottom-auto [@media(max-height:32rem)]:right-14 [@media(max-height:32rem)]:top-1 [@media(max-height:32rem)]:p-2.5 md:bottom-24 md:right-6 ${anchorToPlayerHeader ? 'xl:absolute xl:bottom-auto xl:right-4 xl:top-1/2 xl:-translate-y-1/2' : 'xl:right-[21rem]'}`}
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
