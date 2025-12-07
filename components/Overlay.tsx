import React from 'react';
import { TreeState } from '../types';

interface OverlayProps {
  treeState: TreeState;
  setTreeState: (state: TreeState) => void;
}

const Overlay: React.FC<OverlayProps> = ({ treeState, setTreeState }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex flex-col justify-between p-8 z-10">
      {/* Header */}
      <div className="flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-serif text-amber-200 tracking-widest uppercase text-center drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          Arix Signature
        </h1>
        <div className="h-px w-32 bg-amber-400 mt-4 mb-2 shadow-[0_0_8px_#FFD700]"></div>
        <p className="text-amber-100/70 text-sm tracking-[0.3em] font-light">
          INTERACTIVE HOLIDAY EXPERIENCE
        </p>
      </div>

      {/* Footer / Controls */}
      <div className="flex flex-col items-center pointer-events-auto mb-10">
        <button
          onClick={() => setTreeState(treeState === TreeState.SCATTERED ? TreeState.TREE_SHAPE : TreeState.SCATTERED)}
          className={`
            relative px-12 py-4 group overflow-hidden transition-all duration-500 ease-out
            border border-amber-500/50 backdrop-blur-md rounded-full
            hover:border-amber-400 hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]
          `}
        >
          {/* Button Background Gradient */}
          <div className={`absolute inset-0 w-full h-full bg-gradient-to-r from-emerald-900/80 to-black/80 transition-opacity duration-500 ${treeState === TreeState.TREE_SHAPE ? 'opacity-100' : 'opacity-60'}`} />
          
          {/* Button Text */}
          <span className="relative z-10 text-amber-100 font-serif text-lg tracking-widest flex items-center gap-3">
            {treeState === TreeState.SCATTERED ? (
              <>
                <span>ASSEMBLE TREE</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </>
            ) : (
              <>
                <span>SCATTER MAGIC</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </>
            )}
          </span>
        </button>

        <p className="mt-4 text-emerald-500/40 text-xs tracking-widest">
           {treeState === TreeState.SCATTERED ? "CHAOS MODE" : "ORDER MODE"}
        </p>
      </div>
    </div>
  );
};

export default Overlay;
