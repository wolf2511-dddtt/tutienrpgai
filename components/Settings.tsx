import React, { useState, useEffect } from 'react';
import { AppSettings, Rarity } from '../types';
import { deleteAllData, saveApiKey, loadApiKey } from '../services/storageService';
import { useGame } from '../contexts/GameContext';
import { reinitializeAiClient } from '../services/geminiService';

interface SettingsProps {
    onClose: () => void;
}

const Slider: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; min?: number; max?: number, step?: number }> = ({ label, value, onChange, min = 0, max = 1, step = 0.01 }) => (
    <div>
        <label className="block text-gray-300 mb-2">{label}: {Math.round(value * 100)}%</label>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
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
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-lg text-white relative max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl z-10">&times;</button>
                <h2 className="text-3xl font-bold text-center text-purple-400 mb-6">Thiết Lập</h2>

                {notification && <div className="text-center bg-green-500/20 text-green-300 p-2 rounded-lg mb-4">{notification}</div>}

                <div className="space-y-6">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">API Key</h3>
                        <p className="text-xs text-gray-400 mb-2">Nhập Google Gemini API Key của bạn. Key này sẽ được ưu tiên hơn so với key hệ thống (nếu có).</p>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={e => setApiKey(e.target.value)}
                            placeholder="Nhập API Key..."
                            className="w-full bg-gray-800 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition"
                        />
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Gameplay</h3>
                        <Slider label="Tốc Độ Hoạt Cảnh" value={currentSettings.gameSpeed} onChange={e => handleChange('gameSpeed', parseFloat(e.target.value))} />
                        <Slider label="Tần Suất Sự Kiện" value={currentSettings.eventFrequency} onChange={e => handleChange('eventFrequency', parseFloat(e.target.value))} min={0} max={1} step={0.05} />
                    </div>

                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Tính Năng AI</h3>
                        <label className="flex items-center justify-between cursor-pointer bg-gray-800 p-3 rounded-md hover:bg-gray-700" onClick={() => { handleChange('useAdvancedCombatAI', !currentSettings.useAdvancedCombatAI); }}>
                            <div>
                                <span className="font-semibold text-purple-300">AI Chiến Đấu Nâng Cao</span>
                                <p className="text-xs text-gray-400">Sử dụng AI để quyết định chiến thuật và tường thuật trận đấu. Có thể gây lỗi nếu dùng quá nhiều.</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    readOnly
                                    checked={currentSettings.useAdvancedCombatAI}
                                    className="sr-only"
                                />
                                <div className={`block w-14 h-8 rounded-full ${currentSettings.useAdvancedCombatAI ? 'bg-purple-600' : 'bg-gray-600'}`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${currentSettings.useAdvancedCombatAI ? 'transform translate-x-6' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                    
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Tự Động Phân Giải</h3>
                        <p className="text-xs text-gray-400 mb-2">Chọn độ hiếm để tự động phân giải khi nhặt được.</p>
                        <div className="grid grid-cols-2 gap-2">
                             {rarities.map(rarity => (
                                <label key={rarity} className="flex items-center space-x-2 cursor-pointer bg-gray-800 p-2 rounded-md hover:bg-gray-700">
                                    <input
                                        type="checkbox"
                                        checked={!!currentSettings.autoDismantleRarities[rarity]}
                                        onChange={() => handleAutoDismantleChange(rarity)}
                                        className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span>{rarity}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button onClick={handleSaveSettings} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
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