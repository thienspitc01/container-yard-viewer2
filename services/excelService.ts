import { Container, ParseResult, ParseStats } from '../types';

declare const XLSX: any;

// Helper to find a value from a row object using a list of possible keys, case-insensitively.
const findColumnValue = (row: any, possibleKeys: string[]): any => {
    const rowKeys = Object.keys(row);
    for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (possibleKeys.includes(lowerKey)) {
            return row[key];
        }
    }
    return undefined;
};


export const parseExcelFile = (file: File): Promise<ParseResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const stats: ParseStats = {
            totalRows: json.length,
            createdContainers: 0,
            skippedRows: 0,
        };
        
        const vesselSet = new Set<string>();
        const containers: Container[] = json.flatMap((row, index): Container[] => {
          const locationRaw = findColumnValue(row, ['vị trí trên bãi', 'vị trí', 'location']);
          const owner = findColumnValue(row, ['hãng khai thác', 'chủ hàng', 'owner', 'operator']) || 'Unknown';
          const id = findColumnValue(row, ['số cont', 'container', 'container number']) || `unknown-${index}`;
          const vessel = findColumnValue(row, ['tên tàu', 'vessel']);
          const iso = findColumnValue(row, ['loại iso', 'iso code', 'iso']);
          
          if (vessel) {
            vesselSet.add(vessel.toString().trim());
          }

          if (typeof locationRaw !== 'string' || locationRaw.trim() === '') {
            stats.skippedRows++;
            return []; // Skip if location is missing or not a string
          }
          const location = locationRaw.trim().replace(/\s/g, '');

          let block: string | undefined;
          let bayStr: string | undefined;
          let rowStr: string | undefined;
          let tierStr: string | undefined;

          // Attempt to parse hyphenated format first (e.g., A2-22-05-1)
          const parts = location.split('-');
          if (parts.length === 4) {
             [block, bayStr, rowStr, tierStr] = parts;
          } else if (location.length >= 6) { // Fallback to non-hyphenated (e.g., A222051)
            tierStr = location.slice(-1);
            rowStr = location.slice(-3, -1); // Assumes 2-digit row like '05'
            bayStr = location.slice(-5, -3); // Assumes 2-digit bay like '22'
            block = location.slice(0, -5);
          } else {
            console.warn(`Skipping invalid location format (unrecognized): ${location}`);
            stats.skippedRows++;
            return [];
          }

          if (!block || !bayStr || !rowStr || !tierStr) {
             console.warn(`Skipping invalid location format (parsing failed): ${location}`);
             stats.skippedRows++;
             return [];
          }

          // Standardize block name (uppercase)
          block = block.toUpperCase();

          const bay = parseInt(bayStr, 10);
          const rowNum = parseInt(rowStr, 10);
          const tier = parseInt(tierStr, 10);

          if (isNaN(bay) || isNaN(rowNum) || isNaN(tier) || rowNum < 1 || tier < 1) {
            console.warn(`Skipping invalid bay/row/tier in location: ${location}`);
            stats.skippedRows++;
            return [];
          }
          
          // Robustly parse status and flow
          const statusValue = (findColumnValue(row, ['trạng thái', 'status', 'f/e']) || '').toString().trim().toUpperCase();
          const flowValue = (findColumnValue(row, ['hướng', 'flow']) || '').toString().trim().toUpperCase();

          let status: 'FULL' | 'EMPTY' | undefined;
          let flow: 'IMPORT' | 'EXPORT' | undefined;
          
          // Determine flow first, as it can imply the status. Using .includes() for flexibility.
          if (flowValue.includes('EXPORT') || flowValue.includes('XUẤT')) {
              flow = 'EXPORT';
          } else if (flowValue.includes('IMPORT') || flowValue.includes('NHẬP')) {
              // This correctly catches "IMPORT", "IMPORT STORAGE", "NHẬP", "NHẬP LƯU KHO", etc.
              flow = 'IMPORT';
          }

          // Now, determine status. An explicit 'EMPTY' status always wins.
          if (statusValue.startsWith('E')) {
              status = 'EMPTY';
              flow = undefined; // Empty containers don't have a flow for our stats.
          } else if (flow) {
              // If we determined a flow (IMPORT/EXPORT), the container must be FULL.
              // This handles cases where the F/E column might be blank for full containers.
              status = 'FULL';
          } else if (statusValue.startsWith('F')) {
              // This is a fallback for containers explicitly marked as FULL but with an unknown flow.
              status = 'FULL';
          }


          const type: 'GP' | 'REEFER' = iso?.toString().toUpperCase().includes('R') ? 'REEFER' : 'GP';

          const commonData = { id, location, block, row: rowNum, tier, owner, vessel: vessel ? vessel.toString().trim() : undefined, status, flow, type, iso };

          // Even bay number indicates a 40' container occupying two slots
          if (bay % 2 === 0) {
            stats.createdContainers += 1; // Count as one 40' container
            const startContainer: Container = {
              ...commonData,
              bay: bay - 1,
              size: 40,
              isMultiBay: true,
              partType: 'start',
            };
            const endContainer: Container = {
              ...commonData,
              bay: bay + 1,
              size: 40,
              isMultiBay: true,
              partType: 'end',
            };
            return [startContainer, endContainer];
          } 
          // Odd bay number is a standard 20' container
          else {
            stats.createdContainers += 1;
            const singleContainer: Container = {
              ...commonData,
              bay: bay,
              size: 20,
              isMultiBay: false,
            };
            return [singleContainer];
          }
        });
        
        const vessels = Array.from(vesselSet).sort();
        resolve({ containers, stats, vessels });

      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(new Error("Failed to parse the Excel file. Please ensure it's a valid and uncorrupted file."));
      }
    };

    reader.onerror = (error) => {
      reject(new Error("Failed to read the file."));
    };

    reader.readAsBinaryString(file);
  });
};