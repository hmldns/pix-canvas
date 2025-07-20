import React, { useState, useEffect } from 'react';
import BaseWidget from './BaseWidget';

interface VolumeControlWidgetProps {
  onVolumeChange: (volume: number) => void;
  onToggleEnabled: (enabled: boolean) => void;
  initialVolume?: number;
  initialEnabled?: boolean;
}

const VolumeControlWidget: React.FC<VolumeControlWidgetProps> = ({
  onVolumeChange,
  onToggleEnabled,
  initialVolume = 0.3,
  initialEnabled = true,
}) => {
  const [volume, setVolume] = useState(initialVolume);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    onVolumeChange(volume);
  }, [volume, onVolumeChange]);

  useEffect(() => {
    onToggleEnabled(enabled);
  }, [enabled, onToggleEnabled]);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  const handleEnabledToggle = () => {
    setEnabled(!enabled);
  };

  const getVolumeIcon = () => {
    if (!enabled) return '🔇';
    if (volume === 0) return '🔇';
    if (volume < 0.3) return '🔉';
    if (volume < 0.7) return '🔊';
    return '🔊';
  };

  const content = (
    <div className="space-y-3">
      {/* Sound toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Sound Effects
        </span>
        <button
          onClick={handleEnabledToggle}
          className={`w-10 h-6 rounded-full transition-colors duration-200 ${
            enabled 
              ? 'bg-blue-500 hover:bg-blue-600' 
              : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Volume control */}
      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Volume</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(volume * 100)}%
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getVolumeIcon()}</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume * 100}%, #E5E7EB ${volume * 100}%, #E5E7EB 100%)`
              }}
            />
          </div>
          
          {/* Quick preset buttons */}
          <div className="flex space-x-1">
            {[0, 0.3, 0.5, 0.8, 1.0].map((preset) => (
              <button
                key={preset}
                onClick={() => setVolume(preset)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  Math.abs(volume - preset) < 0.05
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {preset === 0 ? 'Off' : `${Math.round(preset * 100)}%`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="absolute top-4 left-72 z-10">
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
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <h3 className="
            text-sm font-medium
            text-gray-900 dark:text-gray-100
            select-none
          ">
            Audio
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
            {content}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolumeControlWidget;