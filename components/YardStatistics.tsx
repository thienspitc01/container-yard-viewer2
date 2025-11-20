import React from 'react';
import { BlockStats } from '../types';

interface YardStatisticsProps {
  data: BlockStats[];
  isoTypeFilter: 'ALL' | 'DRY' | 'REEFER';
  onFilterChange: (filter: 'ALL' | 'DRY' | 'REEFER') => void;
}

const ProgressBar: React.FC<{
  items: { percentage: number; colorClass: string }[];
}> = ({ items }) => (
  <div className="w-full bg-gray-200 rounded-full h-4 my-1 border border-gray-300 flex overflow-hidden">
    {items.map((item, index) => (
      <div
        key={index}
        className={`${item.colorClass} h-full`}
        style={{ width: `${item.percentage}%` }}
        title={`${item.percentage.toFixed(1)}%`}
      ></div>
    ))}
  </div>
);

const StatCell: React.FC<{ count: number; teus: number; percentage: number; colorClass: string; blockName: string }> = ({ count, teus, percentage, colorClass, blockName }) => (
  <td className="border px-2 py-1 text-center align-top">
    <div className="text-xs mb-1">{`Tính tỉ lệ % so với capacity của bãi ${blockName}:`}</div>
    <div className="font-semibold">{count.toLocaleString()} conts</div>
    <div className="font-bold text-sm">{teus.toLocaleString()} teus</div>
    <div className="text-xs mt-1">{percentage.toFixed(0)}%</div>
    <ProgressBar items={[{ percentage, colorClass }]} />
  </td>
);

