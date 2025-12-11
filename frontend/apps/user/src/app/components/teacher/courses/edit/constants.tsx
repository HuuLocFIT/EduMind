import { BookOpen, FileText, DollarSign, Settings } from "lucide-react";
import type { Tab } from "./types";

export const TABS: Tab[] = [
  { id: "basic", label: "Basic Info", icon: <BookOpen className="w-4 h-4" /> },
  { id: "curriculum", label: "Curriculum", icon: <FileText className="w-4 h-4" /> },
  { id: "pricing", label: "Pricing", icon: <DollarSign className="w-4 h-4" /> },
  { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
];

