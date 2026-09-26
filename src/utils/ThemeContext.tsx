import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { ThemeName } from '../types';

type ThemeContextValue = {
  currentTheme: ThemeName;
  changeCurrentTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: 'light',
  changeCurrentTheme: () => undefined,
});

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const persistedTheme = localStorage.getItem('theme');
  const [theme, setTheme] = useState<ThemeName>(
    persistedTheme === 'dark' ? 'dark' : 'light',
  );

  const changeCurrentTheme = (newTheme: ThemeName) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ currentTheme: theme, changeCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useThemeProvider = (): ThemeContextValue => useContext(ThemeContext);
