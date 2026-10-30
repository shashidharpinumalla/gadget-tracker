import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  ArrowLeft, 
  PlusCircle, 
  Tag, 
  Calendar, 
  DollarSign, 
  Shield, 
  Hash, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  ShieldCheck,
  PackageOpen,
  Lock,
  LogOut
} from 'lucide-react';

export interface Gadget {
  id: string;
  name: string;
  category: string;
  purchaseDate: string;
  price: number;
  warrantyMonths: number;
  serialNumber?: string;
  notes?: string;
}

export type PageView = 'home' | 'list' | 'add';

// --- AUTH & STORAGE CONFIG ---
const APP_PIN = "7890"; // <-- Set your private passcode here
const AUTH_KEY = "gadget_vault_authenticated";
const STORAGE_KEY = "gadget_vault_items";

const CATEGORIES = [
  'Smartphones & Tablets',
  'Laptops & Computers',
  'Audio & Headphones',
  'Gaming & Consoles',
  'Cameras & Gear',
  'Smart Home & IoT',
  'Accessories & Cables',
  'Other'
];

// --- SOUND UTILITIES (Web Audio API) ---
class SoundManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!this.ctx) this.ctx = new AudioCtx();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  playAddSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.18, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.35);
    } catch {
      // Audio fallback
    }
  }

  playDeleteSound() {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio fallback
    }
  }
}

const sounds = new SoundManager();

const getWarrantyStatus = (purchaseDate: string, warrantyMonths: number) => {
  if (!warrantyMonths || warrantyMonths <= 0) return { status: 'none', label: 'No Warranty', daysLeft: 0 };
  const purchase = new Date(purchaseDate);
  const expiry = new Date(purchase);
  expiry.setMonth(expiry.getMonth() + warrantyMonths);

  const diffTime = expiry.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return { status: 'expired', label: 'Expired', daysLeft: 0 };
  if (diffDays <= 30) return { status: 'expiring', label: `${diffDays} days left`, daysLeft: diffDays };
  return { status: 'active', label: `${Math.ceil(diffDays / 30)} mos left`, daysLeft: diffDays };
};

