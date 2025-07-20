import React, { useState, ReactNode } from 'react';

export interface BaseWidgetProps {
  title: string;
  children: ReactNode;
  defaultCollapsed?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}

const BaseWidget: React.FC<BaseWidgetProps> = ({
  title,
  children,
  defaultCollapsed = false,
  position = 'top-left',
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`
      absolute z-10 
      ${positionClasses[position]}
      ${className}
    `}>
      <div className="
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700
        rounded-lg shadow-lg
        min-w-64 max-w-sm
        transition-all duration-200 ease-in-out
      ">
        {/* Widget Header */}
        <div 
          className="
            flex items-center justify-between
            px-4 py-3
            bg-gray-50 dark:bg-gray-700
            border-b border-gray-200 dark:border-gray-700
            rounded-t-lg
            cursor-pointer
            hover:bg-gray-100 dark:hover:bg-gray-600
            transition-colors duration-150
          "
          onClick={toggleCollapsed}
        >
          <h3 className="
            text-sm font-medium
            text-gray-900 dark:text-gray-100
            select-none
          ">
            {title}
          </h3>
          
          {/* Collapse/Expand Icon */}
          <button className="
            text-gray-500 dark:text-gray-400
            hover:text-gray-700 dark:hover:text-gray-200
            transition-colors duration-150
            p-1
          ">
            <svg 
              className={`
                w-4 h-4 transition-transform duration-200
                ${isCollapsed ? 'rotate-180' : ''}
              `}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </svg>
          </button>
        </div>

        {/* Widget Content */}
        <div className={`
          overflow-hidden transition-all duration-200 ease-in-out
          ${isCollapsed ? 'max-h-0' : 'max-h-96'}
        `}>
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BaseWidget;