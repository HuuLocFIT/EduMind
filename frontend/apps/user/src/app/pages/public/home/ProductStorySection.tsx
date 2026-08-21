import React from "react";
import {
  Award,
  BookOpenCheck,
  Bot,
  Captions,
  Compass,
  ListChecks,
  PlayCircle,
} from "lucide-react";

const features = [
  {
    icon: Captions,
    title: "Learn without losing momentum",
    description:
      "Move between video and article lessons with captions, saved playback position, and progress that follows you.",
  },
  {
    icon: Bot,
    title: "Ask with context",
    description:
      "Get streamed answers grounded in your course content, with lesson citations that make every response easier to trust.",
  },
  {
    icon: ListChecks,
    title: "Practice and retain",
    description:
      "Review AI-generated summaries, take focused quizzes, and get server-scored feedback while the material is still fresh.",
  },
  {
    icon: Award,
    title: "Prove your progress",
    description:
      "Track every completed lesson and earn a certificate that anyone can verify with its unique reference.",
  },
];
const journey = [
  { icon: Compass, label: "Discover", detail: "Find your next skill" },
  {
    icon: PlayCircle,
    label: "Learn",
    detail: "Build momentum lesson by lesson",
  },
  {
    icon: BookOpenCheck,
    label: "Practice",
    detail: "Check understanding as you go",
  },
  { icon: Award, label: "Earn", detail: "Share a verifiable certificate" },
];

export const ProductStorySection: React.FC = () => (
  <section
    className="bg-gray-50 py-12 sm:py-20"
    aria-labelledby="learning-experience-heading"
  >
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          One connected learning experience
        </p>
        <h2
          id="learning-experience-heading"
          className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl"
        >
          More than watching lessons
        </h2>
        <p className="mt-4 text-lg leading-8 text-gray-600">
          EduMind keeps content, practice, AI guidance, and progress together so
          your attention stays on learning.
        </p>
      </div>
      <p className="mt-7 text-center text-xs font-semibold uppercase tracking-wider text-blue-700 md:hidden">
        Swipe to explore <span aria-hidden="true">→</span>
      </p>
      <div className="-mx-4 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:mt-12 md:grid md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0">
        {features.map(({ icon: Icon, title, description }) => (
          <article
            key={title}
            className="group w-[calc(100vw-3rem)] max-w-sm flex-none snap-center rounded-2xl border border-gray-200 bg-white p-5 shadow-sm motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-lg sm:w-[70vw] sm:p-7 md:w-auto md:max-w-none"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 sm:h-12 sm:w-12">
              <Icon className="h-6 w-6" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-950 sm:mt-5 sm:text-xl">
              {title}
            </h3>
            <p className="mt-2 leading-7 text-gray-600">{description}</p>
          </article>
        ))}
      </div>
      <div className="mt-8 rounded-3xl bg-gray-950 px-4 py-6 text-white sm:mt-14 sm:px-8 sm:py-8 lg:px-10">
        <h3 className="mx-auto max-w-xs text-center text-lg font-bold sm:max-w-none sm:text-2xl">
          From curiosity to a shareable milestone
        </h3>
        <ol className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:gap-4 lg:grid-cols-4">
          {journey.map(({ icon: Icon, label, detail }, index) => (
            <li
              key={label}
              className="rounded-xl border border-gray-800 bg-gray-900 p-3.5 sm:rounded-2xl sm:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-blue-500/10 sm:h-10 sm:w-10 sm:rounded-xl">
                  <Icon
                    className="h-5 w-5 text-blue-400 sm:h-6 sm:w-6"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-[10px] font-bold tracking-wider text-gray-300 sm:text-xs sm:tracking-widest">
                  0{index + 1}
                </span>
              </div>
              <p className="mt-3 font-bold sm:mt-4">{label}</p>
              <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
                {detail}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  </section>
);
