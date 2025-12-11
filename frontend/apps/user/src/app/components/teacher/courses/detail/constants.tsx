import { BarChart3, BookOpen, Users, Star } from "lucide-react";
import type { Tab } from "./types";

export const TABS: Tab[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "curriculum", label: "Curriculum", icon: <BookOpen className="w-4 h-4" /> },
  { id: "students", label: "Students", icon: <Users className="w-4 h-4" /> },
  { id: "reviews", label: "Reviews", icon: <Star className="w-4 h-4" /> },
];

