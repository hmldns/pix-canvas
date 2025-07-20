import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ColorContextType {
  selectedColor: string;
  recentColors: string[];
  setSelectedColor: (color: string) => void;
  addToRecentColors: (color: string) => void;
}

const ColorContext = createContext<ColorContextType | undefined>(undefined);

export const useColorContext = () => {
  const context = useContext(ColorContext);
  if (context === undefined) {
    throw new Error('useColorContext must be used within a ColorProvider');
  }
  return context;
};

interface ColorProviderProps {
  children: React.ReactNode;
}

export const ColorProvider: React.FC<ColorProviderProps> = ({ children }) => {
  const [selectedColor, setSelectedColorState] = useState('#FF0000');
  const [recentColors, setRecentColors] = useState<string[]>([]);

  // Load recent colors from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('pix-canvas-recent-colors');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentColors(parsed);
        }
      } catch (error) {
        console.warn('Failed to parse recent colors from localStorage:', error);
      }
    }
  }, []);

  // Save recent colors to localStorage when they change
  useEffect(() => {
    localStorage.setItem('pix-canvas-recent-colors', JSON.stringify(recentColors));
  }, [recentColors]);

  const setSelectedColor = useCallback((color: string) => {
    setSelectedColorState(color);
    addToRecentColors(color);
  }, []);

  const addToRecentColors = useCallback((color: string) => {
    setRecentColors(prev => {
      // Remove color if it already exists to avoid duplicates
      const filtered = prev.filter(c => c !== color);
      // Add to front and limit to 8 recent colors
      const updated = [color, ...filtered].slice(0, 8);
      return updated;
    });
  }, []);

  const value: ColorContextType = {
    selectedColor,
    recentColors,
    setSelectedColor,
    addToRecentColors,
  };

  return (
    <ColorContext.Provider value={value}>
      {children}
    </ColorContext.Provider>
  );
};