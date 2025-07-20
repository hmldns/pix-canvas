// Random name generator utility for creating user nicknames
import { uniqueNamesGenerator, Config, adjectives, animals } from 'unique-names-generator';

// Configuration for the name generator
const nameConfig: Config = {
  dictionaries: [adjectives, animals],
  separator: '',
  style: 'capital',
  length: 2,
};

// Color palette for user avatars
const userColors = [
  '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#FF3333',
  '#33FFF3', '#F3FF33', '#FF8333', '#8333FF', '#33FF83',
  '#5733FF', '#FF5783', '#57FF33', '#3383FF', '#FF3357'
];

/**
 * Generates a random, human-readable nickname using the unique-names-generator library
 * @returns A random two-word nickname in PascalCase (e.g., "WittyOtter")
 */
export function generateRandomNickname(): string {
  return uniqueNamesGenerator(nameConfig);
}

/**
 * Generates a random color from the predefined palette
 * @returns A hex color string (e.g., "#FF5733")
 */
export function generateRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * userColors.length);
  return userColors[randomIndex];
}

/**
 * Generates a unique user ID
 * @returns A unique identifier string
 */
export function generateUserId(): string {
  return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validates if a color string is a valid hex color
 * @param color - The color string to validate
 * @returns true if valid hex color, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
  return hexColorRegex.test(color);
}

/**
 * Validates canvas coordinates
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns true if coordinates are within the 5000x5000 canvas bounds
 */
export function isValidCanvasCoordinate(x: number, y: number): boolean {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    x < 5000 &&
    y >= 0 &&
    y < 5000
  );
}