const YardStatistics: React.FC<YardStatisticsProps> = ({ data, isoTypeFilter, onFilterChange }) => {
  if (data.length === 0) {
    return null;
  }
    
  const groupedData = data.reduce((acc, block) => {
    const group = block.group;
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(block);
    return acc;
  }, {} as Record<string, BlockStats[]>);

  const calculateTotals = (blocks: BlockStats[]) => {
    return blocks.reduce(
      (acc, block) => {
        acc.capacity += block.capacity;
        acc.exportFullTeus += block.exportFullTeus;
        acc.importFullTeus += block.importFullTeus;
        acc.emptyTeus += block.emptyTeus;
        acc.exportFullCount += block.exportFullCount;
        acc.importFullCount += block.importFullCount;
        acc.emptyCount += block.emptyCount;
        return acc;
      },
      { capacity: 0, exportFullTeus: 0, importFullTeus: 0, emptyTeus: 0, exportFullCount: 0, importFullCount: 0, emptyCount: 0 }
    );
  };
  
  const grandTotal = calculateTotals(data);
  const totalUsed = grandTotal.exportFullTeus + grandTotal.importFullTeus + grandTotal.emptyTeus;
  const totalAvailable = grandTotal.capacity - totalUsed;
  const totalExportPercent = grandTotal.capacity > 0 ? (grandTotal.exportFullTeus / grandTotal.capacity) * 100 : 0;
  const totalImportPercent = grandTotal.capacity > 0 ? (grandTotal.importFullTeus / grandTotal.capacity) * 100 : 0;
  const totalEmptyPercent = grandTotal.capacity > 0 ? (grandTotal.emptyTeus / grandTotal.capacity) * 100 : 0;
  const totalUsedPercent = totalExportPercent + totalImportPercent + totalEmptyPercent;
  const totalAvailablePercent = 100 - totalUsedPercent;

  // Dynamically determine which groups to render based on the filter
  const groupOrder =
    isoTypeFilter === 'DRY'
      ? ['GP']
      : isoTypeFilter === 'REEFER'
      ? ['REEFER']
      : ['GP', 'REEFER'];


  return (
    <div className="bg-white p-4 rounded-lg shadow-lg overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="text-white font-bold">
            <th className="border p-2 bg-cyan-600 align-top" colSpan={3}>
              <div>QUY HOẠCH</div>
              <div className="text-left text-xs font-normal mt-1">
                  <div>Lọc theo bên dưới:</div>
                  <div>Khô: ISO **G/P/T/L/U*</div>
                  <div>Lạnh: ISO **R*</div>
              </div>
            </th>
            <th className="border p-2 bg-cyan-500" colSpan={4}>TỒN BÃI</th>
            <th className="border p-2 bg-cyan-600" colSpan={2}>CÒN TRỐNG</th>
          </tr>
          <tr className="text-white font-semibold">
            <th className="border p-2 bg-cyan-600 w-32 align-middle">
               <label htmlFor="type-filter" className="font-semibold text-white block mb-1 text-xs uppercase tracking-wider">Loại</label>
               <select
                 id="type-filter"
                 value={isoTypeFilter}
                 onChange={(e) => onFilterChange(e.target.value as 'ALL' | 'DRY' | 'REEFER')}
                 className="w-full p-1.5 rounded-md bg-cyan-700 text-white border-cyan-500 focus:ring-2 focus:ring-white/50 focus:outline-none text-sm"
               >
                 <option value="ALL">Tất cả</option>
                 <option value="DRY">Khô</option>
                 <option value="REEFER">Lạnh</option>
               </select>
            </th>
            <th className="border p-2 bg-cyan-600 w-20">BLOCK</th>
            <th className="border p-2 bg-cyan-600 w-24">CAPACITY (Teus)</th>
            <th className="border p-2 bg-green-500 w-48">EXPORT FULL (%)</th>
            <th className="border p-2 bg-yellow-500 w-48">IMPORT FULL (%)</th>
            <th className="border p-2 bg-blue-400 w-48">EMPTY (%)</th>
            <th className="border p-2 bg-cyan-500 w-24">Tổng %</th>
            <th className="border p-2 bg-cyan-600 w-48">Teus</th>
            <th className="border p-2 bg-cyan-600 w-24">Tổng %</th>
          </tr>
        </thead>
        <tbody>
          {groupOrder.map(groupName => {
            const blocksInGroup = groupedData[groupName];
            if (!blocksInGroup || blocksInGroup.length === 0) return null;
            
            return (
              <React.Fragment key={groupName}>
                {blocksInGroup.map((block, index) => {
                  const usedTeus = block.exportFullTeus + block.importFullTeus + block.emptyTeus;
                  const availableTeus = block.capacity - usedTeus;
                  const exportPercent = block.capacity > 0 ? (block.exportFullTeus / block.capacity) * 100 : 0;
                  const importPercent = block.capacity > 0 ? (block.importFullTeus / block.capacity) * 100 : 0;
                  const emptyPercent = block.capacity > 0 ? (block.emptyTeus / block.capacity) * 100 : 0;
                  const availablePercent = block.capacity > 0 ? (availableTeus / block.capacity) * 100 : 0;
                  const totalUsedPercent = exportPercent + importPercent + emptyPercent;
                  
                  return (
                    <tr key={block.name}>
                      {index === 0 && (
                        <td className="border p-2 text-center font-bold bg-orange-100" rowSpan={blocksInGroup.length}>{groupName}</td>
                      )}
                      <td className="border p-2 font-semibold text-center">{block.name}</td>
                      <td className="border p-2 text-center">{block.capacity.toLocaleString()}</td>
                      <StatCell blockName={block.name} count={block.exportFullCount} teus={block.exportFullTeus} percentage={exportPercent} colorClass="bg-green-500" />
                      <StatCell blockName={block.name} count={block.importFullCount} teus={block.importFullTeus} percentage={importPercent} colorClass="bg-yellow-500" />
                      <StatCell blockName={block.name} count={block.emptyCount} teus={block.emptyTeus} percentage={emptyPercent} colorClass="bg-blue-400" />
                      <td className="border p-2 text-center font-bold">{totalUsedPercent.toFixed(0)}%</td>
                      <td className="border px-2 py-1 text-center align-top">
                        <div className="text-xs mb-1">Số teus còn lại:</div>
                        <div className="font-bold">{availableTeus.toLocaleString()} teus</div>
                         <div className="font-bold">{availablePercent.toFixed(0)}%</div>
                        <ProgressBar items={[
                            { percentage: exportPercent, colorClass: 'bg-green-500' },
                            { percentage: importPercent, colorClass: 'bg-yellow-500' },
                            { percentage: emptyPercent, colorClass: 'bg-blue-400' },
                         ]} />
                      </td>
                       <td className="border p-2 text-center font-bold">{availablePercent.toFixed(0)}%</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
          {/* Total Row */}
          <tr className="font-bold bg-red-200 text-red-900">
            <td className="border p-2 text-center" colSpan={2}>Tổng</td>
            <td className="border p-2 text-center">{grandTotal.capacity.toLocaleString()}</td>
            <td className="border px-2 py-1 text-center align-top">
                <div className="font-semibold">{totalExportPercent.toFixed(0)}%</div>
                <div className="text-xs">({grandTotal.exportFullCount.toLocaleString()} conts)</div>
                <div className="text-xs font-bold">({grandTotal.exportFullTeus.toLocaleString()} teus)</div>
            </td>
            <td className="border px-2 py-1 text-center align-top">
                <div className="font-semibold">{totalImportPercent.toFixed(0)}%</div>
                <div className="text-xs">({grandTotal.importFullCount.toLocaleString()} conts)</div>
                <div className="text-xs font-bold">({grandTotal.importFullTeus.toLocaleString()} teus)</div>
            </td>
            <td className="border px-2 py-1 text-center align-top">
                <div className="font-semibold">{totalEmptyPercent.toFixed(0)}%</div>
                <div className="text-xs">({grandTotal.emptyCount.toLocaleString()} conts)</div>
                <div className="text-xs font-bold">({grandTotal.emptyTeus.toLocaleString()} teus)</div>
            </td>
            <td className="border p-2 text-center">
                {totalUsedPercent.toFixed(0)}%
            </td>
            <td className="border p-2 text-center">{totalAvailable.toLocaleString()}</td>
            <td className="border p-2 text-center">
                {totalAvailablePercent.toFixed(0)}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default YardStatistics;