export default function App() {
  // Passcode gate state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem(AUTH_KEY) === 'true';
  });
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const [gadgets, setGadgets] = useState<Gadget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gadgets));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [gadgets]);

  // Form states
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState('');
  const [warrantyMonths, setWarrantyMonths] = useState('12');
  const [serialNumber, setSerialNumber] = useState('');
  const [notes, setNotes] = useState('');

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === APP_PIN) {
      localStorage.setItem(AUTH_KEY, 'true');
      setIsAuthenticated(true);
      setPinError(false);
      setEnteredPin('');
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  const handleLock = () => {
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
  };

  const handleSaveGadget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = `g_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newGadget: Gadget = {
      id: newId,
      name: name.trim(),
      category,
      purchaseDate,
      price: parseFloat(price) || 0,
      warrantyMonths: parseInt(warrantyMonths, 10) || 0,
      serialNumber: serialNumber.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setGadgets((prev) => [newGadget, ...prev]);
    sounds.playAddSound();

    setName('');
    setPrice('');
    setSerialNumber('');
    setNotes('');
    setCurrentPage('list');
  };

  const handleDeleteGadget = (id: string) => {
    setGadgets((prev) => prev.filter((item) => item.id !== id));
    sounds.playDeleteSound();
  };

  const filteredGadgets = gadgets.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.serialNumber && g.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || g.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalInvestment = gadgets.reduce((sum, item) => sum + item.price, 0);
  const activeWarranties = gadgets.filter((g) => getWarrantyStatus(g.purchaseDate, g.warrantyMonths).status === 'active').length;

  // --- PASSCODE GATE VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-sky-50 to-blue-100 p-4 font-sans text-slate-800 antialiased">
        <div className="w-full max-w-sm bg-white p-8 rounded-2xl border border-sky-200 shadow-xl text-center space-y-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-sky-400 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
            <Lock className="w-7 h-7" />
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Private Vault</h2>
            <p className="text-xs text-slate-500 mt-1">Enter your passcode to access your tracker</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <input
                type="password"
                autoFocus
                placeholder="Enter passcode..."
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value);
                  setPinError(false);
                }}
                className={`w-full text-center tracking-widest text-lg font-mono px-4 py-3 rounded-xl border ${
                  pinError ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-300 bg-white text-slate-800'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition shadow-xs`}
              />
              {pinError && (
                <p className="text-xs text-rose-500 font-semibold mt-1.5 animate-pulse">
                  Incorrect passcode. Try again.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold rounded-xl shadow-md transition cursor-pointer"
            >
              Unlock Vault
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED APP VIEW ---
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-white via-sky-50 to-blue-100 text-slate-800 antialiased font-sans">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-sky-200 shadow-sm h-16">
        <div className="relative max-w-6xl mx-auto h-full px-4 flex items-center justify-between">
          
          {/* Left: Back Button */}
          <div className="z-10 flex items-center min-w-[80px]">
            {currentPage !== 'home' && (
              <button
                onClick={() => setCurrentPage('home')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl shadow-sm transition hover:shadow cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Back</span>
              </button>
            )}
          </div>

          {/* Absolute Center Title */}
          <div 
            onClick={() => setCurrentPage('home')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer select-none"
          >
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-sky-400 text-white rounded-xl shadow-md border border-blue-400/30">
              <Laptop className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-700 via-sky-600 to-blue-900 bg-clip-text text-transparent">
              GadgetVault
            </h1>
          </div>

          {/* Right Navigation + Lock Button */}
          <div className="z-10 flex items-center gap-2">
            <button
              onClick={() => setCurrentPage('list')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-xl border transition cursor-pointer ${
                currentPage === 'list' 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                  : 'bg-white/70 text-slate-700 border-sky-200 hover:bg-white shadow-xs'
              }`}
            >
              Collection ({gadgets.length})
            </button>
            <button
              onClick={() => setCurrentPage('add')}
              className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl border transition cursor-pointer ${
                currentPage === 'add'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                  : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'
              }`}
            >
              + Add
            </button>
            <button
              onClick={handleLock}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition cursor-pointer"
              title="Lock Vault"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        
        {/* VIEW 1: HOME PAGE */}
        {currentPage === 'home' && (
          <div className="flex flex-col items-center justify-center py-6 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/80 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider border border-blue-200 shadow-xs">
              Personal Hardware & Warranty Ledger
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight max-w-2xl">
              Track purchase dates, costs, and warranties in one place.
            </h2>

            {/* Stat Boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl pt-2">
              <div className="p-5 bg-white rounded-2xl border border-sky-200 shadow-md text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Gadgets</span>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">{gadgets.length}</p>
              </div>
              <div className="p-5 bg-white rounded-2xl border border-sky-200 shadow-md text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Invested</span>
                <p className="text-3xl font-extrabold text-blue-600 mt-1">${totalInvestment.toFixed(2)}</p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-5 bg-white rounded-2xl border border-sky-200 shadow-md text-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Under Warranty</span>
                <p className="text-3xl font-extrabold text-emerald-600 mt-1">{activeWarranties}</p>
              </div>
            </div>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl pt-2 text-left">
              <div 
                onClick={() => setCurrentPage('add')}
                className="p-6 bg-white rounded-2xl border border-sky-200 shadow-md hover:shadow-lg hover:border-blue-400 transition cursor-pointer group"
              >
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl w-fit border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition shadow-xs">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-4">Add New Gadget</h3>
                <p className="text-xs text-slate-500 mt-1">Record device specs, purchase dates, prices, and warranties.</p>
              </div>

              <div 
                onClick={() => setCurrentPage('list')}
                className="p-6 bg-white rounded-2xl border border-sky-200 shadow-md hover:shadow-lg hover:border-blue-400 transition cursor-pointer group"
              >
                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl w-fit border border-sky-100 group-hover:bg-sky-600 group-hover:text-white transition shadow-xs">
                  <PackageOpen className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-4">View All Gadgets</h3>
                <p className="text-xs text-slate-500 mt-1">Search, inspect warranties, and manage stored devices.</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: ADD GADGET FORM */}
        {currentPage === 'add' && (
          <div className="w-full max-w-xl mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-sky-200 shadow-lg">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-sky-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-xs">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Add New Gadget</h2>
                <p className="text-xs text-slate-500">Device specs, purchase date & warranty details</p>
              </div>
            </div>

            <form onSubmit={handleSaveGadget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Gadget / Model Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sony WH-1000XM5, iPhone 15 Pro, Dell XPS"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" />
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                    Price ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    Warranty (Months)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="12"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-blue-500" />
                  Serial Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="SN-XXXXX-XXXX"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  Notes / Purchase Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Bought from store, receipt filed, accessories included..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-sm bg-white shadow-xs resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
              >
                Save Gadget
              </button>
            </form>
          </div>
        )}

        {/* VIEW 3: GADGET LIST PAGE */}
        {currentPage === 'list' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-sky-200 shadow-md">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search gadgets or serial #..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white shadow-xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition bg-white text-slate-700 shadow-xs"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <button
                  onClick={() => setCurrentPage('add')}
                  className="px-3.5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Empty State */}
            {filteredGadgets.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-sky-200 shadow-md space-y-3">
                <PackageOpen className="w-12 h-12 text-sky-400 mx-auto" />
                <h3 className="text-lg font-bold text-slate-700">No gadgets found</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  {searchTerm ? 'No gadgets match your search filters.' : 'Your vault is empty. Click "+ Add" to log your first gadget!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGadgets.map((gadget) => {
                  const warranty = getWarrantyStatus(gadget.purchaseDate, gadget.warrantyMonths);

                  return (
                    <div 
                      key={gadget.id}
                      className="bg-white p-5 rounded-2xl border border-sky-200 shadow-md hover:shadow-lg transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {gadget.category}
                            </span>
                            <h3 className="text-lg font-bold text-slate-800 mt-1">{gadget.name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-extrabold text-slate-900 bg-sky-50 px-2.5 py-1 rounded-xl border border-sky-200 shadow-xs">
                              ${gadget.price.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleDeleteGadget(gadget.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition cursor-pointer"
                              title="Delete Gadget"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-slate-600">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Purchased</span>
                            <p className="font-medium mt-0.5">{gadget.purchaseDate}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Warranty Status</span>
                            <span className={`inline-flex items-center gap-1 font-semibold mt-0.5 ${
                              warranty.status === 'active' 
                                ? 'text-emerald-600' 
                                : warranty.status === 'expiring' 
                                ? 'text-amber-600' 
                                : 'text-slate-400'
                            }`}>
                              {warranty.status === 'active' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {warranty.status === 'expiring' && <Clock className="w-3.5 h-3.5" />}
                              {warranty.status === 'expired' && <AlertTriangle className="w-3.5 h-3.5" />}
                              {warranty.label}
                            </span>
                          </div>
                        </div>

                        {gadget.serialNumber && (
                          <div className="mt-3 text-xs bg-slate-50 p-2 rounded-lg font-mono text-slate-600 border border-slate-200">
                            <span className="text-slate-400 select-none">SN: </span>
                            {gadget.serialNumber}
                          </div>
                        )}

                        {gadget.notes && (
                          <p className="mt-2 text-xs text-slate-600 italic bg-sky-50/60 p-2 rounded-lg border border-sky-100">
                            "{gadget.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white/90 border-t border-sky-200 py-4 text-xs text-slate-500 shadow-xs">
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
}