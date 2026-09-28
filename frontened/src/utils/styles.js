import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Retained for canvas graphs like ForceGraph which need hex values
export const momentumColors = {
  dormant: '#4B5578',
  emerging: '#22E6D6',
  growing: '#6D5CF6',
  accelerating: '#F0399E',
  viral: '#FF3B5C',
};

export const alertColors = {
  critical: '#FF3B5C',
  accelerating: '#FF8A3D',
  emerging: '#FFD23D',
};

export const roleColors = {
  originator: '#22E6D6',
  amplifier: '#8B5CF6',
  bridge: '#FBBF24',
  authority: '#34D68F',
};
