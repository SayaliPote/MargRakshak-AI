import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative inline-flex items-center h-8 w-14 rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white ${
        isDark
          ? 'bg-[#151821] border-gray-800'
          : 'bg-gray-100 border-gray-200'
      } ${className}`}
    >
      <span
        className={`absolute top-1 flex items-center justify-center h-5.5 w-5.5 rounded-full shadow-subtle transition-transform duration-300 ${
          isDark ? 'translate-x-7 bg-white text-black' : 'translate-x-1 bg-black text-white'
        }`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-black" />
        ) : (
          <Sun className="w-3 h-3 text-white" />
        )}
      </span>
    </button>
  );
}
