

export interface BlockConfig {
  name: string;
  totalBays: number;
  rowsPerBay: number;
  tiersPerBay: number;
  capacity?: number; // Capacity in TEUs
  group?: string; // e.g., GP, REEFER, RỖNG
  isDefault?: boolean; // To prevent removal of initial blocks
  machineType?: 'RTG' | 'RS'; // RTG or Reach Stacker (Xe nâng)
  blockType?: 'GRID' | 'HEAP'; // GRID for standard Bay/Row/Tier, HEAP for unstructured zones
}

export interface Container {
  id: string; // Unique identifier, e.g., container number
  location: string; // Raw location string, e.g., A2-22-05-1
  block: string; // e.g., 'A2'
  bay: number; // The bay used for rendering on the grid (e.g., 21 or 23 for a 40' cont)
  row: number; // e.g., 5
  tier: number; // e.g., 1
  owner: string; // e.g., 'MAERSK'
  size: 20 | 40; // Size of the container
  isMultiBay: boolean; // Is this a 40' container occupying two bay slots?
  partType?: 'start' | 'end'; // Which part of the 40' container this is
  vessel?: string; // e.g., 'ZHONG GU KUN MING'
  status?: 'FULL' | 'EMPTY';
  flow?: 'IMPORT' | 'EXPORT' | 'STORAGE';
  detailedFlow?: string; // More specific flow for reports (e.g., 'IMPORT STORAGE')
  type?: 'GP' | 'REEFER'; // GP: General Purpose, REEFER: Refrigerated
  iso?: string; // ISO Code
  dwellDays?: number; // Days in yard
  commodity?: string; // Hàng hoá
  billOfLading?: string; // Số vận đơn
  inDate?: string; // Ngày nhập bãi
  holdReason?: string; // Lý do giữ
}

export interface ParseStats {
  totalRows: number;
  createdContainers: number;
  skippedRows: number;
}

export interface ParseResult {
  containers: Container[];
  stats: ParseStats;
  vessels: string[]; // A unique, sorted list of vessel names found in the file
}

export interface VesselStatsData {
  // e.g., { 'A2': { 'EVER ORIENT': 5, 'KMTC NAGOYA': 10 }, 'B2': { ... } }
  [blockName: string]: {
    [vesselName: string]: number;
  };
}

// New interface for the statistics table
export interface BlockStats {
  name: string;
  group: string;
  capacity: number;
  exportFullTeus: number;
  importFullTeus: number;
  emptyTeus: number;
  exportFullCount: number;
  importFullCount: number;
  emptyCount: number;
}

export interface ScheduleData {
    vesselName: string;
    voyage?: string;
    discharge: number;
    load: number;
}

export const RTG_BLOCK_NAMES = [
    'A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1', 'I1',
    'A2', 'B2', 'C2', 'D2', 'E2', 'F2', 'G2', 'H2', 'I2',
    'A0', 'H0', 'I0'
];