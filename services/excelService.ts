

import { Container, ParseResult, ParseStats } from '../types';

declare const XLSX: any;

// Helper to find a value from a row object using a list of possible keys
const findColumnValue = (row: any, possibleKeys: string[]): any => {
    const rowKeys = Object.keys(row);
    
    // Priority 1: Exact Match (Case-insensitive)
    for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().trim();
        if (possibleKeys.includes(lowerKey)) {
            return row[key];
        }
    }

    // Priority 2: Contains Match (The row header contains the keyword)
    // We check this after exact matches to prefer precision.
    // e.g., "Số ngày lưu bãi" will be found if possibleKeys has "lưu bãi"
    for (const key of rowKeys) {
        const lowerKey = key.toLowerCase().trim();
        // Only match if the keyword is significant (length > 2) to avoid false positives like 'id' inside 'width'
        if (possibleKeys.some(pk => pk.length > 1 && lowerKey.includes(pk))) {
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
          // --- 1. ID Parsing ---
          const idVal = findColumnValue(row, ['số cont', 'container', 'container number', 'cont', 'id', 'no', 'số']);
          // Skip if no ID (User logic: "Skip rows without a valid ID")
          if (!idVal) {
             stats.skippedRows++;
             return [];
          }
          const id = idVal.toString().trim();
          // Filter out summary/total rows
          if (id.toLowerCase().includes('total') || id.toLowerCase().includes('tổng')) {
             return [];
          }

          // --- 2. Owner & Vessel ---
          const owner = findColumnValue(row, ['hãng khai thác', 'chủ hàng', 'owner', 'operator']) || 'Unknown';
          const vessel = findColumnValue(row, ['tên tàu', 'vessel']);
          if (vessel) {
            vesselSet.add(vessel.toString().trim());
          }

          // --- 3. ISO & Size Parsing ---
          const isoVal = findColumnValue(row, ['loại iso', 'iso code', 'iso', 'kích cỡ iso', 'type', 'mã']);
          const iso = isoVal ? String(isoVal).trim().toUpperCase() : undefined;
          
          let size: 20 | 40 = 20; // Default
          const sizeVal = findColumnValue(row, ['size', 'sz', 'length', 'kích', 'cỡ']);
          
          if (sizeVal) {
             const num = parseInt(String(sizeVal).replace(/\D/g, ''));
             if (num === 40 || num === 45) size = 40;
             else if (num === 20 || num === 10) size = 20;
          } else if (iso) {
             // Infer size from ISO if size column missing
             if (iso.startsWith('4') || iso.startsWith('L')) size = 40;
             else if (iso.startsWith('1')) size = 10 as any; // Treat 10 as 20 for type safety or mapped logic
             else size = 20;
          }

          // --- 4. Status & Flow Parsing ---
          // Priority 1: Check explicit F/E column (High confidence for Full/Empty)
          let statusRaw = findColumnValue(row, ['f/e', 'fe', 'full/empty']);
          
          // Priority 2: Check generic Status column if F/E not found
          // (Sometimes 'Status' contains 'Stacking' or 'Shifting' instead of Full/Empty, so we prefer F/E)
          if (!statusRaw) {
              statusRaw = findColumnValue(row, ['trạng thái', 'status', 'tình trạng', 'stat', 'trạng']);
          }
          
          const statusVal = (statusRaw || '').toString().trim();
          const flowVal = (findColumnValue(row, ['hướng', 'flow', 'category', 'cat', 'type', 'loại', 'im', 'ex']) || '').toString().trim();
          
          const sLower = statusVal.toLowerCase();
          const fLower = flowVal.toLowerCase();

          let status: 'FULL' | 'EMPTY' = 'FULL'; // Default
          
          // Strict Empty status detection
          if (
              sLower === 'e' || 
              sLower === 'r' || 
              sLower === 'mt' || 
              sLower.includes('empty') || 
              sLower.includes('rỗng') || 
              sLower.includes('mt ') || 
              sLower.includes(' mt')
          ) {
              status = 'EMPTY';
          }
          
          // Double check: if status detected as FULL but flow says Empty/MT
          if (status === 'FULL') {
              if (fLower.includes('empty') || fLower.includes('rỗng') || fLower.includes('mt')) {
                  status = 'EMPTY';
              }
          }

          // Detect Flow (Normalized) & Detailed Flow
          let flow: 'IMPORT' | 'EXPORT' | 'STORAGE' | undefined;
          let detailedFlow: string = flowVal.toUpperCase(); // Preserve original or construct specific

          // Determine Normalized Flow for Map
          if (fLower.includes('ex') || fLower.includes('out') || fLower.includes('xuất')) {
              flow = 'EXPORT';
          } else if (fLower.includes('im') || fLower.includes('in') || fLower.includes('nhập')) {
              flow = 'IMPORT';
          } else if (fLower.includes('storage')) {
              flow = 'STORAGE';
          }
          
          // Fallback Normalized Flow
          if (!flow) {
             if (sLower.includes('export') || sLower.includes('xuất')) flow = 'EXPORT';
             else if (sLower.includes('import') || sLower.includes('nhập')) flow = 'IMPORT';
          }

          // Determine Detailed Flow for Dwell Time Reports
          // We want to distinguish "IMPORT STORAGE" and "STORAGE EMPTY"
          if (fLower.includes('import') && fLower.includes('storage')) {
              detailedFlow = 'IMPORT STORAGE';
          } else if (fLower.includes('storage') && (fLower.includes('empty') || fLower.includes('mt') || status === 'EMPTY')) {
              detailedFlow = 'STORAGE EMPTY';
          } else if (fLower.includes('import') || sLower.includes('import') || fLower.includes('nhập')) {
              detailedFlow = 'IMPORT';
          } else if (fLower.includes('export') || sLower.includes('export') || fLower.includes('xuất')) {
              detailedFlow = 'EXPORT';
          }
          
          // --- 5. Dwell Time Parsing ---
          // Updated to include 'số ngày lưu bãi' explicitly and support partial matching via findColumnValue
          const dwellVal = findColumnValue(row, ['dwell', 'dwell time', 'days', 'số ngày', 'ngày lưu', 'lưu bãi', 'time in', 'tồn', 'số ngày lưu bãi']);
          let dwellDays = 0;
          if (dwellVal) {
              // Try to parse number
              const num = parseFloat(String(dwellVal).replace(/[^0-9.]/g, ''));
              if (!isNaN(num)) {
                  dwellDays = num;
              }
          }


          // --- 6. Location Parsing ---
          const locationRaw = findColumnValue(row, ['vị trí trên bãi', 'vị trí', 'location']);
          
          let block = 'UNK';
          let bay = 0;
          let rowNum = 0;
          let tier = 0;
          let isUnmapped = true;

          if (typeof locationRaw === 'string' && locationRaw.trim() !== '') {
             const locationTrimmed = locationRaw.trim();
             const location = locationTrimmed.replace(/\s/g, ''); // Normalized for Grid
             
             let bayStr, rowStr, tierStr;
             
             // Attempt grid parse
             const parts = location.split('-');
             if (parts.length === 4) {
                 [block, bayStr, rowStr, tierStr] = parts;
                 isUnmapped = false;
             } else if (location.length >= 6) {
                 tierStr = location.slice(-1);
                 rowStr = location.slice(-3, -1);
                 bayStr = location.slice(-5, -3);
                 block = location.slice(0, -5);
                 isUnmapped = false;
             }

             if (!isUnmapped && block && bayStr && rowStr && tierStr) {
                block = block.toUpperCase();
                bay = parseInt(bayStr, 10);
                rowNum = parseInt(rowStr, 10);
                tier = parseInt(tierStr, 10);

                if (isNaN(bay) || isNaN(rowNum) || isNaN(tier) || rowNum < 1 || tier < 1) {
                    isUnmapped = true; // Fallback to unmapped if numbers are bad
                    block = 'UNK';
                }
             } else {
                 isUnmapped = true;
                 block = 'UNK';
                 
                 // Fallback for Heap/Zone Detection
                 if (locationTrimmed.length >= 2 && locationTrimmed.length <= 10 && /^[a-zA-Z0-9\s]+$/.test(locationTrimmed)) {
                     block = locationTrimmed.toUpperCase();
                 }
             }
          }

          const type: 'GP' | 'REEFER' = (iso && iso.includes('R')) ? 'REEFER' : 'GP';

          // --- 7. Extra Metadata Parsing (Commodity, BL, Date, Hold) ---
          const commodity = findColumnValue(row, ['hàng hóa', 'hàng hoá', 'tên hàng', 'commodity', 'cargo', 'goods'])?.toString().trim();
          const billOfLading = findColumnValue(row, ['số vận đơn', 'số bl', 'bill of lading', 'b/l', 'bl'])?.toString().trim();
          const inDate = findColumnValue(row, ['ngày nhập bãi', 'ngày nhập', 'ngày vào', 'time in', 'in date'])?.toString().trim();
          const holdReason = findColumnValue(row, ['lý do giữ', 'lý do', 'hold reason', 'remark', 'ghi chú'])?.toString().trim();

          const commonData = { 
              id, 
              location: isUnmapped ? (block !== 'UNK' ? locationRaw.toString().trim() : 'Unmapped') : locationRaw.toString().trim(), 
              block, 
              row: rowNum, 
              tier, 
              owner, 
              vessel: vessel ? vessel.toString().trim() : undefined, 
              status, 
              flow, 
              detailedFlow,
              type, 
              iso,
              dwellDays,
              commodity,
              billOfLading,
              inDate,
              holdReason
          };

          // --- 8. Container Object Creation ---
          // If valid map data exists, handle 20/40 logic for Map
          if (!isUnmapped) {
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
          } else {
              // UNMAPPED CONTAINER (or Heap Container)
              stats.createdContainers += 1;
              return [{
                  ...commonData,
                  bay: 0,
                  size: size, // Use parsed size
                  isMultiBay: false 
              }];
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