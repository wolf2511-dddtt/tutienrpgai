import React, { useState, useCallback, useMemo, useEffect } from 'react';
// Fix: Corrected import paths for types and constants.
import { PlayerClass, BaseStats, Stat, Difficulty } from '../types';
import { useGame } from '../contexts/GameContext';
import { CUSTOM_CLASS_CREATION_POINTS } from '../constants';

const CharacterCreator = () => {
    const { handleCreateGame, handleBackToMenu, designedWorldPrompt, designedWorldStoryInfo } = useGame();
    const [isLoading, setIsLoading] = useState(false);

    const [name, setName] = useState('');
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [selectedDefaultClass, setSelectedDefaultClass] = useState<PlayerClass>(PlayerClass.THE_TU);
    const [customClassName, setCustomClassName] = useState('');
    const [characterContext, setCharacterContext] = useState('');
    const [customStats, setCustomStats] = useState<BaseStats>({
        [Stat.STR]: 0, [Stat.AGI]: 0, [Stat.INT]: 0, [Stat.SPI]: 0, [Stat.CON]: 0, [Stat.DEX]: 0,
    });
    const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);

    const remainingPoints = useMemo(() => {
        // Fix: Explicitly cast values to number array to prevent potential type errors during arithmetic operation.
        const totalAssigned = (Object.values(customStats) as number[]).reduce((sum, value) => sum + value, 0);
        return CUSTOM_CLASS_CREATION_POINTS - totalAssigned;
    }, [customStats]);

    const handleStatChange = (stat: keyof BaseStats, delta: number) => {
        setCustomStats(prev => {
            const currentVal = prev[stat];
            const newVal = currentVal + delta;
            if (newVal < 0 || (delta > 0 && remainingPoints <= 0)) return prev;
            return { ...prev, [stat]: newVal };
        });
    };
    
    const validateInputs = (): boolean => {
        if (!name.trim()) {
            alert('Vui lòng nhập tên nhân vật!');
            return false;
        }
        if (isCustomMode) {
            if (!customClassName.trim()) {
                alert('Vui lòng nhập tên cho Class tùy chỉnh!');
                return false;
            }
            if (remainingPoints !== 0) {
                alert(`Vui lòng phân bổ hết ${CUSTOM_CLASS_CREATION_POINTS} điểm tiềm năng!`);
                return false;
            }
        }
        if (!designedWorldPrompt) {
            alert('Lỗi: Bối cảnh thế giới chưa được thiết lập. Vui lòng quay lại và thiết kế thế giới trước.');
            return false;
        }
        return true;
    }

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateInputs()) return;

        let finalPlayerClass: string;
        let finalClassDefinition: BaseStats | undefined;

        if (isCustomMode) {
            finalPlayerClass = customClassName;
            finalClassDefinition = customStats;
        } else {
            finalPlayerClass = selectedDefaultClass;
            finalClassDefinition = undefined;
        }

        setIsLoading(true);
        try {
            await handleCreateGame(name, finalPlayerClass, finalClassDefinition, characterContext, designedWorldPrompt!.prompt, designedWorldPrompt!.keywords, difficulty, designedWorldStoryInfo || undefined);
        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                alert(`Không thể tạo game: ${err.message}`);
            } else {
                alert(`Không thể tạo game: ${String(err)}`);
            }
            setIsLoading(false);
        }
    }, [name, isCustomMode, selectedDefaultClass, customClassName, customStats, remainingPoints, characterContext, difficulty, handleCreateGame, designedWorldPrompt, designedWorldStoryInfo]);
    
    const renderCharacterCreation = () => {
        const statKeys: (keyof BaseStats)[] = [Stat.STR, Stat.AGI, Stat.INT, Stat.SPI, Stat.CON, Stat.DEX];
        return (
            <div className="space-y-6 animate-fade-in">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">Tên Nhân Vật</label>
                    <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition" required />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Bối cảnh nhân vật (tùy chọn)</label>
                    <textarea value={characterContext} onChange={e => setCharacterContext(e.target.value)} placeholder="Ví dụ: Một đứa trẻ mồ côi từ một ngôi làng bị ma thú phá hủy, mang trong mình huyết mạch đặc biệt..." rows={3} className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition resize-none"></textarea>
                    <p className="text-xs text-gray-400 mt-1">AI sẽ dựa vào đây để tạo ra một cốt truyện độc đáo cho bạn.</p>
                </div>
                
                <div className="flex items-center">
                    <input id="custom-mode-toggle" type="checkbox" checked={isCustomMode} onChange={() => setIsCustomMode(!isCustomMode)} className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                    <label htmlFor="custom-mode-toggle" className="ml-2 block text-sm text-gray-300">Tạo Class Tùy Chỉnh</label>
                </div>

                {isCustomMode ? (
                    <div className="space-y-4 p-4 border border-purple-500/30 rounded-lg">
                        <div>
                            <label htmlFor="customClassName" className="block text-sm font-medium text-gray-300 mb-2">Tên Class</label>
                            <input type="text" id="customClassName" value={customClassName} onChange={(e) => setCustomClassName(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition" required />
                        </div>
                        <div>
                            <h4 className="text-md font-medium text-gray-200 mb-2">Phân Bổ Tiềm Năng (Còn lại: <span className="font-bold text-yellow-400">{remainingPoints}</span>)</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {statKeys.map(statKey => (
                                    <div key={statKey}>
                                        <label className="block text-xs font-medium text-gray-400">{statKey}</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <button type="button" onClick={() => handleStatChange(statKey, -1)} className="bg-gray-600 w-8 h-8 rounded font-bold">-</button>
                                            <input type="number" readOnly value={customStats[statKey]} className="w-full text-center bg-gray-800 rounded p-1"/>
                                            <button type="button" onClick={() => handleStatChange(statKey, 1)} className="bg-gray-600 w-8 h-8 rounded font-bold">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Chọn Class</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {Object.values(PlayerClass).map(pClass => (
                                <button key={pClass} type="button" onClick={() => setSelectedDefaultClass(pClass as PlayerClass)} className={`p-4 rounded-lg border-2 transition-all ${selectedDefaultClass === pClass ? 'border-purple-500 bg-purple-900/50' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
                                    <span className="font-bold">{pClass}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Độ Khó</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.values(Difficulty).map(d => (
                            <button key={d} type="button" onClick={() => setDifficulty(d as Difficulty)} className={`p-3 rounded-lg border-2 transition-all ${difficulty === d ? 'border-yellow-500 bg-yellow-900/50' : 'border-gray-600 bg-gray-800 hover:bg-gray-700'}`}>
                                <span className="font-bold">{d}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-2xl shadow-2xl border border-purple-500/30 relative">
                <h1 className="text-3xl font-bold text-center text-purple-400 mb-2">Tạo Anh Hùng</h1>
                <p className="text-center text-gray-400 mb-6">Bước cuối: Định hình nhân vật của bạn trong thế giới "{designedWorldPrompt?.keywords || '...'}"</p>
                
                {designedWorldPrompt && (
                    <div className="mb-6 p-4 bg-black/20 rounded-lg border border-gray-700">
                        <h3 className="font-semibold text-purple-300">Tóm Tắt Thế Giới</h3>
                        <p className="text-sm text-gray-300 italic">"{designedWorldPrompt.prompt}"</p>
                    </div>
                )}


                <form onSubmit={handleSubmit}>
                    <div className="min-h-[450px]">
                        {renderCharacterCreation()}
                    </div>
                    
                    <div className="mt-8 flex justify-between items-center">
                        <button type="button" onClick={handleBackToMenu} className="text-gray-400 hover:text-white transition">Về Menu</button>
                        <button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-500 flex items-center">
                            {isLoading && <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                            {isLoading ? 'Đang tạo...' : 'Bắt Đầu'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CharacterCreator;
