
import React from 'react';

interface ScannerHeaderProps {
    view: 'scanner' | 'history' | 'live';
    savedCount: number;
    setView: (view: 'scanner' | 'history' | 'live') => void;
}

const ScannerHeader: React.FC<ScannerHeaderProps> = ({ view, savedCount, setView }) => {
    return (
        <header className="w-full max-w-md p-6 text-center">
            <h1 className="text-2xl font-black text-indigo-700 tracking-tighter flex items-center justify-center gap-2">
                <i className="fas fa-barcode text-indigo-600"></i>
                食安速查官 <span className="text-[10px] bg-indigo-100 px-2 py-0.5 rounded-full align-middle ml-1">AI Pro</span>
            </h1>
            <div className="flex bg-slate-200 p-1 rounded-2xl mt-6 shadow-inner">
                <button
                    onClick={() => setView('scanner')}
                    className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${view === 'scanner' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500'}`}
                >
                    智慧辨識
                </button>
                <button
                    onClick={() => setView('history')}
                    className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${view === 'history' ? 'bg-white text-indigo-700 shadow-md' : 'text-slate-500'}`}
                >
                    存檔清單 ({savedCount})
                </button>
            </div>
        </header>
    );
};

export default ScannerHeader;
