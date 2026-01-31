
import React, { useEffect, useRef, useState } from 'react';

interface GamePreviewProps {
  code: string;
  onBack?: () => void;
}

const GamePreview: React.FC<GamePreviewProps> = ({ code, onBack }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
        
        // Ensure iframe has focus so keyboard events work immediately
        setTimeout(() => {
          if (iframeRef.current) {
            iframeRef.current.focus();
          }
        }, 300);
      }
    }
  }, [code]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error enabling fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full bg-[#000] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5 group flex flex-col transition-all duration-500 ${isFullscreen ? 'rounded-none border-none' : 'ring-1 ring-white/10 ring-inset'}`}
    >
      {/* Control Bar */}
      <div className={`flex items-center justify-between px-4 md:px-8 h-12 md:h-14 bg-[#0a0a0a] border-b border-white/5 transition-all z-20 select-none ${isFullscreen ? 'opacity-0 hover:opacity-100 absolute top-0 left-0 right-0 bg-[#0a0a0a]/80 backdrop-blur-md' : ''}`}>
        <div className="flex items-center gap-2 md:gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-[9px] font-black text-sky-500 hover:text-sky-400 uppercase tracking-[0.2em] px-3 py-2 rounded-xl bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/20 transition-all active:scale-95"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="4" viewBox="0 0 24 24">
                <path d="M15 19l-7-7 7-7" />
              </svg>
              FORGE
            </button>
          )}
          
          <div className="hidden xs:flex gap-1.5 ml-1">
            <div className="w-2 h-2 rounded-full bg-red-500/20" />
            <div className="w-2 h-2 rounded-full bg-amber-500/20" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
          </div>
          <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block"></div>
          <span className="text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hidden sm:inline transition-colors">Adaptive Core 3.0</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <button 
            onClick={() => iframeRef.current?.focus()}
            className="text-[8px] md:text-[9px] font-black text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 uppercase tracking-[0.2em] px-3 md:px-4 py-2 rounded-xl border border-white/5 transition-all active:scale-95"
          >
            FOCUS
          </button>
          <button 
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 14h6m0 0v6m0-6-7 7M20 4l-7 7m0 0H7m6 0v6"/></svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6m0 0v6m0-6L14 10M9 21H3m0 0v-6m0 6 7-7"/></svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-black z-10 overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Game Core"
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-modals allow-pointer-lock allow-forms allow-same-origin"
          allow="autoplay; fullscreen; pointer-lock"
        />
      </div>

      {/* Frame Polish */}
      {!isFullscreen && (
        <div className="absolute inset-0 pointer-events-none border-[1px] border-white/5 rounded-[2.5rem] z-30 shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]"></div>
      )}
    </div>
  );
};

export default GamePreview;
