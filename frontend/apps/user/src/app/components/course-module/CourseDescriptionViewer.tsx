import React from "react";
import { ArticleViewer } from "../learning/ArticleViewer";

interface CourseDescriptionViewerProps {
  description: string;
}

const isHtml = (content: string) => content.trimStart().startsWith("<");

export const CourseDescriptionViewer: React.FC<CourseDescriptionViewerProps> = ({ description }) => {
  const html = isHtml(description)
    ? description
    : description
        .split("\n")
        .map((line) => `<p>${line}</p>`)
        .join("");
  return <ArticleViewer html={html} />;
};
