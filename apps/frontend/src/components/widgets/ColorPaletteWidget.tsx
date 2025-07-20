import React, { useState } from 'react';
import BaseWidget from './BaseWidget';
import { useColorContext } from '@contexts/ColorContext';

const ColorPaletteWidget: React.FC = () => {
  const { selectedColor, recentColors, setSelectedColor } = useColorContext();
  
  // Predefined color palette
  const colorPalette = [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80',
    '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080',
    '#800000', '#804000', '#808000', '#408000', '#008000', '#008040',
    '#008080', '#004080', '#000080', '#400080', '#800080', '#800040',
    '#400000', '#402000', '#404000', '#204000', '#004000', '#004020',
    '#004040', '#002040', '#000040', '#200040', '#400040', '#400020',
    '#FFFFFF', '#C0C0C0', '#808080', '#404040', '#000000', '#200020'
  ];

  const [customColor, setCustomColor] = useState(selectedColor);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
    console.log('Selected color:', color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    setSelectedColor(color);
  };

  const toggleCustomPicker = () => {
    setShowCustomPicker(!showCustomPicker);
  };

  return (
    <BaseWidget 
      title="Color Palette" 
      position="bottom-right"
      defaultCollapsed={false}
    >
      <div className="space-y-4">
        {/* Current Color Display */}
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div 
            className="w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm"
            style={{ backgroundColor: selectedColor }}
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Selected Color
            </div>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
              {selectedColor.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Color Palette Grid */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
            Quick Colors
          </h4>
          <div className="grid grid-cols-6 gap-1.5">
            {colorPalette.map((color, index) => (
              <button
                key={index}
                onClick={() => handleColorSelect(color)}
                className={`
                  w-6 h-6 rounded border-2 transition-all duration-150
                  hover:scale-110 hover:z-10 relative
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                  ${selectedColor === color 
                    ? 'border-gray-900 dark:border-white shadow-lg scale-110' 
                    : 'border-gray-300 dark:border-gray-600'
                  }
                `}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>

        {/* Custom Color Picker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Custom Color
            </h4>
            <button
              onClick={toggleCustomPicker}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
            >
              {showCustomPicker ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {showCustomPicker && (
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={customColor}
                  onChange={handleCustomColorChange}
                  className="w-12 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={customColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setCustomColor(value);
                      if (value.length === 7) {
                        setSelectedColor(value);
                      }
                    }
                  }}
                  placeholder="#FF0000"
                  className="
                    flex-1 px-2 py-1 text-sm font-mono
                    bg-white dark:bg-gray-700
                    border border-gray-300 dark:border-gray-600
                    rounded
                    text-gray-900 dark:text-gray-100
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  "
                />
              </div>
            </div>
          )}
        </div>

        {/* Recent Colors */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2">
            Recent
          </h4>
          {recentColors.length > 0 ? (
            <div className="grid grid-cols-8 gap-1.5">
              {recentColors.map((color, index) => (
                <button
                  key={index}
                  onClick={() => handleColorSelect(color)}
                  className={`
                    w-6 h-6 rounded border-2 transition-all duration-150
                    hover:scale-110 hover:z-10 relative
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
                    ${selectedColor === color 
                      ? 'border-gray-900 dark:border-white shadow-lg scale-110' 
                      : 'border-gray-300 dark:border-gray-600'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
              No recent colors
            </div>
          )}
        </div>
      </div>
    </BaseWidget>
  );
};

export default ColorPaletteWidget;