import { createContext, useState, useEffect } from "react";

type Theme = "light" | "dark";
type ColorScheme = "blue" | "green" | "pink" | "red";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  colorScheme?: ColorScheme;
}

interface ThemeContextType {
  theme: Theme;
  colorScheme: ColorScheme;
  setTheme: (theme: Theme) => void;
  setColorScheme: (scheme: ColorScheme) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  colorScheme: "blue",
  setTheme: () => null,
  setColorScheme: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "light",
  colorScheme = "blue",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(colorScheme);

  useEffect(() => {
    // Check for system preference on initial load
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    const storedColorScheme = localStorage.getItem("colorScheme") as ColorScheme | null;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else if (systemPrefersDark) {
      setTheme("dark");
    }
    
    if (storedColorScheme) {
      setCurrentColorScheme(storedColorScheme);
    }
  }, []);

  useEffect(() => {
    // Apply theme class to document
    const root = window.document.documentElement;
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    
    // Store theme preference
    localStorage.setItem("theme", theme);
  }, [theme]);
  
  useEffect(() => {
    // Apply color scheme attribute to document
    const root = window.document.documentElement;
    root.setAttribute("data-theme", currentColorScheme);
    
    // Store color scheme preference
    localStorage.setItem("colorScheme", currentColorScheme);
  }, [currentColorScheme]);

  const value = {
    theme,
    colorScheme: currentColorScheme,
    setTheme: (newTheme: Theme) => setTheme(newTheme),
    setColorScheme: (newScheme: ColorScheme) => setCurrentColorScheme(newScheme),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
