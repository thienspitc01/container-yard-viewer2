import React, { useState } from 'react';
import { VesselStatsData, BlockConfig } from '../types';

interface VesselStatisticsProps {
  statsData: VesselStatsData;
  vessels: string[];
  blocks: BlockConfig[];
}

const VesselStatistics: React.FC<VesselStatisticsProps> = ({ statsData, vessels, blocks }) => {
  const [isOpen, setIsOpen] = useState(true); // Default to open
  const [selectedVessels, setSelectedVessels] = useState<string[]>(['EVER ORIENT', 'KMTC NAGOYA']);

  const handleVesselSelection = (vessel: string) => {
    setSelectedVessels(prev =>
      prev.includes(vessel)
        ? prev.filter(v => v !== vessel)
        : [...prev, vessel]
    );
  };

  const displayedVessels = selectedVessels.filter(v => vessels.includes(v)).sort();

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-t-xl"
      >
        <span>Vessel Statistics</span>
        <svg
          className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Vessel Selection Checklist */}
            <div className="md:col-span-1">
              <h3 className="font-bold text-slate-800 mb-2">Select Vessels</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-2 bg-slate-50 p-3 rounded-md border">
                {vessels.map(vessel => (
                  <label key={vessel} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVessels.includes(vessel)}
                      onChange={() => handleVesselSelection(vessel)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{vessel}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Statistics Table */}
            <div className="md:col-span-3">
              <h3 className="font-bold text-slate-800 mb-2">Container Count per Block</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100 z-10">
                        Block
                      </th>
                      {displayedVessels.map(vessel => (
                        <th key={vessel} scope="col" className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                          {vessel}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {blocks.map(block => (
                      <tr key={block.name}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800 sticky left-0 bg-white z-10">
                          {block.name}
                        </td>
                        {displayedVessels.map(vessel => {
                          const count = statsData[block.name]?.[vessel] || 0;
                          return (
                            <td key={vessel} className={`px-4 py-3 whitespace-nowrap text-sm text-right ${count > 0 ? 'font-bold text-slate-700' : 'text-slate-400'}`}>
                              {count > 0 ? count : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VesselStatistics;
