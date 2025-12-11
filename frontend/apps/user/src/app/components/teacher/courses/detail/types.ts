export type TabId = "overview" | "curriculum" | "students" | "reviews";

export interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

