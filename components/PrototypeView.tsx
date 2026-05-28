'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { SlidersHorizontal, Building2, Box, AlertCircle } from 'lucide-react';

const ADUCanvas = dynamic(() => import('./ADUCanvas'), { ssr: false });

export default function PrototypeView() {
  const [config, setConfig] = useState<{
    width: number;
    length: number;
    height: number;
    roof: 'flat' | 'pitched';
    material: 'wood' | 'stucco' | 'metal';
    windows: boolean;
    maxCoveragePercentage: number;
  }>({
    width: 20,
    length: 30,
    height: 12,
    roof: 'flat',
    material: 'stucco',
    windows: true,
    maxCoveragePercentage: 10,
  });

  const sqft = config.width * config.length;
  
  const baseCost = 60000;
  const costPerSqft = config.material === 'metal' ? 180 : config.material === 'stucco' ? 220 : 190;
  const totalCost = baseCost + (sqft * costPerSqft) + (config.roof === 'pitched' ? 8000 : 0);
  
  const lotArea = 8000; // 80x100
  const maxSqft = (lotArea * config.maxCoveragePercentage) / 100;
  const isValid = sqft <= maxSqft;

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="flex-1 relative bg-slate-950 cursor-move border-t md:border-t-0 md:border-r border-slate-800">
        <ADUCanvas config={config} />
        
        <div className="absolute top-6 left-6 flex flex-col gap-2 pointer-events-none">
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 rounded-xl shadow-xl flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
              <Box size={20} />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">Simulator View</p>
              <p className="text-sm font-medium text-slate-200">Interactive 3D Web Preview</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full md:w-96 bg-slate-900 flex flex-col overflow-y-auto">
        <div className="p-6 border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <SlidersHorizontal size={20} className="text-cyan-400" />
            Configuration
          </h2>
          <p className="text-sm text-slate-400 mt-1">Adjust ADU parameters and calculate estimates.</p>
        </div>

        <div className="p-6 space-y-8 flex-1">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
               Dimensions
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 flex justify-between mb-1">
                  Width (ft): <span className="text-slate-200 font-mono">{config.width}</span>
                </label>
                <input 
                  type="range" min="10" max="40" 
                  value={config.width} 
                  onChange={(e) => setConfig({ ...config, width: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500" 
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-400 flex justify-between mb-1">
                  Length (ft): <span className="text-slate-200 font-mono">{config.length}</span>
                </label>
                <input 
                  type="range" min="10" max="50" 
                  value={config.length} 
                  onChange={(e) => setConfig({ ...config, length: parseInt(e.target.value) })}
                  className="w-full accent-cyan-500" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2 uppercase tracking-wider">
               Materials & Finish
            </h3>
            
            <div className="grid grid-cols-2 gap-3 pb-2">
              <div className="space-y-2">
                 <label className="text-xs text-slate-500">Exterior</label>
                 <select 
                    value={config.material}
                    onChange={(e) => setConfig({ ...config, material: e.target.value as typeof config.material })}
                    className="w-full bg-slate-800 border-none text-sm text-slate-200 rounded p-2 focus:ring-1 focus:ring-cyan-500 outline-none"
                 >
                    <option value="wood">Wood Siding</option>
                    <option value="stucco">Stucco</option>
                    <option value="metal">Corrugated Metal</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-xs text-slate-500">Roofing</label>
                 <select 
                    value={config.roof}
                    onChange={(e) => setConfig({ ...config, roof: e.target.value as typeof config.roof })}
                    className="w-full bg-slate-800 border-none text-sm text-slate-200 rounded p-2 focus:ring-1 focus:ring-cyan-500 outline-none"
                 >
                    <option value="flat">Standard Flat</option>
                    <option value="pitched">Pitched / Gable</option>
                 </select>
              </div>
            </div>
            
            <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
              <input 
                type="checkbox" 
                checked={config.windows} 
                onChange={(e) => setConfig({ ...config, windows: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700" 
              />
              <span className="text-sm text-slate-300">Include Entry / Windows</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Total Area</span>
              <span className={`font-mono text-sm ${!isValid ? 'text-red-400' : 'text-slate-200'}`}>
                {sqft} sq ft
              </span>
            </div>
            
            {!isValid && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <p>Exceeds local zoning maximum of {maxSqft} sq ft for this parcel.</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 border-dashed flex items-center justify-between">
              <span className="text-sm text-slate-400 font-medium">Est. Build Cost</span>
              <span className="text-2xl font-semibold text-cyan-400 tracking-tight">
                ${totalCost.toLocaleString()}
              </span>
            </div>
            
            <button className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg transition-colors mt-2 text-sm flex justify-center items-center gap-2">
              <Building2 size={18} />
              Generate Blueprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
