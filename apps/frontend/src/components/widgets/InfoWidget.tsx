import React from 'react';
import BaseWidget from './BaseWidget';
import MobileWidget from './MobileWidget';

const InfoWidget: React.FC = () => {
  // GitHub icon from the SVG file
  const githubIcon = (
    <svg width="20" height="20" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" transform="scale(64)" fill="currentColor"/>
    </svg>
  );

  // X (Twitter) icon
  const xIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" fill="currentColor"/>
    </svg>
  );

  const widgetContent = (
    <div className="flex flex-col items-center">
      <div className="mb-3 text-center">
        {/*<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">*/}
        {/*  Pix Canvas*/}
        {/*</h3>*/}
        {/*<p className="text-sm text-gray-600 dark:text-gray-400">*/}
        {/*  An open-source collaborative pixel art canvas*/}
        {/*</p>*/}
      </div>

      <div className="w-full space-y-2">
        <a 
          href="https://github.com/hmldns/pix-canvas" 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            flex items-center justify-center
            px-4 py-2 w-full
            bg-gray-800 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600
            text-white
            rounded-md
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          "
        >
          <span className="mr-2 w-5 h-5">
            {githubIcon}
          </span>
          <span>View on GitHub</span>
        </a>

        <a 
          href="https://x.com/ivan_mkrv" 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            flex items-center justify-center
            px-4 py-2 w-full
            bg-black hover:bg-gray-900 dark:bg-black dark:hover:bg-gray-900
            text-white
            rounded-md
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
          "
        >
          <span className="mr-2 w-5 h-5">
            {xIcon}
          </span>
          <span>Author on X</span>
        </a>
      </div>
    </div>
  );

  // Combined icon for mobile widget
  const combinedIcon = (
    <div className="flex items-center space-x-1">
      <span className="w-5 h-5">{githubIcon}</span>
      <span className="w-5 h-5">{xIcon}</span>
    </div>
  );

  return (
    <>
      <MobileWidget
        title="About"
        panelId="info"
        icon={combinedIcon}
        position="bottom-right"
        className="mr-16" // Position it to the left of the color palette widget
      >
        {widgetContent}
      </MobileWidget>
      <BaseWidget 
        title="About" 
        position="bottom-right"
        defaultCollapsed={false}
        className="mr-80" // Position it more to the left for desktop view
      >
        {widgetContent}
      </BaseWidget>
    </>
  );
};

export default InfoWidget;
