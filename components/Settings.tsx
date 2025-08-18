
import React, { useState, useEffect } from 'react';
import { AppSettings, Rarity, ColorTheme } from '../types';
import { deleteAllData, saveApiKey, loadApiKey } from '../services/storageService';
import { useGame } from '../contexts/GameContext';
import { reinitializeAiClient } from '../services/geminiService';

interface SettingsProps {
    onClose: () => void;
}

const Slider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min?: number; max?: number, step?: number }> = ({ label, value, onChange, min = 0, max = 1, step = 0.01 }) => (
    <div>
        <label className="block text-[var(--color-text-medium)] mb-2">{label}: {Math.round(value * 100)}%</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer"
        />
    </div>
);

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
    const { appSettings, handleSettingsChange } = useGame();
    const [currentSettings, setCurrentSettings] = useState<AppSettings>(appSettings);
    const [apiKey, setApiKey] = useState('');
    const [notification, setNotification] = useState('');

    useEffect(() => {
        const savedKey = loadApiKey();
        if (savedKey) {
            setApiKey(savedKey);
        }
    }, []);

    const handleChange = (field: keyof AppSettings, value: any) => {
        setCurrentSettings(prev => ({ ...prev, [field]: value }));
    };

    const handleAutoDismantleChange = (rarity: Rarity) => {
        const newSettings = { ...currentSettings };
        newSettings.autoDismantleRarities[rarity] = !newSettings.autoDismantleRarities[rarity];
        setCurrentSettings(newSettings);
    };

    const handleSaveSettings = () => {
        handleSettingsChange(currentSettings);
        saveApiKey(apiKey);
        reinitializeAiClient();
        setNotification('Đã lưu thiết lập!');
        setTimeout(() => setNotification(''), 2000);
    };

    const handleDeleteAllData = () => {
        if (window.confirm("BẠN CÓ CHẮC CHẮN KHÔNG?\nHành động này sẽ xóa TOÀN BỘ dữ liệu game, bao gồm các file lưu và thiết lập. Không thể hoàn tác.")) {
            if (window.confirm("XÁC NHẬN LẦN CUỐI:\nXóa tất cả dữ liệu?")) {
                deleteAllData();
                alert("Đã xóa toàn bộ dữ liệu. Ứng dụng sẽ tải lại.");
                window.location.reload();
            }
        }
    }
    
    const rarities = Object.values(Rarity);

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4">
            <div className="bg-[var(--color-bg-main)] border border-[var(--color-bg-tertiary)] rounded-2xl shadow-2xl p-8 w-full max-w-lg text-[var(--color-text-light)] relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-[var(--color-text-dark)] hover:text-[var(--color-text-light)] text-3xl z-10">&times;</button>
                <h2 className="text-3xl font-bold text-center text-[var(--color-primary-light)] mb-6">Thiết Lập</h2>

                {notification && <div className="text-center bg-green-500/20 text-green-300 p-2 rounded-lg mb-4">{notification}</div>}

                <div className="space-y-6">
                     <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">API Key</h3>
                        <p className="text-xs text-[var(--color-text-dark)] mb-2">Nhập Google Gemini API Key của bạn. Key này sẽ được ưu tiên hơn so với key hệ thống (nếu có).</p>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Nhập API Key..."
                            className="w-full bg-[var(--color-bg-secondary)] p-3 rounded-lg border-2 border-[var(--color-bg-quaternary)] focus:border-[var(--color-primary)] outline-none transition"
                        />
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">Gameplay</h3>
                        <Slider label="Tốc Độ Hoạt Cảnh" value={currentSettings.gameSpeed} onChange={e => handleChange('gameSpeed', parseFloat(e.target.value))} />
                        <Slider label="Tần Suất Sự Kiện" value={currentSettings.eventFrequency} onChange={e => handleChange('eventFrequency', parseFloat(e.target.value))} min={0} max={1} step={0.05} />
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3 flex items-center gap-2">
                            <span className="bg-pink-600 text-white font-bold rounded-md px-2 py-1 text-lg">A</span>
                            <span className="text-blue-400">Cài Đặt Font</span>
                        </h3>
                        <div className="space-y-4 bg-[var(--color-bg-secondary)] p-4 rounded-lg border border-[var(--color-bg-quaternary)]">
                            <div>
                                <label className="flex justify-between text-[var(--color-text-medium)] mb-2">
                                    <span>Kích cỡ font:</span>
                                    <span className="font-bold">{currentSettings.fontSize}px</span>
                                </label>
                                <div className="flex items-center gap-4">
                                    <span className="text-xs text-[var(--color-text-dark)]">12px</span>
                                    <input
                                        type="range"
                                        min="12"
                                        max="32"
                                        step="1"
                                        value={currentSettings.fontSize}
                                        onChange={e => handleChange('fontSize', parseInt(e.target.value, 10))}
                                        className="w-full h-2 bg-[var(--color-bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-light)]"
                                    />
                                    <span className="text-xs text-[var(--color-text-dark)]">32px</span>
                                </div>
                            </div>
                            
                            <div 
                                className="p-4 bg-[var(--color-bg-tertiary)] rounded-lg text-center text-[var(--color-text-light)] transition-all"
                                style={{ fontSize: `${currentSettings.fontSize}px`, fontFamily: `'${currentSettings.fontFamily}', sans-serif` }}
                            >
                                Đây là văn bản mẫu với font hiện tại
                            </div>

                            <div>
                                <label className="block text-[var(--color-text-medium)] mb-2">Loại font</label>
                                <select
                                    value={currentSettings.fontFamily}
                                    onChange={e => handleChange('fontFamily', e.target.value)}
                                    className="w-full bg-[var(--color-bg-tertiary)] p-3 rounded-lg border-2 border-[var(--color-bg-quaternary)] focus:border-[var(--color-primary)] outline-none transition"
                                >
                                    <option value="Inter">Inter (Mặc định)</option>
                                    <option value="Be Vietnam Pro">Be Vietnam Pro</option>
                                </select>
                            </div>
                        </div>
                    </div>

                     <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">Giao Diện</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[var(--color-text-medium)] mb-2">Chủ đề màu sắc</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <button onClick={() => handleChange('colorTheme', ColorTheme.DEFAULT)} className={`p-2 rounded-md text-sm transition ${currentSettings.colorTheme === ColorTheme.DEFAULT ? 'bg-purple-600 text-white' : 'bg-[var(--color-bg-tertiary)] hover:bg-gray-600'}`}>Mặc định</button>
                                    <button onClick={() => handleChange('colorTheme', ColorTheme.DEUTERANOPIA)} className={`p-2 rounded-md text-sm transition ${currentSettings.colorTheme === ColorTheme.DEUTERANOPIA ? 'bg-sky-500 text-white' : 'bg-[var(--color-bg-tertiary)] hover:bg-gray-600'}`}>Mù màu (Đỏ/Lục)</button>
                                    <button onClick={() => handleChange('colorTheme', ColorTheme.TRITANOPIA)} className={`p-2 rounded-md text-sm transition ${currentSettings.colorTheme === ColorTheme.TRITANOPIA ? 'bg-pink-500 text-white' : 'bg-[var(--color-bg-tertiary)] hover:bg-gray-600'}`}>Mù màu (Lam/Vàng)</button>
                                    <button onClick={() => handleChange('colorTheme', ColorTheme.HIGH_CONTRAST)} className={`p-2 rounded-md text-sm transition ${currentSettings.colorTheme === ColorTheme.HIGH_CONTRAST ? 'bg-yellow-400 text-black' : 'bg-[var(--color-bg-tertiary)] hover:bg-gray-600'}`}>Tương phản cao</button>
                                    <button onClick={() => handleChange('colorTheme', ColorTheme.SEPIA)} className={`p-2 rounded-md text-sm transition ${currentSettings.colorTheme === ColorTheme.SEPIA ? 'bg-[#8d6e63] text-white' : 'bg-[var(--color-bg-tertiary)] hover:bg-gray-600'}`}>Giấy Cổ</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">Hỗ Trợ Truy Cập</h3>
                         <label className="flex items-center justify-between cursor-pointer bg-[var(--color-bg-secondary)] p-3 rounded-md hover:bg-gray-700" onClick={() => { handleChange('reduceMotion', !currentSettings.reduceMotion); }}>
                            <div>
                                <span className="font-semibold text-[var(--color-primary-light)]">Giảm Chuyển Động</span>
                                <p className="text-xs text-[var(--color-text-dark)]">Tắt các hiệu ứng chuyển động không cần thiết.</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    readOnly
                                    checked={currentSettings.reduceMotion}
                                    className="sr-only"
                                />
                                <div className={`block w-14 h-8 rounded-full ${currentSettings.reduceMotion ? 'bg-[var(--color-primary-dark)]' : 'bg-[var(--color-bg-quaternary)]'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.reduceMotion ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">Tính Năng AI</h3>
                        <label className="flex items-center justify-between cursor-pointer bg-[var(--color-bg-secondary)] p-3 rounded-md hover:bg-gray-700" onClick={() => { handleChange('useAdvancedCombatAI', !currentSettings.useAdvancedCombatAI); }}>
                            <div>
                                <span className="font-semibold text-[var(--color-primary-light)]">AI Chiến Đấu Nâng Cao</span>
                                <p className="text-xs text-[var(--color-text-dark)]">Sử dụng AI để quyết định chiến thuật và tường thuật trận đấu. Có thể gây lỗi nếu dùng quá nhiều.</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    readOnly
                                    checked={currentSettings.useAdvancedCombatAI}
                                    className="sr-only"
                                />
                                <div className={`block w-14 h-8 rounded-full ${currentSettings.useAdvancedCombatAI ? 'bg-[var(--color-primary-dark)]' : 'bg-[var(--color-bg-quaternary)]'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.useAdvancedCombatAI ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-semibold text-[var(--color-text-light)] mb-3">Tự Động Phân Giải</h3>
                        <p className="text-xs text-[var(--color-text-dark)] mb-2">Chọn độ hiếm để tự động phân giải khi nhặt được.</p>
                        <div className="grid grid-cols-2 gap-2">
                             {rarities.map(rarity => (
                                <label key={rarity} className="flex items-center space-x-2 cursor-pointer bg-[var(--color-bg-secondary)] p-2 rounded-md hover:bg-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={!!currentSettings.autoDismantleRarities[rarity]}
                                        onChange={() => handleAutoDismantleChange(rarity)}
                                        className="h-4 w-4 rounded bg-[var(--color-bg-tertiary)] border-[var(--color-bg-quaternary)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                    />
                                    <span>{rarity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleSaveSettings} className="bg-[var(--color-primary-dark)] hover:bg-[var(--color-primary-darker)] text-white font-bold py-2 px-6 rounded-lg transition-colors">
                            Lưu Thiết Lập
                        </button>
                    </div>

                    <div className="border-t border-red-500/30 pt-6 mt-6">
                        <h3 className="text-xl font-semibold text-red-400 mb-3">Khu Vực Nguy Hiểm</h3>
                        <button onClick={handleDeleteAllData} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Xóa Toàn Bộ Dữ Liệu
                        </button>
                        <p className="text-xs text-gray-500 mt-2 text-center">Hành động này sẽ xóa tất cả các file lưu và thiết lập. Không thể hoàn tác.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
