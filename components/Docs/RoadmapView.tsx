import { CheckCircle2, Circle, Play } from 'lucide-react';

export default function RoadmapView() {
  return (
    <div className="max-w-4xl mx-auto p-8 md:p-12">
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight mb-4">Development Roadmap</h2>
        <p className="text-slate-400 text-lg">
          A phased execution strategy for the UrbanLens platform, moving from core feasibility to full commercial deployment.
        </p>
      </div>

      <div className="relative border-l border-slate-800 ml-4 space-y-16 pl-8 pb-12">
        
        <div className="relative">
          <div className="absolute -left-[45px] bg-slate-950 p-1 rounded-full">
            <div className="bg-cyan-500 w-5 h-5 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <Play size={10} className="text-slate-950 ml-0.5" />
            </div>
          </div>
          
          <div className="bg-slate-800/30 border border-cyan-500/30 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-3">
              Phase 1: Minimal Viable Product (MVP)
              <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded font-mono uppercase tracking-wider">Current</span>
            </h3>
            <p className="text-slate-400 text-sm mb-6">Validate core AR placement scaling, cost configurations, and spatial rendering.</p>
            
            <ul className="space-y-3">
              {[
                "Web-based 3D configurator (React Three Fiber)",
                "Basic iOS AR App skeleton (ARKit wrapper)",
                "Standard Box constraint generation (Setback rendering)",
                "Parameter-driven real-time cost calculator",
                "Export snapshot capabilities (2D image capture)"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[45px] bg-slate-950 p-1 rounded-full">
            <div className="bg-slate-800 border-2 border-indigo-500 w-5 h-5 rounded-full"></div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors">
            <h3 className="text-xl font-semibold text-white mb-2">Phase 2: Geographic & Data Integration</h3>
            <p className="text-slate-400 text-sm mb-6">Tie the visualizer into real-world geographic constraints and property intelligence.</p>
            
            <ul className="space-y-3">
              {[
                "Integrate PostGIS database for real residential parcel shapes",
                "Implementation of real city zoning rules (e.g. Los Angeles R-1 constraints)",
                "LiDAR dynamic occlusion (hiding ADU behind real trees)",
                "Cloud-based save and share (Session states)",
                "High-fidelity procedural materials (PBR textures)"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                  <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-[45px] bg-slate-950 p-1 rounded-full">
            <div className="bg-slate-800 border-2 border-slate-600 w-5 h-5 rounded-full"></div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors opacity-75">
            <h3 className="text-xl font-semibold text-slate-300 mb-2">Phase 3: Commercial & Workflow Polish</h3>
            <p className="text-slate-500 text-sm mb-6">Bridging the gap between a consumer plaything and a contractor-grade validation tool.</p>
            
            <ul className="space-y-3">
              {[
                "Permit-Readiness scoring engine based on structural placement",
                "Realtor Admin Portal for batch property processing",
                "Direct API lead routing to local ADU contractors",
                "Shadow simulations over a 12-hour day cycle",
                "Export full scene to CAD/BIM standards via GLTF/IFC"
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-500">
                  <Circle className="w-5 h-5 text-slate-700 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
