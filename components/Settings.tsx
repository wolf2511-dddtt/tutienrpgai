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
    const [apiKeys, setApiKeys] = useState<string[]>(['']);
    const [notification, setNotification] = useState('');
    // Font settings
    const fontOptions = [
        { label: 'Inter (Mặc định)', value: 'Inter, sans-serif' },
        { label: 'Be Vietnam Pro', value: 'Be Vietnam Pro, sans-serif' },
        { label: 'Roboto', value: 'Roboto, sans-serif' },
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Times New Roman', value: 'Times New Roman, serif' },
    ];
    const [fontSize, setFontSize] = useState<number>(appSettings.fontSize || 18);
    const [fontFamily, setFontFamily] = useState<string>(appSettings.fontFamily || fontOptions[0].value);

    useEffect(() => {
        const savedKey = loadApiKey();
        if (savedKey) {
            setApiKeys([savedKey]);
        } else {
            setApiKeys(['']);
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
        handleSettingsChange({
            ...currentSettings,
            fontSize,
            fontFamily,
        });
        // Lưu key đầu tiên để không ảnh hưởng logic cũ
        saveApiKey(apiKeys[0] || '');
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
                    {/* Font Settings */}
                    <div className="border-b border-blue-400 pb-4 mb-4">
                        <h3 className="text-xl font-semibold text-blue-300 mb-3 flex items-center gap-2"><span className="text-2xl">🅰️</span> Cài Đặt Font</h3>
                        <div className="mb-2">
                            <label className="block text-gray-300 mb-1">Kích cỡ font: <span className="font-bold">{fontSize}px</span></label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">12px</span>
                                <input
                                    type="range"
                                    min={12}
                                    max={32}
                                    value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-xs text-gray-400">32px</span>
                            </div>
                        </div>
                        <div className="mb-2">
                            <div
                                className="w-full p-3 rounded-lg border-2 border-gray-600 bg-gray-800 text-center mb-2"
                                style={{ fontSize: fontSize, fontFamily: fontFamily }}
                            >
                                Đây là văn bản mẫu với font hiện tại
                            </div>
                        </div>
                        <div>
                            <label className="block text-gray-300 mb-1">Loại font</label>
                            <select
                                value={fontFamily}
                                onChange={e => setFontFamily(e.target.value)}
                                className="w-full bg-gray-800 p-3 rounded-lg border-2 border-gray-600 focus:border-blue-500 outline-none transition"
                            >
                                {fontOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold text-gray-200 mb-3">Sử Dụng API Key Của Bạn</h3>
                        <div className="space-y-2 mb-2">
                            {apiKeys.map((key, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        value={key}
                                        onChange={e => {
                                            const newKeys = [...apiKeys];
                                            newKeys[idx] = e.target.value;
                                            setApiKeys(newKeys);
                                        }}
                                        placeholder="Nhập API Key..."
                                        className="flex-1 bg-gray-800 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition"
                                    />
                                    {apiKeys.length > 1 && (
                                        <button
                                            className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-2 text-sm font-bold"
                                            onClick={() => {
                                                setApiKeys(apiKeys.filter((_, i) => i !== idx));
                                            }}
                                            type="button"
                                            title="Xóa key này"
                                        >
                                            &#10006;
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-bold mb-2"
                            type="button"
                            onClick={() => setApiKeys([...apiKeys, ''])}
                        >
                            + Thêm API Key
                        </button>
                        <p className="text-xs text-gray-400 mt-1">Các API Key của bạn sẽ được lưu trữ cục bộ trên trình duyệt này. Nếu có nhiều key, hệ thống sẽ tự động chuyển khi gặp lỗi giới hạn.</p>
                        <div className="text-green-400 text-sm mt-1">Đang hoạt động</div>
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