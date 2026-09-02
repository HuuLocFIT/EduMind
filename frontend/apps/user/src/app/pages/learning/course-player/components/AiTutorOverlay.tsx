import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { useAiChatStore } from '../../../../stores/aiChat.store';

const AiChatPanel = React.lazy(() =>
  import('../../../../components/learning/AiChatPanel').then((m) => ({ default: m.AiChatPanel }))
);

export interface AiTutorOverlayProps {
  courseId: number;
  hidden?: boolean;
  anchorToPlayerHeader?: boolean;
  onSelectLesson?: (lessonId: number) => void;
}

export const AiTutorOverlay: React.FC<AiTutorOverlayProps> = ({
  courseId,
  hidden = false,
  anchorToPlayerHeader = false,
  onSelectLesson,
}) => {
  const { isOpen: isChatOpen, closeChat, toggleChat } = useAiChatStore();

  useEffect(() => {
    if (hidden && isChatOpen) closeChat();
  }, [hidden, isChatOpen, closeChat]);

  if (hidden) return null;

  return (
    <>
      {/* Rendered via a portal to document.body: this component is mounted
          inside CoursePlayerHeader (a `sticky z-20` element, which creates
          its own stacking context), so a fixed-position child here would
          otherwise be capped at that z-20 level and get painted over by
          LessonNavigation (`sticky z-30`) elsewhere in the tree — even
          though this panel itself is `z-50`. Portaling escapes that
          ancestor stacking context entirely. */}
      {isChatOpen &&
        createPortal(
          <>
            {/* Mobile backdrop */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="Close AI Tutor"
              className="fixed inset-0 z-40 xl:hidden"
              onClick={closeChat}
            />

            <React.Suspense fallback={null}>
              <AiChatPanel
                courseId={courseId}
                onClose={closeChat}
                onSelectLesson={onSelectLesson
                  ? (lessonId) => {
                      onSelectLesson(lessonId);
                      closeChat();
                    }
                  : undefined}
              />
            </React.Suspense>
          </>,
          document.body
        )}

      {/* Preserve the established VoiceOver control and dynamic accessible
          name. While the modal is open it is only visually suppressed via
          opacity (not sr-only) so its geometry never changes at the moment
          focus is restored to it on close — a position/size jump right as
          focus lands is what was causing VoiceOver to lose the focus target.
          Opacity is intentionally NOT transitioned: an animated 0→1 fade
          leaves the element at near-zero opacity for most of the transition,
          during which Safari/VoiceOver can fail to expose it in the
          accessibility tree — so focus must land on it only once opacity is
          already fully settled at 1, i.e. instantly. */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isChatOpen ? 'Close AI Tutor' : 'Open AI Tutor'}
        aria-expanded={isChatOpen}
        aria-controls="ai-course-tutor-dialog"
        className={`fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-indigo-700 [@media(max-height:32rem)]:absolute [@media(max-height:32rem)]:bottom-auto [@media(max-height:32rem)]:right-16 [@media(max-height:32rem)]:top-1 [@media(max-height:32rem)]:p-2.5 md:bottom-24 md:right-6 ${isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${anchorToPlayerHeader ? 'xl:absolute xl:bottom-auto xl:right-4 xl:top-1/2 xl:-translate-y-1/2' : 'xl:right-[21rem]'}`}
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
