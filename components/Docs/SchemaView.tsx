import { FileJson } from 'lucide-react';

export default function SchemaView() {
  const parcelSchema = `{
  "id": "uuid-v4",
  "apn": "123-456-789",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[...]]] // GeoJSON standard
  },
  "zoning": "R-1",
  "setbacks": {
    "front": 20, // feet
    "back": 10,
    "side": 5,
    "fire_allowance": true
  },
  "max_lot_coverage": 0.40, // 40% max built footprint
  "requires_hoa_approval": false
}`;

  const aduSchema = `{
  "id": "template_box_01",
  "name": "Urban Flat Roof Series",
  "dimensions": {
    "width": 20,
    "length": 30,
    "height": 12
  },
  "footprintArea": 600,
  "basePrice": 85000,
  "materials_supported": ["stucco", "wood_siding", "corrugated"],
  "model_url": "s3://urbanlens-assets/models/box_01.glb",
  "anchor_points": [
    // Pre-calculated docking coords for snapping
    {"x": -10, "y": 0, "z": -15} 
  ]
}`;

  const sessionSchema = `{
  "session_id": "uuid-v4",
  "user_id": "auth-001",
  "parcel_id": "uuid-v4",
  "selected_adu": "template_box_01",
  "transform": {
    "position": {"x": 5, "y": 0, "z": -10}, // Meters from origin
    "rotation_y": 90, // Degrees
    "scale": 1
  },
  "customizations": {
    "material": "stucco",
    "roof": "flat",
    "energy_package": "solar_lite"
  },
  "calculated_costs": {
    "total": 92000,
    "breakdown": {
      "base": 85000,
      "upgrades": 7000
    }
  }
}`;

  return (
    <div className="max-w-5xl mx-auto p-8 md:p-12">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-4 text-emerald-400">System Data Dictionary</h2>
        <p className="text-slate-400 text-lg">
          Standardized JSON structures defining the boundaries between the GIS databases, the AR client, and ADU design templates.
        </p>
      </div>

      <div className="space-y-8">
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <FileJson size={16} className="text-emerald-400" />
              Parcel Context Definition
            </span>
            <span className="text-xs text-slate-500 font-mono">GeoJSON / Zillow API Extension</span>
          </div>
          <pre className="p-6 overflow-x-auto text-sm font-mono text-emerald-300">
            <code>{parcelSchema}</code>
          </pre>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <FileJson size={16} className="text-indigo-400" />
              ADU Master Template
            </span>
            <span className="text-xs text-slate-500 font-mono">3D Asset Registry</span>
          </div>
          <pre className="p-6 overflow-x-auto text-sm font-mono text-indigo-300">
            <code>{aduSchema}</code>
          </pre>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="bg-slate-800/50 px-6 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <FileJson size={16} className="text-purple-400" />
              User AR Placement Session
            </span>
            <span className="text-xs text-slate-500 font-mono">Real-time State</span>
          </div>
          <pre className="p-6 overflow-x-auto text-sm font-mono text-purple-300">
            <code>{sessionSchema}</code>
          </pre>
        </div>

      </div>
    </div>
  );
}
