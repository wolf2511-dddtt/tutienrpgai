
import React, { useState, useCallback, useEffect } from 'react';
import { Character, GameScreen, ExplorationEventLog, Poi, LogType } from '../types';
import { processPlayerAction } from '../services/geminiService';
import { getTerrainFromPosition } from '../services/gameLogic';
import InventoryScreen from './InventoryScreen';
import ResourcesScreen from './ResourcesScreen';
import { useGame } from '../contexts/GameContext';
import QuestLog from './QuestLog';
import PetScreen from './PetScreen';
import CharacterSheet from './CharacterSheet';
import CultivationScreen from './CultivationScreen';
import FactionScreen from './FactionScreen';
import BestiaryScreen from './BestiaryScreen';
import WorldMap from './WorldMap'; // Import WorldMap directly
import NpcListScreen from './NpcListScreen';
import StoryLog from './StoryLog';
import CompanionScreen from './CompanionScreen';

type MainView = 'overview' | 'inventory' | 'resources' | 'quests' | 'pets' | 'companions' | 'cultivation' | 'factions' | 'npcs' | 'bestiary' | 'map';

// --- SUB-COMPONENTS for the new layout ---

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-primary)] rounded-md px-3 py-1 flex justify-between items-center text-sm">
      <span className="text-[var(--color-text-medium)]">{label}</span>
      <span className="font-semibold text-[var(--color-text-light)]">{value}</span>
    </div>
);

