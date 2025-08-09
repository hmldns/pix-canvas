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

  // Discord icon
  const discordIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" fill="currentColor"/>
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

        <a 
          href="https://discord.gg/nautex" 
          target="_blank" 
          rel="noopener noreferrer"
          className="
            flex items-center justify-center
            px-4 py-2 w-full
            bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700
            text-white
            rounded-md
            transition-colors duration-150
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          "
        >
          <span className="mr-2 w-5 h-5">
            {discordIcon}
          </span>
          <span>More On Discord</span>
        </a>
      </div>
    </div>
  );

  // Combined icon for mobile widget
  const combinedIcon = (
    <div className="flex items-center space-x-1">
      <span className="w-4 h-4">{githubIcon}</span>
      <span className="w-4 h-4">{xIcon}</span>
      <span className="w-4 h-4">{discordIcon}</span>
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
