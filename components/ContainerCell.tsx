import React from 'react';
import { Container } from '../types';

interface ContainerCellProps {
  container?: Container;
  isHighlighted?: boolean;
  selectedVessels: string[];
  filterColors: string[];
}

const ownerColors: { [key: string]: string } = {
  'MAERSK': 'bg-sky-400 text-white',
  'MSC': 'bg-yellow-400 text-black',
  'CMA': 'bg-blue-600 text-white',
  'COSCO': 'bg-blue-800 text-white',
  'HAPAG': 'bg-orange-500 text-white',
  'ONE': 'bg-pink-500 text-white',
  'EVERGREEN': 'bg-green-600 text-white',
  'OOCL': 'bg-amber-400 text-black',
  'ZIM': 'bg-gray-700 text-white',
  'WAN HAI': 'bg-red-600 text-white',
};
const defaultOwnerColor = 'bg-slate-500 text-white';
const mutedVesselColor = 'bg-slate-300';


const getColorForOwner = (owner: string): string => {
  if (!owner) return defaultOwnerColor;
  const upperOwner = owner.toUpperCase();
  for (const key in ownerColors) {
    if (upperOwner.includes(key)) {
      return ownerColors[key];
    }
  }
  return defaultOwnerColor;
};

const ContainerCell: React.FC<ContainerCellProps> = ({ container, isHighlighted, selectedVessels, filterColors }) => {
  // Empty slot
  if (!container) {
    return (
      <div 
        className="w-5 h-5 border-t border-l border-slate-300 bg-slate-200/80 flex-shrink-0 relative overflow-hidden" 
        title="Empty Slot"
      >
         <svg className="absolute w-full h-full text-slate-400/50" stroke="currentColor" strokeWidth="0.5">
          <line x1="0" y1="0" x2="100%" y2="100%" />
          <line x1="100%" y1="0" x2="0" y2="100%" />
        </svg>
      </div>
    );
  }

  let tooltipText = `Container: ${container.id}\nOwner: ${container.owner}\nLocation: ${container.location} (${container.size}')`;
  if (container.vessel) {
    tooltipText += `\nVessel: ${container.vessel}`;
  }
  
  const baseClasses = "w-5 h-5 border-t border-l border-gray-900/20 flex-shrink-0 flex items-center justify-center cursor-pointer transition-transform duration-150 relative";
  const scaleClass = isHighlighted ? 'scale-150 z-20' : 'hover:scale-125 hover:z-10';
  const highlightClass = isHighlighted ? 'ring-4 ring-lime-400 ring-offset-2 ring-offset-white' : '';

  let colorClass = '';
  const activeFilters = selectedVessels.some(v => v !== '');

  // Special handling for the 'end' part of a 40' container for consistent styling.
  if (container.isMultiBay && container.partType === 'end') {
      let isVisible = !activeFilters;
      if (activeFilters) {
          const vesselIndex = selectedVessels.indexOf(container.vessel || '');
          if (vesselIndex !== -1) {
              isVisible = true; // It's visible if it matches a filter
          }
      }

      if (isVisible) {
          return (
              <div
                  className={`${baseClasses} bg-black text-white ${scaleClass} ${highlightClass}`}
                  title={tooltipText}
              >
                  <svg className="absolute w-full h-full" stroke="white" strokeWidth="1.5">
                      <line x1="10%" y1="10%" x2="90%" y2="90%" />
                      <line x1="90%" y1="10%" x2="10%" y2="90%" />
                  </svg>
              </div>
          );
      } else {
          // If filtered out, it becomes muted gray
          colorClass = mutedVesselColor;
      }
  }
  // Logic for 20' containers and the 'start' part of 40' containers
  else if (activeFilters) {
    const vesselIndex = selectedVessels.indexOf(container.vessel || '');
    if (vesselIndex !== -1) {
        colorClass = filterColors[vesselIndex] || defaultOwnerColor;
    } else {
        colorClass = mutedVesselColor;
    }
  } 
  else {
      if (container.isMultiBay && container.partType === 'start') {
          colorClass = 'bg-blue-500';
      } else {
          colorClass = getColorForOwner(container.owner);
      }
  }

  return (
    <div
      className={`${baseClasses} ${colorClass} ${scaleClass} ${highlightClass}`}
      title={tooltipText}
    >
    </div>
  );
};

export default ContainerCell;