const InGameCharacterPanel: React.FC = () => {
    const { character } = useGame();
    const [activeTab, setActiveTab] = useState<'info' | 'skills'>('info');
    if (!character) return null;

    const { baseStats, derivedStats, skills, level, realm } = character;

    const TabButton: React.FC<{ label: string, view: 'info' | 'skills', currentView: string }> = ({ label, view, currentView }) => (
        <button
            onClick={() => setActiveTab(view)}
            className={`pb-2 text-lg font-semibold transition-colors ${currentView === view ? 'text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary)]' : 'text-[var(--color-text-dark)] hover:text-[var(--color-text-medium)]'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="h-full flex flex-col">
            <div className="flex-shrink-0 flex items-center gap-6 border-b border-[var(--color-border-base)] mb-4">
                <TabButton label="NHÂN VẬT" view="info" currentView={activeTab} />
                <TabButton label="KỸ NĂNG" view="skills" currentView={activeTab} />
            </div>
            <div className="flex-grow overflow-y-auto pr-2">
                {activeTab === 'info' && (
                    <div className="space-y-3 animate-fade-in">
                        <h3 className="text-xl font-bold text-[var(--color-text-light)] mb-2">Thông Tin Nhân Vật</h3>
                        <StatBox label="Sinh Lực" value={`${Math.round(character.currentHp)} / ${derivedStats.HP}`} />
                        <StatBox label="Thể Lực" value={baseStats.CON || 0} />
                        <StatBox label="Lý Trí" value={baseStats.INT || 0} />
                        <StatBox label="Dục Vọng" value={'Bình thường'} />
                        <StatBox label="Ký ức kinh hoàng" value={`Im sâu (${level} lượt)`} />
                        <StatBox label="Thân Trọng" value={'Tột độ'} />
                    </div>
                )}
                {activeTab === 'skills' && (
                    <div className="space-y-2 animate-fade-in">
                        <h3 className="text-xl font-bold text-[var(--color-text-light)] mb-2">Kỹ Năng</h3>
                        {skills.length > 0 ? skills.slice(0, 10).map(skill => (
                            <div key={skill.id} className="bg-[var(--color-bg-tertiary)] p-2 rounded-md">
                                <p className="font-semibold text-sm text-[var(--color-primary-light)]">{skill.name}</p>
                                <p className="text-xs text-[var(--color-text-dark)] italic truncate">{skill.description}</p>
                            </div>
                        )) : <p className="text-[var(--color-text-dark)] italic">Chưa học kỹ năng nào.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

const NpcProfilePanel: React.FC = () => {
    const { character } = useGame();
    if (!character) return null;

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-bold text-[var(--color-text-light)] mb-4 flex-shrink-0 border-b border-[var(--color-border-base)] pb-2">Hồ Sơ Nhân Vật</h3>
            <div className="flex-grow overflow-y-auto pr-2">
                {character.metNpcs.length === 0 ? (
                    <p className="text-[var(--color-text-dark)] italic text-center mt-8">Chưa gặp gỡ nhân vật nào...</p>
                ) : (
                    <div className="space-y-3">
                        {character.metNpcs.map(npc => (
                             <div key={npc.name} className="bg-[var(--color-bg-tertiary)] p-3 rounded-lg flex items-center gap-3">
                                <img src={npc.imageUrl || 'https://via.placeholder.com/40'} alt={npc.name} className="w-12 h-12 rounded-full object-cover border-2 border-[var(--color-primary)]"/>
                                <div>
                                    <p className="font-semibold text-[var(--color-text-light)]">{npc.name}</p>
                                    <p className="text-xs text-[var(--color-text-dark)]">{npc.role}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


const WorldHeader: React.FC<{
    onForge: () => void;
    onMenu: () => void;
    onSaveLoad: () => void;
    onExit: () => void;
}> = ({ onForge, onMenu, onSaveLoad, onExit }) => {
    return (
        <header className="flex-shrink-0 flex justify-between items-center relative py-2">
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={onForge} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-hover)] rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center gap-2">⚡ Sáng Tạo Năng Lực</button>
                <button onClick={onMenu} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-hover)] rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center gap-2">📖 Sổ Tay</button>
            </div>
            <div className="flex items-center gap-2">
                <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-hover)] rounded-md px-3 py-1.5 text-sm hidden lg:block">
                    <span className="text-[var(--color-text-dark)]">Tokens: </span>
                    <span className="font-semibold text-green-400">17337</span> / 17337
                </div>
                <button onClick={onSaveLoad} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-hover)] rounded-md px-3 py-2 text-sm font-semibold hover:bg-[var(--color-bg-tertiary)] transition-colors">Lưu File</button>
                <button onClick={onExit} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-hover)] rounded-md px-3 py-2 text-sm font-semibold hover:bg-red-900/50 transition-colors">Thoát</button>
            </div>
        </header>
    );
};


const PlayerInputFooter: React.FC<{
    onActionSubmit: (action: string) => void;
    isProcessing: boolean;
}> = ({ onActionSubmit, isProcessing }) => {
    const { contextualActions, isGeneratingActions, handleGenerateContextualActions, handleGetAIAdvice } = useGame();
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const [inputText, setInputText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onActionSubmit(inputText.trim());
            setInputText('');
        }
    };

    const handleSuggestionClick = (action: string) => {
        onActionSubmit(action);
    };

    return (
        <footer className="flex-shrink-0 mt-4 border-t border-[var(--color-border-base)] pt-2">
            {!isPanelOpen ? (
                 <div className="flex justify-center">
                    <button onClick={() => setIsPanelOpen(true)} className="bg-[var(--color-bg-secondary)] border border-[var(--color-primary)] rounded-full px-4 py-2 text-sm font-semibold hover:bg-[var(--color-bg-tertiary)] transition-colors flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                        Hiện Bảng Hành Động
                    </button>
                </div>
            ) : (
                <div className="bg-transparent">
                     {contextualActions.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mb-3 animate-fade-in">
                            {contextualActions.map((action, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(action)}
                                    disabled={isProcessing}
                                    className="bg-gray-600/50 hover:bg-gray-500/50 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors border border-gray-500"
                                >
                                    {action}
                                </button>
                            ))}
                        </div>
                    )}
                     <form onSubmit={handleSubmit} className="flex items-center gap-2 sm:gap-4">
                        <button 
                            type="button" 
                            onClick={handleGenerateContextualActions} 
                            disabled={isGeneratingActions || isProcessing}
                            className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-[var(--color-accent-light)] font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
                            title="Gợi ý hành động bằng AI"
                        >
                            {isGeneratingActions 
                                ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                : '💡'}
                        </button>
                        <button 
                            type="button" 
                            onClick={handleGetAIAdvice} 
                            disabled={isGeneratingActions || isProcessing}
                            className="bg-purple-900/50 hover:bg-purple-800/50 border border-purple-500 text-purple-300 font-bold py-2 px-4 rounded-lg transition disabled:opacity-50 flex items-center justify-center"
                            title="Cầu viện (Xin lời khuyên chiến thuật)"
                        >
                            🔮
                        </button>
                        <input 
                            type="text" 
                            value={inputText} 
                            onChange={e => setInputText(e.target.value)} 
                            disabled={isProcessing}
                            placeholder="Bạn muốn làm gì tiếp theo?"
                            className="flex-1 bg-[var(--color-bg-tertiary)] border-2 border-[var(--color-primary)] rounded-lg py-2 px-4 text-white placeholder-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-primary-light)] transition"
                        />
                        <button type="submit" disabled={isProcessing || !inputText.trim()} className="bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
                            Gửi
                        </button>
                    </form>
                    <button onClick={() => setIsPanelOpen(false)} className="mx-auto mt-2 block text-sm text-[var(--color-text-dark)] hover:text-white">Ẩn</button>
                </div>
            )}
        </footer>
    );
};

// --- Menu Modal Component ---
const MenuModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [activeView, setActiveView] = useState<MainView>('overview');
    const { character, worldState, handleOpenDialogue } = useGame();

    if (!character) return null;

    const renderMainView = () => {
        switch(activeView) {
            case 'overview': return <CharacterSheet character={character} />;
            case 'inventory': return <InventoryScreen />;
            case 'resources': return <ResourcesScreen character={character} />;
            case 'quests': return <QuestLog />;
            case 'pets': return <PetScreen />;
            case 'companions': return <CompanionScreen />;
            case 'cultivation': return <CultivationScreen />;
            case 'factions': return <FactionScreen />;
            case 'npcs': return <NpcListScreen />;
            case 'bestiary': return <BestiaryScreen />;
            case 'map': return <WorldMap 
                                    pois={worldState.pois} 
                                    playerPosition={character.position} 
                                    onPoiClick={(id) => {
                                        onClose();
                                        handleOpenDialogue(id);
                                    }} 
                                />;
            default: return null;
        }
    };
    
    const NavButton: React.FC<{view: MainView, label: string}> = ({view, label}) => (
        <button 
            onClick={() => setActiveView(view)}
            className={`flex-shrink-0 px-4 py-2 text-sm sm:text-base rounded-md transition-colors whitespace-nowrap ${activeView === view ? 'bg-[var(--color-primary-dark)] text-white' : 'bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-[var(--color-text-medium)]'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in p-2 sm:p-4">
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-dark)] rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] text-white relative flex flex-col overflow-hidden backdrop-blur-md">
                <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-white text-3xl z-20">&times;</button>
                <nav className="w-full flex-shrink-0 bg-[var(--color-bg-main)]/50 p-2 border-b border-[var(--color-primary)]">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        <NavButton view="overview" label="Tổng Quan" />
                        <NavButton view="inventory" label="Hành Trang" />
                        <NavButton view="map" label="Bản Đồ" />
                        <NavButton view="cultivation" label="Công Pháp" />
                        <NavButton view="companions" label="Đồng Hành" />
                        <NavButton view="factions" label="Phe Phái" />
                        <NavButton view="npcs" label="Nhân Mạch" />
                        <NavButton view="bestiary" label="Sách Yêu Quái" />
                        <NavButton view="quests" label="Nhiệm Vụ" />
                        <NavButton view="pets" label="Thú Cưng" />
                        <NavButton view="resources" label="Tài Nguyên" />
                    </div>
                </nav>
                <div className="flex-1 p-3 sm:p-6 overflow-y-auto">
                    {renderMainView()}
                </div>
            </div>
        </div>
    );
};


