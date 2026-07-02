import { useContext } from "react";
import { ThemeContext } from "@/components/theme-provider";
import { ThemeContextType } from "@/lib/types";

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  
  return context;
}
