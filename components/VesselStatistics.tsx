
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { VesselStatsData, BlockConfig, Container, ScheduleData } from '../types';

// Declare global libraries loaded via CDN
declare const pdfjsLib: any;
declare const Tesseract: any;
declare const html2canvas: any;

interface VesselStatisticsProps {
  containers: Container[];
  vessels: string[];
  blocks: BlockConfig[];
  onSelectVessels?: (vessels: string[]) => void;
}

const STORAGE_KEY_SCHEDULE = 'yard_schedule_data_v1';
const STORAGE_KEY_TEXT = 'yard_schedule_text_v1';

const VesselStatistics: React.FC<VesselStatisticsProps> = ({ containers, vessels, blocks, onSelectVessels }) => {
  const [selectedVessels, setSelectedVessels] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'filters' | 'schedule' | 'discharge' | 'load'>('filters');
  
  // Schedule Data State - Persisted
  const [scheduleData, setScheduleData] = useState<ScheduleData[]>(() => {
      try {
          const saved = localStorage.getItem(STORAGE_KEY_SCHEDULE);
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  const [pastedText, setPastedText] = useState(() => {
       return localStorage.getItem(STORAGE_KEY_TEXT) || '';
  });

  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerCountRef = useRef<HTMLDivElement>(null);
  
  // Persist effects
  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(scheduleData));
  }, [scheduleData]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_TEXT, pastedText);
  }, [pastedText]);

  // Master Filter States
  const [isExportChecked, setIsExportChecked] = useState(true);
  const [isImportChecked, setIsImportChecked] = useState(true);

  // Sub Filter States
  const [filterExportFull, setFilterExportFull] = useState(true);
  const [filterExportEmpty, setFilterExportEmpty] = useState(true);
  const [filterImportFull, setFilterImportFull] = useState(true);
  const [filterImportEmpty, setFilterImportEmpty] = useState(true);

  const handleVesselSelection = (vessel: string) => {
    setSelectedVessels(prev =>
      prev.includes(vessel)
        ? prev.filter(v => v !== vessel)
        : [...prev, vessel]
    );
  };

  const handleExportImage = async () => {
      if (containerCountRef.current && typeof html2canvas !== 'undefined') {
          try {
              const originalElement = containerCountRef.current;
              
              // Clone the element to manipulate styles for full capture without affecting UI
              const clone = originalElement.cloneNode(true) as HTMLElement;
              
              // Reset styles on clone to ensure full visibility
              clone.style.position = 'absolute';
              clone.style.left = '-9999px';
              clone.style.top = '0';
              clone.style.width = 'max-content'; // Force full width
              clone.style.height = 'auto';       // Force full height
              clone.style.maxHeight = 'none';    // Remove scroll constraint
              clone.style.overflow = 'visible';  // Disable scrollbars
              clone.style.zIndex = '-1';

              // Remove sticky behavior from headers/cells in clone so they render in place
              const stickyElements = clone.querySelectorAll('.sticky');
              stickyElements.forEach((el) => {
                  el.classList.remove('sticky');
                  (el as HTMLElement).style.position = 'static';
              });

              document.body.appendChild(clone);

              const canvas = await html2canvas(clone, {
                  backgroundColor: '#ffffff',
                  scale: 2,
                  useCORS: true,
                  logging: false,
                  windowWidth: clone.scrollWidth,
                  windowHeight: clone.scrollHeight
              });

              document.body.removeChild(clone);

              const image = canvas.toDataURL("image/png");
              const link = document.createElement('a');
              link.href = image;
              link.download = `Container_Count_Per_Block_${new Date().toISOString().slice(0,10)}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
          } catch (error) {
              console.error("Export failed:", error);
              alert("Could not export image. Please try again.");
          }
      } else {
          alert("Export functionality is initializing or library missing.");
      }
  };
  
  // --- FILE HANDLING LOGIC ---
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsParsing(true);
      setPastedText('Reading file...');

      try {
          let text = '';
          if (file.type === 'application/pdf') {
              // Parse PDF
              if (typeof pdfjsLib === 'undefined') {
                  throw new Error('PDF library not loaded. Please refresh the page.');
              }
              const arrayBuffer = await file.arrayBuffer();
              const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
              const pdf = await loadingTask.promise;
              
              const maxPages = Math.min(pdf.numPages, 5); // Limit to first 5 pages for performance
              for (let i = 1; i <= maxPages; i++) {
                  const page = await pdf.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map((item: any) => item.str).join(' ');
                  text += `--- Page ${i} ---\n${pageText}\n\n`;
              }
          } else if (file.type.startsWith('image/')) {
              // Parse Image (OCR)
              if (typeof Tesseract === 'undefined') {
                   throw new Error('OCR library not loaded. Please refresh the page.');
              }
              const result = await Tesseract.recognize(file, 'eng', {
                  logger: (m: any) => {
                      if (m.status === 'recognizing text') {
                          setPastedText(`Scanning image... ${(m.progress * 100).toFixed(0)}%`);
                      }
                  }
              });
              text = result.data.text;
          } else {
              text = "Unsupported file type. Please upload a PDF or an Image.";
          }
          
          setPastedText(text);
          // Optional: Auto-trigger parse after file read
          // parseTextAndExtractSchedule(text); 
      } catch (error: any) {
          console.error("File parsing error:", error);
          setPastedText(`Error reading file: ${error.message}`);
      } finally {
          setIsParsing(false);
          // Reset input to allow re-selecting same file
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const triggerFileUpload = () => {
      fileInputRef.current?.click();
  };

  // --- Schedule Parsing Logic ---
  const handleScheduleParse = () => {
    if (!pastedText.trim()) return;
    parseTextAndExtractSchedule(pastedText);
  };

  const parseTextAndExtractSchedule = (text: string) => {
    // 1. Find all Vessel Matches using flexible whitespace regex
    const vesselMatches: { name: string; index: number }[] = [];
    
    vessels.forEach(v => {
        if (!v || v.trim().length === 0) return;
        
        // Escape special regex characters in vessel name
        const escapedV = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Split by whitespace and join with regex pattern that accepts spaces, newlines, or tabs
        // This handles "HAIAN\nWEST" or "HAIAN  WEST"
        const patternParts = escapedV.trim().split(/\s+/);
        if (patternParts.length === 0) return;
        
        const pattern = patternParts.join('[\\s\\r\\n]+');
        const regex = new RegExp(pattern, 'gi');
        
        let match;
        // Find all occurrences of this vessel in the text
        while ((match = regex.exec(text)) !== null) {
            vesselMatches.push({ name: v, index: match.index });
        }
    });

    // Sort matches by index ASC. 
    // If indices match, longest name first (to prefer specific matches if names overlap, though rare)
    vesselMatches.sort((a, b) => {
        if (a.index !== b.index) return a.index - b.index;
        return b.name.length - a.name.length;
    });

    // 2. Find all Dis/Load Data Matches
    const dataMatches: { discharge: number; load: number; index: number }[] = [];
    
    // Improved Regex:
    // Captures "Dis/Load" followed by numbers.
    // [0-9., ] includes digits, dots, commas, spaces. Does NOT include newlines.
    // This prevents merging numbers from subsequent lines.
    // Example: "Dis/Load: 1,200 / 500" or "Dis/Load 1 200 / 500"
    const disLoadRegex = /Dis\/Load[:\s]*([0-9., ]+?)\s*[\/|\\]\s*([0-9., ]+)/gi;
    
    let match;
    while ((match = disLoadRegex.exec(text)) !== null) {
        const cleanNumber = (s: string) => {
            if (!s) return 0;
            // Remove non-digits (removes spaces, commas, dots)
            const digits = s.replace(/[^\d]/g, '');
            return parseInt(digits, 10);
        };

        const discharge = cleanNumber(match[1]);
        const load = cleanNumber(match[2]);

        if (!isNaN(discharge) && !isNaN(load)) {
            dataMatches.push({
                discharge: discharge,
                load: load,
                index: match.index
            });
        }
    }

    // 3. Associate Data with Vessels
    const newSchedule: ScheduleData[] = [];
    
    dataMatches.forEach(data => {
        // Find the closest vessel match that appears BEFORE the data match
        let bestVessel = null;
        
        // Iterate backwards through sorted vessel matches
        for (let i = vesselMatches.length - 1; i >= 0; i--) {
            if (vesselMatches[i].index < data.index) {
                bestVessel = vesselMatches[i];
                break;
            }
        }

        if (bestVessel) {
             // Avoid duplicates in the schedule list
             if (!newSchedule.find(s => s.vesselName === bestVessel!.name)) {
                newSchedule.push({
                    vesselName: bestVessel.name,
                    discharge: data.discharge,
                    load: data.load
                });
             }
        }
    });
    
    setScheduleData(newSchedule);
    
    // Auto-select found vessels
    if (newSchedule.length > 0) {
        const foundNames = newSchedule.map(s => s.vesselName);
        const uniqueSelection = Array.from(new Set([...selectedVessels, ...foundNames]));
        setSelectedVessels(uniqueSelection);
        
        // Update App level highlights (limited to 3 usually)
        if (onSelectVessels) {
            onSelectVessels(uniqueSelection.slice(0, 3)); 
        }
    } else {
        // Optional: Notify user if nothing was found
        console.log("No vessel matches found in text.");
    }
  };


  const displayedVessels = selectedVessels.filter(v => vessels.includes(v)).sort();

  // Compute stats based on containers and filters
  const statsData = useMemo(() => {
    const stats: VesselStatsData = {};
    blocks.forEach(b => stats[b.name] = {});

    containers.forEach(c => {
        if (!c.vessel || (c.isMultiBay && c.partType === 'end')) return;
        
        const isExport = c.flow === 'EXPORT';
        const isImport = c.flow === 'IMPORT';
        const isFull = c.status === 'FULL';
        const isEmpty = c.status === 'EMPTY';

        let include = false;

        if (isExport) {
            if (isExportChecked) {
                if (isFull && filterExportFull) include = true;
                if (isEmpty && filterExportEmpty) include = true;
            }
        } else if (isImport) {
            if (isImportChecked) {
                 if (isFull && filterImportFull) include = true;
                 if (isEmpty && filterImportEmpty) include = true;
            }
        } else {
             // Default include if flow undefined but vessel matches
        }
        
        if (include) {
             if (!stats[c.block]) stats[c.block] = {};
             if (!stats[c.block][c.vessel]) stats[c.block][c.vessel] = 0;
             stats[c.block][c.vessel]++;
        }
    });
    return stats;
  }, [containers, blocks, isExportChecked, isImportChecked, filterExportFull, filterExportEmpty, filterImportFull, filterImportEmpty]);


  const totals = useMemo(() => {
      const t: Record<string, number> = {};
      displayedVessels.forEach(v => {
          t[v] = 0;
          blocks.forEach(b => {
              t[v] += statsData[b.name]?.[v] || 0;
          });
      });
      return t;
  }, [statsData, displayedVessels, blocks]);

  // Determine which blocks should be shown in the table
  const visibleBlocks = useMemo(() => {
      // If no vessels selected, we technically show nothing or empty table.
      if (displayedVessels.length === 0) return [];
      
      // Filter blocks that have > 0 count for AT LEAST ONE of the displayed vessels
      return blocks.filter(block => {
          return displayedVessels.some(vessel => {
              const count = statsData[block.name]?.[vessel] || 0;
              return count > 0;
          });
      });
  }, [blocks, displayedVessels, statsData]);

  // --- Analysis Calculations ---
  
  // 1. Discharge Analysis (RTG Capacity)
  const dischargeAnalysis = useMemo(() => {
      // Filter blocks by Machine Type
      const rtgBlocks = blocks.filter(b => b.machineType === 'RTG');
      const rsBlocks = blocks.filter(b => b.machineType === 'RS' || !b.machineType); // Default to RS if undefined
      
      const rtgCap = rtgBlocks.reduce((sum, b) => sum + (b.capacity || 0), 0);
      const rtgUsed = rtgBlocks.reduce((sum, b) => {
         const blockContainers = containers.filter(c => c.block === b.name && !(c.isMultiBay && c.partType === 'end'));
         const teus = blockContainers.reduce((s, c) => s + (c.size === 40 ? 2 : 1), 0);
         return sum + teus;
      }, 0);
      
      const rtgAvailable = rtgCap - rtgUsed;
      
      return {
          rtgBlocks: rtgBlocks.map(b => b.name).join(', '),
          rsBlocks: rsBlocks.map(b => b.name).join(', '),
          rtgAvailable,
          rtgCap,
          rtgUsed
      };
  }, [blocks, containers]);

  return (
    <div className="bg-white rounded-xl shadow-lg min-h-[600px] flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
         <button 
           onClick={() => setActiveTab('filters')} 
           className={`px-6 py-3 font-semibold text-sm whitespace-nowrap ${activeTab === 'filters' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Statistics & Filters
         </button>
         <button 
           onClick={() => setActiveTab('schedule')} 
           className={`px-6 py-3 font-semibold text-sm whitespace-nowrap ${activeTab === 'schedule' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Import Schedule ({scheduleData.length})
         </button>
         <button 
           onClick={() => setActiveTab('discharge')} 
           className={`px-6 py-3 font-semibold text-sm whitespace-nowrap ${activeTab === 'discharge' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Discharge Analysis
         </button>
         <button 
           onClick={() => setActiveTab('load')} 
           className={`px-6 py-3 font-semibold text-sm whitespace-nowrap ${activeTab === 'load' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
         >
           Load Analysis
         </button>
      </div>

      <div className="p-6">
          
          {/* TAB: FILTERS & STATS */}
          {activeTab === 'filters' && (
            <>
              {/* Filters Section */}
              <div className="flex flex-wrap gap-6 mb-6 p-4 bg-slate-50 border rounded-lg items-center">
                 <span className="font-bold text-slate-700 mr-2">Filters:</span>
                 <div className="flex flex-col sm:flex-row gap-8">
                    {/* Export Group */}
                    <div className="flex items-center space-x-4 px-3 py-2 bg-green-50 border border-green-200 rounded">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={isExportChecked} 
                                onChange={e => setIsExportChecked(e.target.checked)} 
                                className="h-5 w-5 rounded border-gray-400 text-green-700 focus:ring-green-600" 
                            />
                            <span className="font-bold text-green-800 text-lg">Export</span>
                        </label>
                        <div className={`flex items-center space-x-3 pl-2 border-l border-green-200 ${!isExportChecked ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input type="checkbox" checked={filterExportFull} onChange={e => setFilterExportFull(e.target.checked)} className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-slate-700">Full</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input type="checkbox" checked={filterExportEmpty} onChange={e => setFilterExportEmpty(e.target.checked)} className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-slate-700">Empty</span>
                            </label>
                        </div>
                    </div>
                    {/* Import Group */}
                    <div className="flex items-center space-x-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded">
                        <label className="flex items-center space-x-2 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={isImportChecked} 
                                onChange={e => setIsImportChecked(e.target.checked)} 
                                className="h-5 w-5 rounded border-gray-400 text-yellow-600 focus:ring-yellow-600" 
                            />
                            <span className="font-bold text-yellow-800 text-lg">Import</span>
                        </label>
                        <div className={`flex items-center space-x-3 pl-2 border-l border-yellow-200 ${!isImportChecked ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input type="checkbox" checked={filterImportFull} onChange={e => setFilterImportFull(e.target.checked)} className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium text-slate-700">Full</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer select-none">
                                <input type="checkbox" checked={filterImportEmpty} onChange={e => setFilterImportEmpty(e.target.checked)} className="h-4 w-4 text-yellow-500" />
                                <span className="text-sm font-medium text-slate-700">Empty</span>
                            </label>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                  <h3 className="font-bold text-slate-800 mb-2">Select Vessels</h3>
                  <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 bg-slate-50 p-3 rounded-md border">
                    {vessels.map(vessel => (
                      <label key={vessel} className={`flex items-center space-x-2 cursor-pointer p-1 rounded ${scheduleData.find(s => s.vesselName === vessel) ? 'bg-blue-100' : 'hover:bg-slate-100'}`}>
                        <input
                          type="checkbox"
                          checked={selectedVessels.includes(vessel)}
                          onChange={() => handleVesselSelection(vessel)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700 break-all">{vessel}</span>
                        {scheduleData.find(s => s.vesselName === vessel) && <span className="text-[10px] bg-blue-600 text-white px-1 rounded">SCHED</span>}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-slate-800">Container Count per Block</h3>
                      <button
                        onClick={handleExportImage}
                        className="p-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 rounded text-xs flex items-center space-x-1 transition-colors shadow-sm"
                        title="Export as Image"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                         </svg>
                         <span>Export</span>
                      </button>
                  </div>
                  <div className="overflow-x-auto max-h-[70vh] bg-white border rounded-lg" ref={containerCountRef}>
                    <table className="min-w-full divide-y divide-slate-200 relative">
                      <thead className="bg-slate-100 sticky top-0 z-20">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider sticky left-0 bg-slate-100 z-30 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">Block</th>
                          {displayedVessels.map(vessel => (
                            <th key={vessel} className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">{vessel}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {visibleBlocks.map(block => (
                          <tr key={block.name}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
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
                    {displayedVessels.length === 0 && <div className="p-8 text-center text-slate-500">Select vessels to view statistics.</div>}
                    {displayedVessels.length > 0 && visibleBlocks.length === 0 && (
                        <div className="p-8 text-center text-slate-500">No containers found for the selected vessels with current filters.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: SCHEDULE IMPORT */}
          {activeTab === 'schedule' && (
              <div className="max-w-4xl mx-auto space-y-6">
                 <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                     <h3 className="font-bold text-lg text-blue-900 mb-4">Import Schedule Data</h3>
                     <p className="text-sm text-blue-800 mb-4">
                        Upload a PDF file or an Image to automatically extract "Dis/Load" figures and match vessels.
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                             <label className="block text-sm font-medium text-blue-900 mb-2">1. Upload File (PDF/Image)</label>
                             <div 
                                className={`border-2 border-dashed border-blue-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white h-48 transition-colors ${isParsing ? 'bg-gray-100' : 'hover:bg-blue-50 cursor-pointer'}`}
                                onClick={triggerFileUpload}
                             >
                                 {isParsing ? (
                                    <div className="flex flex-col items-center">
                                         <svg className="animate-spin h-8 w-8 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                         </svg>
                                         <span className="text-sm text-blue-600 font-semibold animate-pulse">Processing...</span>
                                    </div>
                                 ) : (
                                    <>
                                        <svg className="w-10 h-10 text-blue-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span className="text-sm text-blue-500 font-medium">Click to select PDF or Image</span>
                                    </>
                                 )}
                                 <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".pdf, image/*"
                                    onChange={handleFileSelect}
                                 />
                             </div>
                         </div>
                         <div>
                             <label className="block text-sm font-medium text-blue-900 mb-2">2. Extracted / Pasted Text</label>
                             <textarea 
                                className="w-full h-48 p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                                placeholder={`Text will appear here after upload.\nOr paste manually:\n\nHAIAN WEST\nV. 25024N\nDis/Load: 300/300`}
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                             ></textarea>
                         </div>
                     </div>
                     <div className="mt-4 flex justify-end">
                         <button 
                            onClick={handleScheduleParse}
                            disabled={isParsing || !pastedText}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
                         >
                            Process & Auto-Select
                         </button>
                     </div>
                 </div>

                 {/* Parsed Results Table */}
                 <div className="bg-white border rounded-lg overflow-hidden">
                     <div className="bg-slate-100 px-6 py-3 border-b font-bold text-slate-700">Parsed Schedule</div>
                     {scheduleData.length > 0 ? (
                         <table className="min-w-full divide-y divide-slate-200">
                             <thead className="bg-slate-50">
                                 <tr>
                                     <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Vessel</th>
                                     <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Discharge</th>
                                     <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Load</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-slate-200">
                                 {scheduleData.map((row, idx) => (
                                     <tr key={idx}>
                                         <td className="px-6 py-4 text-sm font-medium text-slate-900">{row.vesselName}</td>
                                         <td className="px-6 py-4 text-sm text-right text-green-600 font-bold">{row.discharge}</td>
                                         <td className="px-6 py-4 text-sm text-right text-yellow-600 font-bold">{row.load}</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     ) : (
                         <div className="p-8 text-center text-slate-400">No data parsed yet. Import a file or paste text to begin.</div>
                     )}
                 </div>
              </div>
          )}

          {/* TAB: DISCHARGE ANALYSIS */}
          {activeTab === 'discharge' && (
              <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* RTG Status Card */}
                      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 col-span-2">
                          <h4 className="font-bold text-indigo-900 mb-4 text-lg">RTG Yard Capacity Status</h4>
                          <div className="grid grid-cols-3 gap-4 mb-6">
                              <div className="bg-white p-4 rounded shadow-sm text-center">
                                  <div className="text-xs text-indigo-400 uppercase font-bold">Total Capacity</div>
                                  <div className="text-2xl font-black text-indigo-900">{dischargeAnalysis.rtgCap.toLocaleString()}</div>
                              </div>
                              <div className="bg-white p-4 rounded shadow-sm text-center">
                                  <div className="text-xs text-indigo-400 uppercase font-bold">Current Used</div>
                                  <div className="text-2xl font-black text-indigo-900">{dischargeAnalysis.rtgUsed.toLocaleString()}</div>
                              </div>
                              <div className="bg-white p-4 rounded shadow-sm text-center">
                                  <div className="text-xs text-green-500 uppercase font-bold">Available</div>
                                  <div className="text-2xl font-black text-green-600">{dischargeAnalysis.rtgAvailable.toLocaleString()}</div>
                              </div>
                          </div>
                          
                          <div className="text-sm text-indigo-800">
                             <strong>Designated RTG Blocks:</strong> {dischargeAnalysis.rtgBlocks}
                          </div>
                      </div>

                      {/* Legend / Info */}
                      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                          <h4 className="font-bold text-slate-700 mb-2">Strategy</h4>
                          <ul className="list-disc list-inside text-sm text-slate-600 space-y-2">
                              <li>Prioritize discharging into <strong>RTG Blocks</strong>.</li>
                              <li>If Dis > Available, overflow to <strong>Forklift (RS) Blocks</strong>.</li>
                          </ul>
                      </div>
                  </div>

                  {/* Vessel Analysis Table */}
                  <div className="bg-white border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-slate-200">
                          <thead className="bg-slate-100">
                             <tr>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Vessel</th>
                                 <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Est. Discharge</th>
                                 <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                             </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-200">
                             {scheduleData.length > 0 ? scheduleData.map((row, idx) => {
                                 const fitsInRTG = row.discharge <= dischargeAnalysis.rtgAvailable;
                                 const overflow = row.discharge - dischargeAnalysis.rtgAvailable;
                                 return (
                                     <tr key={idx}>
                                         <td className="px-6 py-4 font-bold text-slate-800">{row.vesselName}</td>
                                         <td className="px-6 py-4 text-right font-mono font-bold text-slate-700">{row.discharge.toLocaleString()}</td>
                                         <td className="px-6 py-4">
                                             {fitsInRTG ? (
                                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                     Fits in RTG ({Math.round((row.discharge / dischargeAnalysis.rtgAvailable) * 100)}% of avail)
                                                 </span>
                                             ) : (
                                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                     Overflow to RS (Excess: {overflow.toLocaleString()})
                                                 </span>
                                             )}
                                         </td>
                                     </tr>
                                 )
                             }) : (
                                 <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">No schedule data available.</td></tr>
                             )}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* TAB: LOAD ANALYSIS */}
          {activeTab === 'load' && (
              <div className="space-y-6">
                 {scheduleData.map((row, idx) => {
                     // Calculation: Load / 4
                     const threshold = Math.round(row.load / 4);
                     
                     // Find blocks where this vessel has containers
                     // Filter to show only blocks that have > 0 containers for this vessel
                     const relevantBlocks = blocks.filter(b => (statsData[b.name]?.[row.vesselName] || 0) > 0);

                     return (
                         <div key={idx} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                             <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                                 <div>
                                     <h4 className="text-lg font-bold text-orange-900">{row.vesselName}</h4>
                                     <div className="text-sm text-orange-700 mt-1">
                                         Estimated Load: <strong>{row.load}</strong> • Warning Threshold (Load/4): <strong>{threshold}</strong>
                                     </div>
                                 </div>
                             </div>
                             
                             <div className="px-6 py-4">
                                 {relevantBlocks.length > 0 ? (
                                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                         {relevantBlocks.map(block => {
                                             const count = statsData[block.name]?.[row.vesselName] || 0;
                                             const isOverLimit = count > threshold;
                                             
                                             return (
                                                 <div key={block.name} className={`p-4 rounded border ${isOverLimit ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}>
                                                     <div className="flex justify-between items-center mb-2">
                                                         <span className="font-bold text-slate-700">{block.name}</span>
                                                         {isOverLimit && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">LIMIT EXCEEDED</span>}
                                                     </div>
                                                     <div className="text-2xl font-mono text-slate-800">
                                                         {count}
                                                     </div>
                                                     <div className="mt-2 text-xs text-slate-500">
                                                         {isOverLimit ? `Exceeds by ${count - threshold}` : `${threshold - count} remaining`}
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 ) : (
                                     <div className="text-slate-500 italic">No containers found in yard for this vessel.</div>
                                 )}
                             </div>
                         </div>
                     );
                 })}
                 {scheduleData.length === 0 && (
                     <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                         No schedule data. Import schedule to view Load Analysis.
                     </div>
                 )}
              </div>
          )}
      </div>
    </div>
  );
};

export default VesselStatistics;
