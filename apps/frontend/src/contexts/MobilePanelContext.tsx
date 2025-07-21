import React, { createContext, useContext, useState, useEffect } from 'react';

export type MobilePanel = 'connection' | 'users' | 'chat' | 'colors' | 'volume' | null;

interface MobilePanelContextType {
  activePanel: MobilePanel;
  setActivePanel: (panel: MobilePanel) => void;
  togglePanel: (panel: MobilePanel) => void;
  isMobile: boolean;
}

const MobilePanelContext = createContext<MobilePanelContextType | undefined>(undefined);

export const useMobilePanel = () => {
  const context = useContext(MobilePanelContext);
  if (context === undefined) {
    throw new Error('useMobilePanel must be used within a MobilePanelProvider');
  }
  return context;
};

interface MobilePanelProviderProps {
  children: React.ReactNode;
}

export const MobilePanelProvider: React.FC<MobilePanelProviderProps> = ({ children }) => {
  const [activePanel, setActivePanel] = useState<MobilePanel>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768; // md breakpoint
      setIsMobile(isMobileDevice);
      
      // If switching from mobile to desktop, clear active panel
      if (!isMobileDevice && activePanel) {
        setActivePanel(null);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [activePanel]);

  const togglePanel = (panel: MobilePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
  };

  const value: MobilePanelContextType = {
    activePanel,
    setActivePanel,
    togglePanel,
    isMobile,
  };

  return (
    <MobilePanelContext.Provider value={value}>
      {children}
    </MobilePanelContext.Provider>
  );
};