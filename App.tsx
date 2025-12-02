

import React, { useState, useMemo, useEffect } from 'react';
import { Container, ParseStats, BlockConfig, BlockStats, RTG_BLOCK_NAMES } from './types';
import { parseExcelFile } from './services/excelService';
import FileUpload from './components/FileUpload';
import YardRowView from './components/YardRowView';
import HeapBlockView from './components/HeapBlockView';
import BlockConfigurator from './components/BlockConfigurator';
import VesselStatistics from './components/VesselStatistics';
import YardStatistics from './components/YardStatistics';
import DwellTimeStatistics from './components/DwellTimeStatistics';

const STORAGE_KEYS = {
  CONTAINERS: 'yard_containers_v1',
  STATS: 'yard_stats_v1',
  VESSELS: 'yard_vessels_v1',
  BLOCK_CONFIGS: 'yardBlockConfigs_v4' // Incremented version to include new Heap defaults
};

const getMachineType = (name: string): 'RTG' | 'RS' => {
    return RTG_BLOCK_NAMES.includes(name.toUpperCase()) ? 'RTG' : 'RS';
};

const DEFAULT_BLOCKS: BlockConfig[] = [
    // A1 - D1
    { name: 'A1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'B1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'C1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'D1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    
    // A2 - D2
    { name: 'A2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'B2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'C2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'D2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },

    // E1 - H1
    { name: 'E1', capacity: 600, group: 'GP', isDefault: true, totalBays: 28, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'F1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'G1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H1', capacity: 676, group: 'GP', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },

    // E2 - H2
    { name: 'E2', capacity: 598, group: 'GP', isDefault: true, totalBays: 28, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'F2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'G2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H2', capacity: 884, group: 'GP', isDefault: true, totalBays: 35, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },

    // Empty Blocks (0 series Part 1)
    { name: 'A0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'H0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'I0', capacity: 650, group: 'RỖNG', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },

    // N Series (Large)
    { name: 'N1', capacity: 376, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N2', capacity: 344, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N3', capacity: 408, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N4', capacity: 162, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },

    // Z & I Series
    { name: 'Z2', capacity: 516, group: 'GP', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'Z1', capacity: 126, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'I1', capacity: 504, group: 'GP', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'I2', capacity: 336, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    
    // Second E2 entry handled as E2-B
    { name: 'E2-B', capacity: 192, group: 'GP', isDefault: true, totalBays: 12, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },

    // Reefers
    { name: 'R1', capacity: 650, group: 'REEFER', isDefault: true, totalBays: 30, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'R3', capacity: 450, group: 'REEFER', isDefault: true, totalBays: 25, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },
    { name: 'R4', capacity: 259, group: 'REEFER', isDefault: true, totalBays: 15, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'R2', capacity: 400, group: 'REEFER', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 5, blockType: 'GRID' },

    // Empty Blocks (0 series Part 2)
    { name: 'B0', capacity: 1144, group: 'RỖNG', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'C0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'D0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'E0', capacity: 840, group: 'RỖNG', isDefault: true, totalBays: 32, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'F0', capacity: 80, group: 'RỖNG', isDefault: true, totalBays: 8, rowsPerBay: 4, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'L0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'M0', capacity: 940, group: 'RỖNG', isDefault: true, totalBays: 35, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },

    // Large GP
    { name: 'M1', capacity: 1128, group: 'GP', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'L1', capacity: 1128, group: 'GP', isDefault: true, totalBays: 40, rowsPerBay: 7, tiersPerBay: 6, blockType: 'GRID' },
    { name: 'K1', capacity: 378, group: 'GP', isDefault: true, totalBays: 20, rowsPerBay: 6, tiersPerBay: 4, blockType: 'GRID' },

    // N Series (Small)
    { name: 'N6', capacity: 160, group: 'GP', isDefault: true, totalBays: 10, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N7', capacity: 201, group: 'GP', isDefault: true, totalBays: 12, rowsPerBay: 5, tiersPerBay: 4, blockType: 'GRID' },
    { name: 'N8', capacity: 25, group: 'GP', isDefault: true, totalBays: 5, rowsPerBay: 3, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'N9', capacity: 25, group: 'GP', isDefault: true, totalBays: 5, rowsPerBay: 3, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'N10', capacity: 10, group: 'GP', isDefault: true, totalBays: 4, rowsPerBay: 2, tiersPerBay: 2, blockType: 'GRID' },
    { name: 'N11', capacity: 56, group: 'GP', isDefault: true, totalBays: 6, rowsPerBay: 4, tiersPerBay: 3, blockType: 'GRID' },

    // Misc
    { name: 'T0', capacity: 80, group: 'RỖNG', isDefault: true, totalBays: 8, rowsPerBay: 4, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'T2', capacity: 30, group: 'GP', isDefault: true, totalBays: 5, rowsPerBay: 3, tiersPerBay: 3, blockType: 'GRID' },
    { name: 'Z0', capacity: 72, group: 'RỖNG', isDefault: true, totalBays: 8, rowsPerBay: 4, tiersPerBay: 3, blockType: 'GRID' },

    // --- NEW HEAP AREAS ---
    { name: 'APR01', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'APR02', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'APRON', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'MNR',   capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'MNR1',  capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'CFS 1', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'CFS 2', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'CFS 3', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'CFS 4', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'CFS 5', capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },
    { name: 'WAS',   capacity: 500, group: 'OTHER', isDefault: true, totalBays: 0, rowsPerBay: 0, tiersPerBay: 0, blockType: 'HEAP', machineType: 'RS' },

].map((b: any): BlockConfig => {
    if (b.blockType === 'HEAP') return b as BlockConfig;
    return { ...b, machineType: getMachineType(b.name), blockType: 'GRID' } as BlockConfig; // Ensure GRID default and machine types
});

// A fixed, distinct color palette for the three vessel filters
const FILTER_COLORS = [
  'bg-sky-500', 
  'bg-lime-500', 
  'bg-amber-500',
];

// Helper to calculate TEU based on ISO code or Size
export const calculateTEU = (container: Container): number => {
    if (container.iso && container.iso.length > 0) {
      const code = container.iso.trim().toUpperCase();
      const prefix = code.charAt(0);
      
      // ISO Codes starting with 1 or 2 (10ft, 20ft) -> 1 TEU
      if (prefix === '1' || prefix === '2') return 1;
      
      // ISO Codes starting with 4 or L (40ft, 45ft) -> 2 TEU
      if (prefix === '4' || prefix === 'L') return 2;
    }
  
    // Fallback to size if ISO code is missing or unrecognized
    if (container.size >= 40) return 2;
    return 1;
};

const App: React.FC = () => {
  // Load containers from localStorage if available
  const [containers, setContainers] = useState<Container[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTAINERS);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to load containers from storage", e);
      return [];
    }
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load stats from localStorage
  const [stats, setStats] = useState<ParseStats | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STATS);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [view, setView] = useState<'map' | 'stats' | 'vessel_stats' | 'dwell_stats'>('map');
  const [isoTypeFilter, setIsoTypeFilter] = useState<'ALL' | 'DRY' | 'REEFER'>('ALL');
  
  // New State for Flow Filter
  const [flowFilter, setFlowFilter] = useState<'ALL' | 'EXPORT' | 'IMPORT' | 'EMPTY'>('ALL');

  // Load vessels from localStorage
  const [vessels, setVessels] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.VESSELS);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  });
  
  const [selectedVessels, setSelectedVessels] = useState<string[]>(['', '', '']);

  // Dynamic yard configuration state
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>(() => {
    try {
      const savedConfigs = localStorage.getItem(STORAGE_KEYS.BLOCK_CONFIGS);
      const parsed = savedConfigs ? JSON.parse(savedConfigs) : DEFAULT_BLOCKS;
      return Array.isArray(parsed) ? parsed : DEFAULT_BLOCKS;
    } catch (e) {
      console.error("Failed to parse block configs from localStorage", e);
      return DEFAULT_BLOCKS;
    }
  });

  // Persist block configs to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BLOCK_CONFIGS, JSON.stringify(blockConfigs));
    } catch (e) {
      console.error("Failed to save block configs to localStorage", e);
    }
  }, [blockConfigs]);
  
  const handleAddBlock = (newBlock: Omit<BlockConfig, 'isDefault'>) => {
    if (blockConfigs.some(b => b.name.toUpperCase() === newBlock.name.toUpperCase())) {
      alert(`Block with name "${newBlock.name}" already exists.`);
      return;
    }
    setBlockConfigs(prev => [...prev, { ...newBlock, isDefault: false }]);
  };

  const handleUpdateBlock = (updatedBlock: BlockConfig) => {
    setBlockConfigs(prev => prev.map(b => 
      b.name === updatedBlock.name ? updatedBlock : b
    ));
  };

  const handleRemoveBlock = (blockName: string) => {
    // Case-insensitive comparison for robust removal
    setBlockConfigs(prev => prev.filter(b => b.name.toUpperCase() !== blockName.toUpperCase()));
  };

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all saved container data?')) {
      localStorage.removeItem(STORAGE_KEYS.CONTAINERS);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.VESSELS);
      setContainers([]);
      setStats(null);
      setVessels([]);
      setSelectedVessels(['', '', '']);
    }
  };


  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setStats(null);
    setVessels([]);
    setSelectedVessels(['', '', '']);

    try {
      const { containers: parsedData, stats: parseStats, vessels: parsedVessels } = await parseExcelFile(file);
      
      // Try to save to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.CONTAINERS, JSON.stringify(parsedData));
        localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(parseStats));
        localStorage.setItem(STORAGE_KEYS.VESSELS, JSON.stringify(parsedVessels));
      } catch (e) {
        console.warn("Storage quota exceeded or error saving data", e);
        // We don't fail the upload if storage fails, just warn or ignore
        setError("File loaded, but data is too large to save for next visit.");
      }

      setContainers(parsedData);
      setStats(parseStats);
      setVessels(parsedVessels);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setContainers([]);
      // Also clear storage if upload failed to prevent mismatch
      localStorage.removeItem(STORAGE_KEYS.CONTAINERS);
      localStorage.removeItem(STORAGE_KEYS.STATS);
      localStorage.removeItem(STORAGE_KEYS.VESSELS);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVesselChange = (index: number, vessel: string) => {
    const newSelectedVessels = [...selectedVessels];
    newSelectedVessels[index] = vessel;
    setSelectedVessels(newSelectedVessels);
  };
  
  const containersByBlock = useMemo(() => {
    return containers.reduce((acc, container) => {
        // block lookup needs to handle "CFS 1" vs "CFS1" etc.
        // The container.block property comes from excelService.
        // It matches blockConfig.name if parsed correctly.
        let blockName = container.block;
        if (!acc[blockName]) {
            acc[blockName] = [];
        }
        acc[blockName].push(container);
        return acc;
    }, {} as Record<string, Container[]>);
  }, [containers]);

  const highlightedContainerIds = useMemo(() => {
    const trimmedSearch = searchTerm.trim().toUpperCase();
    if (!trimmedSearch) {
        return new Set<string>();
    }
    
    const normalizedSearchForLocation = trimmedSearch.replace(/-/g, '');

    const matchingContainers = containers.filter(c => {
        const normalizedLocation = c.location.replace(/\s/g, '').replace(/-/g, '');
        return c.id.toUpperCase().includes(trimmedSearch) || normalizedLocation === normalizedSearchForLocation;
    });

    return new Set(matchingContainers.map(c => c.id));
  }, [searchTerm, containers]);

  const filteredContainers = useMemo(() => {
    if (isoTypeFilter === 'ALL') {
      return containers;
    }

    const dryChars = ['G', 'P', 'T', 'L', 'U'];

    return containers.filter(c => {
      const iso = c.iso?.trim().toUpperCase();
      
      // Special Handling: Empty containers often have missing ISO codes in reports.
      // If status is EMPTY and ISO is missing, we default to treating it as Dry/GP for filtering purposes.
      if (c.status === 'EMPTY' && (!iso || iso.length < 3)) {
          if (isoTypeFilter === 'REEFER') return false;
          return true; // Include in Dry or All
      }

      if (!iso || iso.length < 3) {
        return false;
      }
      const typeChar = iso[2];

      if (isoTypeFilter === 'DRY') {
        return dryChars.includes(typeChar);
      }
      if (isoTypeFilter === 'REEFER') {
        return typeChar === 'R';
      }
      return true;
    });
  }, [containers, isoTypeFilter]);


  const processedStats: BlockStats[] = useMemo(() => {
    const uniqueContainers = filteredContainers.filter(c => !(c.isMultiBay && c.partType === 'end'));
    
    return blockConfigs.map(block => {
      const blockContainers = uniqueContainers.filter(c => c.block === block.name);
      
      // Calculate containers for each category based on Revised Priority:
      
      // 1. Outbound (Green): Flow === EXPORT (Status can be Full or Empty)
      const exportContainers = blockContainers.filter(c => c.flow === 'EXPORT');

      // 2. Empty Stock (Blue): Status === EMPTY && Flow !== EXPORT
      const emptyStockContainers = blockContainers.filter(c => c.status === 'EMPTY' && c.flow !== 'EXPORT');

      // 3. Inbound (Yellow): Status === FULL && Flow !== EXPORT
      const inboundContainers = blockContainers.filter(c => c.status === 'FULL' && c.flow !== 'EXPORT');
      
      const exportTeus = exportContainers.reduce((sum, c) => sum + calculateTEU(c), 0);
      const inboundTeus = inboundContainers.reduce((sum, c) => sum + calculateTEU(c), 0);
      const emptyStockTeus = emptyStockContainers.reduce((sum, c) => sum + calculateTEU(c), 0);
      
      return {
        name: block.name,
        group: block.group || 'N/A', 
        capacity: block.capacity || 0,
        // Mapping internal names to new semantic roles:
        exportFullTeus: exportTeus,      // "Outbound"
        importFullTeus: inboundTeus,     // "Inbound"
        emptyTeus: emptyStockTeus,       // "Empty Stock"
        exportFullCount: exportContainers.length,
        importFullCount: inboundContainers.length,
        emptyCount: emptyStockContainers.length
      };
    });
  }, [filteredContainers, blockConfigs]);

  return (
    <div className="min-h-screen p-4 pb-20">
      {/* Header and Navigation */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm sticky top-0 z-50">
         <h1 className="text-2xl font-bold text-slate-800">Container Yard Viewer</h1>
         
         <div className="flex space-x-2 mt-4 md:mt-0 overflow-x-auto pb-1">
            <button 
              onClick={() => setView('map')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${view === 'map' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Yard Map
            </button>
            <button 
              onClick={() => setView('stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${view === 'stats' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Yard Statistics
            </button>
            <button 
              onClick={() => setView('vessel_stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${view === 'vessel_stats' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Vessel Statistics
            </button>
            <button 
              onClick={() => setView('dwell_stats')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${view === 'dwell_stats' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Dwell Time
            </button>
         </div>
      </div>

      <div className="space-y-6">
        {/* Error Message */}
        {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
                <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                </div>
                <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                </div>
            </div>
            </div>
        )}

        {/* --- MAP VIEW --- */}
        {view === 'map' && (
           <>
             {/* File Upload */}
             <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1 w-full">
                    <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
                  </div>
                   {stats && (
                      <div className="flex flex-col md:items-end text-sm text-slate-600">
                        <span className="font-semibold text-slate-800">File Parsed Successfully</span>
                        <span>Total Rows: {stats.totalRows.toLocaleString()}</span>
                        <span>Containers Created: {stats.createdContainers.toLocaleString()}</span>
                        {stats.skippedRows > 0 && <span className="text-amber-600">Skipped/Invalid: {stats.skippedRows.toLocaleString()}</span>}
                      </div>
                   )}
                   {containers.length > 0 && (
                      <button onClick={handleClearData} className="text-red-500 hover:text-red-700 font-medium text-sm">
                          Clear Data
                      </button>
                   )}
                </div>
             </div>

             {containers.length > 0 && (
                <>
                  {/* Filters Bar */}
                  <div className="bg-white p-4 rounded-xl shadow-lg space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Search Container / Location</label>
                            <div className="relative">
                                <input
                                type="text"
                                placeholder="Enter container number or location (e.g. A2-22-05-1)"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                />
                                {searchTerm && (
                                    <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        {/* Flow Filter */}
                        <div className="w-full md:w-48">
                           <label className="block text-sm font-medium text-slate-700 mb-1">Flow Filter</label>
                           <select 
                             value={flowFilter} 
                             onChange={(e) => setFlowFilter(e.target.value as any)}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                           >
                             <option value="ALL">All Flows</option>
                             <option value="EXPORT">Export (Green)</option>
                             <option value="IMPORT">Import (Yellow)</option>
                             <option value="EMPTY">Empty (Blue)</option>
                           </select>
                        </div>

                         {/* ISO Filter */}
                        <div className="w-full md:w-48">
                           <label className="block text-sm font-medium text-slate-700 mb-1">ISO Type</label>
                           <select 
                             value={isoTypeFilter} 
                             onChange={(e) => setIsoTypeFilter(e.target.value as any)}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                           >
                             <option value="ALL">All Types</option>
                             <option value="DRY">Dry (GP)</option>
                             <option value="REEFER">Reefer (R)</option>
                           </select>
                        </div>
                    </div>

                    {/* Vessel Filters */}
                    <div>
                         <label className="block text-sm font-medium text-slate-700 mb-2">Vessel Highlight Filters</label>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {selectedVessels.map((selected, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                    <div className={`w-4 h-4 rounded-full flex-shrink-0 ${FILTER_COLORS[index]}`}></div>
                                    <select
                                        value={selected}
                                        onChange={(e) => handleVesselChange(index, e.target.value)}
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                    >
                                        <option value="">Select Vessel...</option>
                                        {vessels.map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                    {selected && (
                                        <button onClick={() => handleVesselChange(index, '')} className="text-slate-400 hover:text-red-500">
                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                         </div>
                    </div>
                  </div>

                  <BlockConfigurator 
                      blocks={blockConfigs} 
                      onAddBlock={handleAddBlock} 
                      onRemoveBlock={handleRemoveBlock} 
                      onUpdateBlock={handleUpdateBlock}
                  />

                  <div className="space-y-8">
                     {blockConfigs.map(block => {
                        // For Heap blocks, containers are assigned by 'block' property name.
                        // For Grid blocks, it's the same.
                        const blockContainers = containersByBlock[block.name] || [];
                        
                        if (block.blockType === 'HEAP') {
                             return (
                                <HeapBlockView 
                                    key={block.name}
                                    label={block.name}
                                    containers={blockContainers}
                                    capacity={block.capacity || 100}
                                    highlightedContainerIds={highlightedContainerIds}
                                    selectedVessels={selectedVessels}
                                    filterColors={FILTER_COLORS}
                                    flowFilter={flowFilter}
                                />
                             );
                        }
                        
                        return (
                           <YardRowView 
                               key={block.name}
                               label={block.name} 
                               containers={blockContainers} 
                               totalBays={block.totalBays}
                               rowsPerBay={block.rowsPerBay}
                               tiersPerBay={block.tiersPerBay}
                               highlightedContainerIds={highlightedContainerIds}
                               selectedVessels={selectedVessels}
                               filterColors={FILTER_COLORS}
                               flowFilter={flowFilter}
                           />
                        );
                     })}
                  </div>
                </>
             )}
           </>
        )}
        
        {/* --- YARD STATISTICS VIEW --- */}
        {view === 'stats' && (
           <>
              {containers.length > 0 ? (
                 <YardStatistics 
                   data={processedStats} 
                   isoTypeFilter={isoTypeFilter} 
                   onFilterChange={setIsoTypeFilter}
                   containers={filteredContainers}
                   blocks={blockConfigs}
                 />
              ) : (
                 <div className="text-center py-10 text-slate-500 bg-white rounded-lg shadow">
                    Please upload a file to view statistics.
                 </div>
              )}
           </>
        )}

        {/* --- VESSEL STATISTICS VIEW --- */}
        {view === 'vessel_stats' && (
            <>
               {containers.length > 0 ? (
                  <VesselStatistics 
                      containers={containers}
                      vessels={vessels}
                      blocks={blockConfigs}
                      onSelectVessels={setSelectedVessels}
                  />
               ) : (
                  <div className="text-center py-10 text-slate-500 bg-white rounded-lg shadow">
                     Please upload a file to view vessel statistics.
                  </div>
               )}
            </>
        )}

        {/* --- DWELL TIME STATISTICS VIEW --- */}
        {view === 'dwell_stats' && (
            <>
               {containers.length > 0 ? (
                  <DwellTimeStatistics 
                      containers={containers}
                  />
               ) : (
                  <div className="text-center py-10 text-slate-500 bg-white rounded-lg shadow">
                     Please upload a file to view Dwell Time statistics.
                  </div>
               )}
            </>
        )}
      </div>
    </div>
  );
};

export default App;