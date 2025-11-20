import React, { useState } from 'react';
import { BlockConfig } from '../types';

interface BlockConfiguratorProps {
  blocks: BlockConfig[];
  onAddBlock: (newBlock: Omit<BlockConfig, 'isDefault'>) => void;
  onRemoveBlock: (blockName: string) => void;
}

const BlockConfigurator: React.FC<BlockConfiguratorProps> = ({ blocks, onAddBlock, onRemoveBlock }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newBlock, setNewBlock] = useState({
    name: '',
    totalBays: '35',
    rowsPerBay: '6',
    tiersPerBay: '6',
    capacity: '',
    group: 'GP',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewBlock(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalBays = parseInt(newBlock.totalBays, 10);
    const rowsPerBay = parseInt(newBlock.rowsPerBay, 10);
    const tiersPerBay = parseInt(newBlock.tiersPerBay, 10);
    const capacity = parseInt(newBlock.capacity, 10);

    if (!newBlock.name.trim() || !newBlock.group.trim() || isNaN(totalBays) || isNaN(rowsPerBay) || isNaN(tiersPerBay) || isNaN(capacity) || totalBays < 1 || rowsPerBay < 1 || tiersPerBay < 1 || capacity < 1) {
      alert('Please fill in all fields with valid numbers.');
      return;
    }

    onAddBlock({
      name: newBlock.name.trim().toUpperCase(),
      totalBays,
      rowsPerBay,
      tiersPerBay,
      capacity,
      group: newBlock.group.trim(),
    });
    setNewBlock({ name: '', totalBays: '35', rowsPerBay: '6', tiersPerBay: '6', capacity: '', group: 'GP' }); // Reset form
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 rounded-t-xl"
      >
        <span>Yard Configuration</span>
        <svg
          className={`h-6 w-6 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form to add new block */}
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Add New Block</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-slate-600">Block Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={newBlock.name}
                        onChange={handleInputChange}
                        className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., G2"
                        required
                      />
                    </div>
                     <div>
                      <label htmlFor="group" className="block text-sm font-medium text-slate-600">Group</label>
                      <select name="group" id="group" value={newBlock.group} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                          <option value="GP">GP</option>
                          <option value="REEFER">REEFER</option>
                          <option value="RỖNG">RỖNG</option>
                          <option value="OTHER">OTHER</option>
                      </select>
                    </div>
                </div>
                 <div>
                    <label htmlFor="capacity" className="block text-sm font-medium text-slate-600">Capacity (TEUs)</label>
                    <input type="number" name="capacity" id="capacity" value={newBlock.capacity} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., 676" min="1" required />
                  </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="totalBays" className="block text-sm font-medium text-slate-600">Bays</label>
                    <input type="number" name="totalBays" id="totalBays" value={newBlock.totalBays} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" required />
                  </div>
                  <div>
                    <label htmlFor="rowsPerBay" className="block text-sm font-medium text-slate-600">Rows</label>
                    <input type="number" name="rowsPerBay" id="rowsPerBay" value={newBlock.rowsPerBay} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" required />
                  </div>
                  <div>
                    <label htmlFor="tiersPerBay" className="block text-sm font-medium text-slate-600">Tiers</label>
                    <input type="number" name="tiersPerBay" id="tiersPerBay" value={newBlock.tiersPerBay} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" min="1" required />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Block
                </button>
              </form>
            </div>

            {/* List of current blocks */}
            <div>
              <h3 className="font-bold text-slate-800 mb-2">Current Blocks</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {blocks.map(block => (
                  <div key={block.name} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                    <div>
                        <span className="font-semibold text-slate-800">{block.name}</span>
                        <span className="text-xs text-slate-500 ml-2">({block.group}, {block.capacity} TEUs, {block.totalBays} Bays, {block.rowsPerBay}x{block.tiersPerBay})</span>
                    </div>
                    {!block.isDefault ? (
                      <button
                        onClick={() => onRemoveBlock(block.name)}
                        className="text-red-500 hover:text-red-700"
                        title={`Remove block ${block.name}`}
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    ) : (
                       <span className="text-xs text-slate-400 font-medium mr-2">Default</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockConfigurator;