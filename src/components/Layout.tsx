import React from 'react';
import { ArrowLeft, Laptop, ShieldCheck } from 'lucide-react';
import { PageView } from '../types/gadget';

interface LayoutProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentPage, onNavigate, children }) => {
  const isHome = currentPage === 'home';

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-sky-50 to-blue-100 text-slate-800 font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-sky-100 shadow-sm h-16">
        <div className="relative max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
          
          {/* Left: Back Button (Only on sub-pages) */}
          <div className="z-10 flex items-center">
            {!isHome && (
              <button
                onClick={() => onNavigate('home')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* Absolute Center: Main Heading */}
          <div 
            onClick={() => onNavigate('home')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
              <Laptop className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-blue-900">
              GadgetVault
            </span>
          </div>

          {/* Right: Actions */}
          <div className="z-10 flex items-center gap-2">
            <button
              onClick={() => onNavigate('list')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${
                currentPage === 'list' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Gadgets
            </button>
            <button
              onClick={() => onNavigate('add')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition ${
                currentPage === 'add'
                  ? 'bg-blue-700 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              + Add
            </button>
          </div>

        </div>
      </header>

      {/* Main Page Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 border-t border-sky-100 py-4 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Gadget Tracker</span>
          </div>
          <p>© {new Date().getFullYear()} Standalone & Web</p>
        </div>
      </footer>

    </div>
  );
};