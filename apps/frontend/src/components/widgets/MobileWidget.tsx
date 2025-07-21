import React, { ReactNode } from 'react';
import { useMobilePanel, MobilePanel } from '@contexts/MobilePanelContext';

export interface MobileWidgetProps {
  title: string;
  children: ReactNode;
  panelId: MobilePanel;
  icon: ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const MobileWidget: React.FC<MobileWidgetProps> = ({
  title,
  children,
  panelId,
  icon,
  position = 'top-left',
  className = ''
}) => {
  const { activePanel, togglePanel, isMobile } = useMobilePanel();
  const isActive = activePanel === panelId;
  const isExpanded = isActive && isMobile;

  // Define mobile icon positions to create a neat grid
  const getMobileIconPosition = () => {
    const iconPositions = {
      'connection': 'top-4 left-4',
      'volume': 'top-4 left-16', // 60px from left (16 * 4px)
      'users': 'top-4 right-4',
      'chat': 'bottom-4 left-4',
      'colors': 'bottom-4 right-4',
      'info': 'bottom-4 right-16' // 60px from right (16 * 4px), to the left of colors
    };
    return iconPositions[panelId as keyof typeof iconPositions] || positionClasses[position];
  };

  // Get panel position - bottom panels should appear above their buttons
  const getPanelPosition = () => {
    if (panelId === 'chat') {
      return 'bottom-16 left-4'; // Show above the chat button
    }
    if (panelId === 'colors') {
      return 'bottom-16 right-4'; // Show above the colors button
    }
    if (panelId === 'info') {
      return 'bottom-16 right-16'; // Show above the info button
    }
    // Top panels show below their buttons
    return getMobileIconPosition();
  };

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const handleToggle = () => {
    if (isMobile) {
      togglePanel(panelId);
    }
  };

  if (isMobile) {
    return (
      <>
        {/* Mobile Icon Button */}
        <div className={`
          absolute z-20 
          ${getMobileIconPosition()}
          ${className}
        `}>
          <button
            onClick={handleToggle}
            className={`
              p-3 rounded-lg
              bg-white dark:bg-gray-800
              border border-gray-200 dark:border-gray-700
              text-gray-700 dark:text-gray-300
              hover:bg-gray-50 dark:hover:bg-gray-750
              hover:text-gray-900 dark:hover:text-gray-100
              transition-all duration-200
              shadow-lg hover:shadow-xl
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isActive ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900' : ''}
            `}
            title={title}
          >
            {icon}
          </button>
        </div>

        {/* Mobile Normal-Sized Panel */}
        {isExpanded && (
          <div className={`
            absolute z-30 
            ${getPanelPosition()}
            ${className}
          `} style={{ 
            marginTop: (panelId === 'chat' || panelId === 'colors') ? '-56px' : '56px', // Bottom panels go up, top panels go down
            marginBottom: (panelId === 'chat' || panelId === 'colors') ? '56px' : undefined,
            marginLeft: position.includes('left') ? '0px' : undefined, 
            marginRight: position.includes('right') ? '0px' : undefined,
            maxWidth: '90vw' // Ensure panels don't exceed viewport width
          }}>
            <div className="
              bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700
              rounded-lg shadow-xl
              min-w-72 max-w-sm
              max-h-80
              flex flex-col
            ">
              {/* Panel Header */}
              <div className="
                flex items-center justify-between
                px-4 py-3
                bg-gray-50 dark:bg-gray-700
                border-b border-gray-200 dark:border-gray-700
                rounded-t-lg
              ">
                <h3 className="
                  text-sm font-medium
                  text-gray-900 dark:text-gray-100
                ">
                  {title}
                </h3>

                <button 
                  onClick={handleToggle}
                  className="
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-200
                    transition-colors duration-150
                    p-1
                  "
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {children}
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop version - return null, handled by BaseWidget
  return null;
};

export default MobileWidget;
