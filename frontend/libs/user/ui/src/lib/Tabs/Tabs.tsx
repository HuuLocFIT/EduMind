import React, { createContext, useContext, useState, useCallback } from "react";
import { clsx } from "clsx";

/* ─── Context ─── */
interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
};

/* ─── Tabs (root) ─── */
export interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}) => {
  const [internal, setInternal] = useState(defaultValue);
  const activeValue = value ?? internal;

  const setActiveValue = useCallback(
    (v: string) => {
      if (!value) setInternal(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

/* ─── TabsList ─── */
export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className, children }) => (
  <div
    role="tablist"
    className={clsx(
      "inline-flex items-center gap-1 border-b border-gray-200",
      className,
    )}
  >
    {children}
  </div>
);

/* ─── TabsTrigger ─── */
export interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({
  value,
  className,
  children,
}) => {
  const { activeValue, setActiveValue } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      onClick={() => setActiveValue(value)}
      className={clsx(
        "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2",
        isActive
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
        className,
      )}
    >
      {children}
    </button>
  );
};

/* ─── TabsContent ─── */
export interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export const TabsContent: React.FC<TabsContentProps> = ({
  value,
  className,
  children,
}) => {
  const { activeValue } = useTabsContext();
  if (activeValue !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
};