const WorldScreen: React.FC = () => {
    const { 
        character, 
        appSettings,
        worldState,
        oneTimeMessages,
        setOneTimeMessages,
        handleStartCombat, 
        handleOpenForge, 
        handleOpenMenu,
        handleBackToMenu,
        handleOpenDialogue,
        clearContextualActions
    } = useGame();

    const [eventLog, setEventLog] = useState<ExplorationEventLog[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);

    useEffect(() => {
        const initialLogs: ExplorationEventLog[] = [];
        if (oneTimeMessages && oneTimeMessages.length > 0) {
            initialLogs.push(...oneTimeMessages);
            setOneTimeMessages([]);
        }
        
        if (eventLog.length === 0 && initialLogs.length === 0) {
             initialLogs.push({ id: crypto.randomUUID(), text: "Màn sương mờ ảo dần tan, hé lộ một thế giới vừa quen vừa lạ. Hành trình của bạn, từ đây, chính thức bắt đầu...", type: LogType.NARRATIVE });
        }

        if (initialLogs.length > 0) {
            setEventLog(prev => [...initialLogs, ...prev].slice(0, 100));
        }
    }, [oneTimeMessages, setOneTimeMessages, eventLog.length]);


    if (!character) {
        return null;
    }
    
    const handleActionSubmit = useCallback(async (action: string) => {
        if (!action || isProcessing) return;
        setIsProcessing(true);
        clearContextualActions();
        
        const terrain = getTerrainFromPosition(character.position);
        try {
            const eventText = await processPlayerAction(character, terrain, action, appSettings.difficulty);
            setEventLog(prev => [{ id: crypto.randomUUID(), text: eventText, type: LogType.NARRATIVE }, ...prev]);
            
            const combatKeywords = ['kẻ địch', 'chạm trán', 'quái vật', 'sát khí', 'giao chiến', 'tấn công'];
            if (combatKeywords.some(keyword => eventText.toLowerCase().includes(keyword))) {
                setTimeout(() => handleStartCombat(), 1500);
            }
        } catch (err) {
            console.error(err);
            setEventLog(prev => [{ id: crypto.randomUUID(), text: `Có lỗi xảy ra khi xử lý hành động.`, type: LogType.ERROR }, ...prev]);
        }
        
        setIsProcessing(false);
    }, [character, isProcessing, appSettings.difficulty, handleStartCombat, clearContextualActions]);

    const handleBackToMenuWithConfirmation = useCallback(() => {
        if (window.confirm("Bạn có chắc muốn trở về menu chính? Mọi tiến trình chưa lưu sẽ bị mất.")) {
            handleBackToMenu();
        }
    }, [handleBackToMenu]);

    return (
        <>
            <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-light)] p-2 sm:p-4 flex flex-col font-sans max-h-screen">
                <WorldHeader
                    onForge={handleOpenForge}
                    onMenu={() => setIsMenuModalOpen(true)}
                    onSaveLoad={() => handleOpenMenu(GameScreen.SAVE_MANAGEMENT)}
                    onExit={handleBackToMenuWithConfirmation}
                />
                
                <main className="flex-grow grid grid-cols-1 lg:grid-cols-10 gap-4 mt-2 sm:mt-4 overflow-hidden">
                    {/* Left Panel */}
                    <div className="lg:col-span-3 bg-[var(--color-bg-secondary)] border border-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-dark)] rounded-lg p-4 h-full overflow-hidden">
                        <InGameCharacterPanel />
                    </div>

                    {/* Middle Panel */}
                    <div className="lg:col-span-4 bg-[var(--color-bg-secondary)] border border-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-dark)] rounded-lg p-4 flex flex-col h-full overflow-hidden">
                        <StoryLog logs={eventLog} isProcessing={isProcessing} />
                    </div>

                    {/* Right Panel */}
                    <div className="lg:col-span-3 bg-[var(--color-bg-secondary)] border border-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-dark)] rounded-lg p-4 h-full overflow-hidden">
                        <NpcProfilePanel />
                    </div>
                </main>
                
                <PlayerInputFooter onActionSubmit={handleActionSubmit} isProcessing={isProcessing} />
            </div>
            
            {isMenuModalOpen && <MenuModal onClose={() => setIsMenuModalOpen(false)} />}
        </>
    );
};

export default WorldScreen;
