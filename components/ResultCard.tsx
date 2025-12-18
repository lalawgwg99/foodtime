
import React, { useState } from 'react';
import { ExpiryAnalysis, ScannedProduct } from '../types';
import { getDynamicStatus } from '../utils/dateUtils';

interface ResultCardProps {
    item: ExpiryAnalysis | ScannedProduct;
    isHistory?: boolean;
    onSave?: (item: ExpiryAnalysis) => void;
    onDelete?: (id: string) => void;
    onUpdate?: (id: string, updates: Partial<ScannedProduct>) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ item, isHistory = false, onSave, onDelete, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState({
        productName: item.productName || '',
        expiryDate: item.expiryDate || ''
    });

    const id = (item as ScannedProduct).id;
    const status = getDynamicStatus(editValues.expiryDate);
    const bgColors: Record<string, string> = { red: 'bg-red-500', orange: 'bg-orange-500', emerald: 'bg-emerald-500', slate: 'bg-slate-500' };
    const textColors: Record<string, string> = { red: 'text-red-700', orange: 'text-orange-700', emerald: 'text-emerald-700', slate: 'text-slate-700' };
    const lightBgColors: Record<string, string> = { red: 'bg-red-100', orange: 'bg-orange-100', emerald: 'bg-emerald-100', slate: 'bg-slate-100' };

    const handleShare = () => {
        const text = `【食安快報】\n品名：${editValues.productName}\n有效日期：${editValues.expiryDate}\n狀態：${status.label}\n\n來自：食安速查官 AI Pro`;
        if (navigator.share) {
            navigator.share({ title: '食安辨識結果', text }).catch(() => {
                navigator.clipboard.writeText(text);
                alert('已複製到剪貼簿');
            });
        } else {
            navigator.clipboard.writeText(text);
            alert('已複製到剪貼簿');
        }
    };

    const handleSaveEdit = () => {
        if (isHistory && id && onUpdate) {
            onUpdate(id, editValues);
        }
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-2">
            <div className={`p-3 ${bgColors[status.color]} text-white flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                    <i className={`fas ${status.type === 'expired' ? 'fa-skull-crossbones' : status.type === 'soon' ? 'fa-clock' : 'fa-check-circle'} text-sm`}></i>
                    <span className="font-bold text-sm tracking-wide">{status.label}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleShare} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-xs transition-colors" title="分享或複製">
                        <i className="fas fa-share-alt"></i>
                    </button>
                    {!isHistory ? (
                        <button onClick={() => onSave?.({ ...item, ...editValues })} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                            <i className="fas fa-bookmark mr-1"></i> 儲存
                        </button>
                    ) : (
                        <>
                            <button onClick={() => isEditing ? handleSaveEdit() : setIsEditing(true)} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-bold transition-colors">
                                <i className={`fas ${isEditing ? 'fa-check' : 'fa-edit'} mr-1`}></i> {isEditing ? '儲存' : '編輯'}
                            </button>
                            <button onClick={() => onDelete?.(id)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full text-xs transition-colors">
                                <i className="fas fa-trash"></i>
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="p-4 space-y-3">
                <div className="flex justify-between items-start gap-2">
                    <div className="w-full">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editValues.productName}
                                onChange={(e) => setEditValues(prev => ({ ...prev, productName: e.target.value }))}
                                className="w-full p-2 text-lg font-bold text-slate-800 border-2 border-indigo-100 rounded-lg focus:border-indigo-500 outline-none"
                            />
                        ) : (
                            <p className="text-lg font-bold text-slate-800 line-clamp-2 leading-tight">{editValues.productName}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">
                                <i className="fas fa-globe-asia"></i> {item.origin}
                            </span>
                            {item.confidence === 'high' && !isEditing && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                                    <i className="fas fa-certificate"></i> AI 信心辨識
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {item.storageDuration && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[11px] text-blue-900 flex gap-2">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                        <span className="font-medium">標籤標示保存期限：<span className="font-black underline">{item.storageDuration}</span></span>
                    </div>
                )}

                {(!editValues.expiryDate && item.storageDuration) && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-[11px] text-rose-900 flex gap-2 animate-pulse">
                        <i className="fas fa-exclamation-circle text-rose-500 mt-0.5"></i>
                        <span className="font-black leading-relaxed">注意：此商品僅標示保存期間，請根據「製造日期」手動推準並編輯有效日期。</span>
                    </div>
                )}

                {item.dateAmbiguityWarning && !isEditing && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex gap-2">
                        <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5"></i>
                        <span className="font-medium leading-relaxed">{item.dateAmbiguityWarning}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-black mb-1">製造日期</span>
                        <span className="font-mono text-slate-600 font-bold">{item.manufactureDate || '未標註'}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-black mb-1">有效日期</span>
                        {isEditing ? (
                            <input
                                type="date"
                                value={editValues.expiryDate}
                                onChange={(e) => setEditValues(prev => ({ ...prev, expiryDate: e.target.value }))}
                                className="w-full p-1 font-mono text-sm border border-indigo-100 rounded focus:border-indigo-500 outline-none"
                            />
                        ) : (
                            <span className={`font-mono font-black text-base ${status.color === 'red' ? 'text-red-600' : status.color === 'orange' ? 'text-orange-600' : 'text-emerald-600'}`}>
                                {editValues.expiryDate}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className={`text-xs px-3 py-1.5 rounded-lg inline-block font-black ${lightBgColors[status.color]} ${textColors[status.color]}`}>
                        {status.type === 'expired' ? `逾期 ${Math.abs(status.days || 0)} 天` : status.type === 'soon' ? `即將到期，請儘速食用` : `還可保存 ${status.days} 天`}
                    </div>
                    <span className="text-[10px] text-slate-300 font-mono italic" title="原始標籤文字">"{item.rawTextFound}"</span>
                </div>

                {!isEditing && (
                    <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                        <span className="font-bold text-slate-400 block mb-1">AI 判定邏輯：</span>
                        {item.summary}
                    </div>
                )}

                {item.groundingSources && item.groundingSources.length > 0 && !isEditing && (
                    <div className="pt-2">
                        <p className="text-[10px] font-bold text-slate-400 mb-2">Google Search 驗證：</p>
                        <div className="flex flex-wrap gap-2">
                            {item.groundingSources.map((src, idx) => (
                                <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 bg-white border border-indigo-100 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors flex items-center gap-1 shadow-sm">
                                    <i className="fas fa-link"></i> {src.title}
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResultCard;
