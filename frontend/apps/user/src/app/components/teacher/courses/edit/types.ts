export type TabId = "basic" | "curriculum" | "pricing" | "settings";

export interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

