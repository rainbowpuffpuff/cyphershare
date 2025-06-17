import { createContext, useContext, useState, ReactNode } from "react";

type DebugConsoleContextType = {
  activeConsole: string | null;
  setActiveConsole: (id: string | null) => void;
};

const DebugConsoleContext = createContext<DebugConsoleContextType | undefined>(
  undefined
);

export const DebugConsoleProvider = ({ children }: { children: ReactNode }) => {
  const [activeConsole, setActiveConsole] = useState<string | null>(null);

  return (
    <DebugConsoleContext.Provider value={{ activeConsole, setActiveConsole }}>
      {children}
    </DebugConsoleContext.Provider>
  );
};

export const useDebugConsole = () => {
  const context = useContext(DebugConsoleContext);
  if (context === undefined) {
    throw new Error(
      "useDebugConsole must be used within a DebugConsoleProvider"
    );
  }
  return context;
};
