import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useId,
  useEffect,
} from "react";
import { clsx } from "clsx";
import { flushSync } from "react-dom";

/* ─── Context ─── */
interface TabsContextValue {
  activeValue: string;
  setActiveValue: (value: string) => void;
  baseId: string;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  focusTab: (value: string) => void;
  getTabValues: () => string[];
  tabButtonRefs: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
};

/* ─── Helpers ─── */
const useStableId = () => useId().replace(/:/g, "");

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
  const baseId = useStableId();
  const tabsRef = useRef<string[]>([]);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const setActiveValue = useCallback(
    (v: string) => {
      if (!value) setInternal(v);
      onValueChange?.(v);
    },
    [value, onValueChange],
  );

  const registerTab = useCallback((tabValue: string) => {
    if (!tabsRef.current.includes(tabValue)) {
      tabsRef.current = [...tabsRef.current, tabValue];
    }
  }, []);

  const unregisterTab = useCallback((tabValue: string) => {
    tabsRef.current = tabsRef.current.filter((v) => v !== tabValue);
    tabButtonRefs.current[tabValue] = null;
  }, []);

  const focusTab = useCallback((tabValue: string) => {
    tabButtonRefs.current[tabValue]?.focus();
  }, []);

  const getTabValues = useCallback(() => tabsRef.current, []);

  return (
    <TabsContext.Provider
      value={{
        activeValue,
        setActiveValue,
        baseId,
        registerTab,
        unregisterTab,
        focusTab,
        getTabValues,
        tabButtonRefs,
      }}
    >
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

/* ─── TabsList ─── */
export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export const TabsList: React.FC<TabsListProps> = ({ className, children }) => {
  const { activeValue, setActiveValue, getTabValues, focusTab } = useTabsContext();

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const tabs = getTabValues();
      if (tabs.length === 0) return;

      const currentIndex = tabs.indexOf(activeValue);
      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % tabs.length;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const nextValue = tabs[nextIndex];
      if (nextValue && nextValue !== activeValue) {
        flushSync(() => setActiveValue(nextValue));
        focusTab(nextValue);
      }
    },
    [activeValue, setActiveValue, getTabValues, focusTab],
  );

  return (
    <div
      role="tablist"
      onKeyDown={handleKeyDown}
      className={clsx(
        "inline-flex items-center gap-1 border-b border-gray-200",
        className,
      )}
    >
      {children}
    </div>
  );
};

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
  const {
    activeValue,
    setActiveValue,
    baseId,
    registerTab,
    unregisterTab,
    focusTab,
    tabButtonRefs,
  } = useTabsContext();
  const isActive = activeValue === value;
  const tabId = `${baseId}-tab-${value}`;

  useEffect(() => {
    registerTab(value);
    return () => unregisterTab(value);
  }, [value, registerTab, unregisterTab]);

  const setButtonRef = useCallback(
    (node: HTMLButtonElement | null) => {
      tabButtonRefs.current[value] = node;
    },
    [value, tabButtonRefs],
  );

  return (
    <button
      ref={setButtonRef}
      role="tab"
      type="button"
      id={tabId}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      onClick={() => {
        setActiveValue(value);
        focusTab(value);
      }}
      className={clsx(
        "px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
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
  const { activeValue, baseId } = useTabsContext();
  const isActive = activeValue === value;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!isActive}
      tabIndex={isActive ? 0 : -1}
      className={clsx("outline-none", className)}
    >
      {children}
    </div>
  );
};
