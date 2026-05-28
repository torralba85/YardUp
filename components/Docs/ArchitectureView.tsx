import { Database, Smartphone, Monitor, ShieldCheck } from 'lucide-react';

export default function ArchitectureView() {
  return (
    <div className="max-w-5xl mx-auto p-8 md:p-12 space-y-12">
      <div className="max-w-3xl">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Project Architecture</h2>
        <p className="text-slate-400 text-lg">
          The UrbanLens system requires a multi-faceted architecture mapping global GIS boundaries through to real-time spatial positioning on mobile devices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
          <Smartphone className="text-cyan-400 w-8 h-8 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">AR End-User Client</h3>
          <p className="text-sm text-slate-400 mb-4">iOS and Android applications enabling on-site spatial computing.</p>
          <ul className="text-xs space-y-2 text-slate-500 font-mono">
            <li>• Unity3D (AR Foundation)</li>
            <li>• ARKit (LiDAR meshing)</li>
            <li>• ARCore (Depth API)</li>
            <li>• React Native (UI Overlay)</li>
          </ul>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
          <Monitor className="text-purple-400 w-8 h-8 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Web Previewer (Admin)</h3>
          <p className="text-sm text-slate-400 mb-4">Browser-based visualization tool for realtors and remote pre-planning.</p>
          <ul className="text-xs space-y-2 text-slate-500 font-mono">
            <li>• Next.js 15 (React)</li>
            <li>• TailwindCSS</li>
            <li>• Three.js + React Three Fiber</li>
            <li>• Mapbox GL (Topography)</li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm hover:border-slate-700 transition-colors">
          <Database className="text-emerald-400 w-8 h-8 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Data & Engine Layer</h3>
          <p className="text-sm text-slate-400 mb-4">Centralized parcel intelligence, permitting constraints, and 3D assets.</p>
          <ul className="text-xs space-y-2 text-slate-500 font-mono">
            <li>• PostgreSQL + PostGIS</li>
            <li>• Node.js / GraphQL API</li>
            <li>• AWS S3 (GLTF Model Hosting)</li>
            <li>• Zillow/Local GIS endpoints</li>
          </ul>
        </div>
      </div>

      {/* Constraints & Accuracy */}
      <div className="bg-slate-800/20 border border-indigo-500/20 rounded-2xl p-8 mt-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <ShieldCheck className="text-indigo-400 w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white">Accuracy & Localization Constraints</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              <strong className="text-indigo-300">Spatial Alignment:</strong> ARKit/ARCore rely on visual-inertial odometry. To achieve the 5-10cm success criteria in outdoor environments, the app must request user scanning (sweeping the device) to build an immediate mesh before placing an anchor.
            </p>
            <p>
              <strong className="text-indigo-300">GPS Fallback:</strong> Consumer GPS is accurate to ~3 meters. We cannot rely strictly on coordinate GPS to peg corner setbacks. Real-world boundaries must be manually aligned inside the AR view against known physical markers (fences).
            </p>
          </div>
          <div className="space-y-4 text-sm text-slate-300">
            <p>
              <strong className="text-indigo-300">Occlusion & Lighting:</strong> Rendering realistic ADUs requires dynamic environmental lighting probes (capturing real-world light via camera) and depth API to occlude the building behind existing trees or structures.
            </p>
            <p>
              <strong className="text-indigo-300">Scale Perception:</strong> AR visuals must always render at exactly 1:1 scale. To prevent UI from clipping improperly into the ground plane, all models origin points must be perfectly bottom-centered.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
