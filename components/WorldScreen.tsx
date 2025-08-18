import React, { useState, useCallback, useEffect } from 'react';
import { Character, GameScreen, ExplorationEventLog, Poi, LogType } from '../types';
import { processPlayerAction } from '../services/geminiService';
import { getTerrainFromPosition } from '../services/gameLogic';
import CharacterStatusHeader from './CharacterStatusHeader';
import InventoryScreen from './InventoryScreen';
import ResourcesScreen from './ResourcesScreen';
import { useGame } from '../contexts/GameContext';
import QuestLog from './QuestLog';
import PetScreen from './PetScreen';
import CharacterSheet from './CharacterSheet';
import CultivationScreen from './CultivationScreen';
import FactionScreen from './FactionScreen';
import BestiaryScreen from './BestiaryScreen';
import WorldMapModal from './WorldMapModal';
import NpcListScreen from './NpcListScreen';
import StoryLog from './StoryLog';
import CompanionScreen from './CompanionScreen';

type MainView = 'overview' | 'inventory' | 'cultivation' | 'companions' | 'factions' | 'npcs' | 'bestiary' | 'quests' | 'pets' | 'resources';

// --- Menu Modal Component ---
const MenuModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [activeView, setActiveView] = useState<MainView>('overview');
    const { character } = useGame();

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
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-base)] rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] text-white relative flex flex-col overflow-hidden backdrop-blur-md">
                <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-white text-3xl z-20">&times;</button>
                <nav className="w-full flex-shrink-0 bg-[var(--color-bg-main)]/50 p-2 border-b border-[var(--color-border-base)]">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <NavButton view="overview" label="Tổng Quan" />
                        <NavButton view="inventory" label="Hành Trang" />
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

const MovementPad: React.FC<{ onMove: (direction: 'N' | 'S' | 'E' | 'W') => void, disabled: boolean }> = ({ onMove, disabled }) => {
    const Button = ({ dir, label, gridClass }: { dir: 'N' | 'S' | 'E' | 'W', label: string, gridClass: string }) => (
        <button
            onClick={() => onMove(dir)}
            disabled={disabled}
            className={`bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] rounded-md p-3 text-lg font-bold transition-colors disabled:opacity-50 ${gridClass}`}
        >
            {label}
        </button>
    );

    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-32 mx-auto">
            <div />
            <Button dir="N" label="↑" gridClass="col-start-2" />
            <div />
            <Button dir="W" label="←" gridClass="row-start-2" />
            <div className="row-start-2 col-start-2" />
            <Button dir="E" label="→" gridClass="row-start-2 col-start-3" />
            <div />
            <Button dir="S" label="↓" gridClass="row-start-3 col-start-2" />
            <div />
        </div>
    );
};

const PlayerInputPanel: React.FC<{
    contextualActions: string[];
    isGeneratingActions: boolean;
    isProcessing: boolean;
    onActionSubmit: (action: string) => void;
    onPlayerRecover: () => void;
    onMove: (direction: 'N' | 'S' | 'E' | 'W') => void;
}> = ({ contextualActions, isGeneratingActions, isProcessing, onActionSubmit, onPlayerRecover, onMove }) => {
    const [inputText, setInputText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputText.trim()) {
            onActionSubmit(inputText.trim());
            setInputText('');
        }
    };

    return (
        <div className="bg-[var(--color-bg-main)]/60 p-3 border-t-2 border-[var(--color-border-base)] backdrop-blur-sm">
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex-shrink-0">
                    <MovementPad onMove={onMove} disabled={isProcessing} />
                </div>

                <div className="space-y-2">
                    {isGeneratingActions && contextualActions.length === 0 ? (
                        <div className="text-center text-[var(--color-text-dark)] p-2 italic">AI đang suy nghĩ...</div>
                    ) : (
                        <>
                            {contextualActions.slice(0, 4).map((action, index) => (
                                <button key={index} onClick={() => onActionSubmit(action)} disabled={isProcessing} className="w-full text-center bg-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/20 border border-[var(--color-secondary)]/30 text-white font-semibold py-2 px-3 rounded-lg transition text-sm disabled:bg-gray-600">
                                    {action}
                                </button>
                            ))}
                        </>
                    )}
                     <button onClick={onPlayerRecover} disabled={isProcessing} className="w-full bg-green-800/20 hover:bg-green-700/30 border border-green-500/30 text-white font-semibold py-2 px-3 rounded-lg transition text-sm disabled:bg-gray-600">Nghỉ Ngơi</button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                    <input 
                        type="text" 
                        value={inputText} 
                        onChange={e => setInputText(e.target.value)} 
                        disabled={isProcessing}
                        placeholder="Bạn muốn làm gì?"
                        className="w-full bg-[var(--color-bg-secondary)] border-2 border-[var(--color-bg-quaternary)] rounded-lg py-2 px-4 text-white placeholder-[var(--color-text-dark)] focus:outline-none focus:border-[var(--color-primary)] transition"
                    />
                    <button type="submit" disabled={isProcessing || !inputText.trim()} className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-bold py-2 rounded-lg transition shadow-md hover:shadow-lg hover:shadow-[var(--color-primary)] disabled:bg-gray-500 disabled:from-gray-500 disabled:shadow-none">
                        Gửi
                    </button>
                </form>
            </div>
        </div>
    );
};

const GameHeader: React.FC<{
    onMenu: () => void;
    onMap: () => void;
    onForge: () => void;
    onSaveLoad: () => void;
    onSettings: () => void;
    onExit: () => void;
}> = ({ onMenu, onMap, onForge, onSaveLoad, onSettings, onExit }) => {
    return (
        <div className="bg-[var(--color-bg-secondary)]/50 p-2 rounded-lg border border-[var(--color-border-base)] backdrop-blur-sm flex justify-end items-center gap-2">
            <button onClick={onMenu} className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white font-bold py-2 px-4 rounded-lg transition shadow-sm hover:shadow-md hover:shadow-[var(--color-primary)] text-sm">Menu</button>
            <button onClick={onMap} className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-white py-2 px-4 rounded-lg transition text-sm">Bản Đồ</button>
            <button onClick={onForge} className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-white py-2 px-4 rounded-lg transition text-sm">Lò Rèn</button>
            <button onClick={onSaveLoad} className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-white py-2 px-4 rounded-lg transition text-sm">Lưu/Tải</button>
            <button onClick={onSettings} className="bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-quaternary)] text-white py-2 px-4 rounded-lg transition text-sm">Thiết Lập</button>
            <button onClick={onExit} className="bg-red-800/80 hover:bg-red-700/80 text-white py-2 px-4 rounded-lg transition text-sm">Thoát</button>
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
        contextualActions,
        isGeneratingActions,
        handleGenerateContextualActions,
        handleStartCombat, 
        handleOpenForge, 
        handleOpenMenu,
        handlePlayerMove,
        handlePlayerRecover,
        handleBackToMenu,
        handleOpenDialogue
    } = useGame();

    const [eventLog, setEventLog] = useState<ExplorationEventLog[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
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
    }, [oneTimeMessages, setOneTimeMessages]);

    useEffect(() => {
        if (character) {
            handleGenerateContextualActions();
        }
    }, []);

    if (!character) {
        return null;
    }

    const handleMove = useCallback(async (direction: 'N' | 'S' | 'E' | 'W') => {
        if (isProcessing) return;
        setIsProcessing(true);
        
        const moveAmount = 128;
        let newPos = { ...character.position };
        switch(direction) {
            case 'N': newPos.y = Math.max(0, newPos.y - moveAmount); break;
            case 'S': newPos.y = Math.min(4096, newPos.y + moveAmount); break;
            case 'W': newPos.x = Math.max(0, newPos.x - moveAmount); break;
            case 'E': newPos.x = Math.min(4096, newPos.x + moveAmount); break;
        }

        await handlePlayerMove(newPos);
        await handleGenerateContextualActions();
        
        setIsProcessing(false);
    }, [isProcessing, character, handlePlayerMove, handleGenerateContextualActions]);
    
    const handleActionSubmit = useCallback(async (action: string) => {
        if (!action || isProcessing) return;
        setIsProcessing(true);
        
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
        
        await handleGenerateContextualActions();
        setIsProcessing(false);
    }, [character, isProcessing, appSettings.difficulty, handleStartCombat, handleGenerateContextualActions]);

    const handlePlayerRecoverWithProcessing = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        await handlePlayerRecover();
        await handleGenerateContextualActions();
        setIsProcessing(false);
    };

    const handleBackToMenuWithConfirmation = useCallback(() => {
        if (window.confirm("Bạn có chắc muốn trở về menu chính? Mọi tiến trình chưa lưu sẽ bị mất.")) {
            handleBackToMenu();
        }
    }, [handleBackToMenu]);

    const handlePoiClickInModal = (poiId: number) => {
        handleOpenDialogue(poiId);
        setIsMapModalOpen(false);
    };


    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white" style={{ backgroundImage: `url('https://shared.st.dl.eccdnx.com/store_item_assets/steam/apps/3384260/extras/04%E6%88%98%E6%96%97.jpg?t=1734582082')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
                <div className="min-h-screen w-full bg-black/70 backdrop-blur-sm flex flex-col relative">
                    
                    <header className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start pointer-events-none">
                        <div className="pointer-events-auto">
                            <CharacterStatusHeader character={character} />
                        </div>
                        <div className="pointer-events-auto">
                            <GameHeader 
                                onMenu={() => setIsMenuModalOpen(true)}
                                onMap={() => setIsMapModalOpen(true)}
                                onForge={() => handleOpenForge()}
                                onSaveLoad={() => handleOpenMenu(GameScreen.SAVE_MANAGEMENT)}
                                onSettings={() => handleOpenMenu(GameScreen.SETTINGS)}
                                onExit={handleBackToMenuWithConfirmation}
                            />
                        </div>
                    </header>

                    <main className="flex-grow p-4 pt-40 overflow-hidden">
                         <div className="h-full bg-[var(--color-backdrop-bg)] p-4 rounded-xl border border-[var(--color-border-base)] backdrop-blur-md">
                             <StoryLog logs={eventLog} isProcessing={isProcessing} />
                        </div>
                    </main>

                    <footer className="flex-shrink-0">
                         <PlayerInputPanel 
                            contextualActions={contextualActions}
                            isGeneratingActions={isGeneratingActions}
                            isProcessing={isProcessing}
                            onActionSubmit={handleActionSubmit}
                            onPlayerRecover={handlePlayerRecoverWithProcessing}
                            onMove={handleMove}
                         />
                    </footer>
                </div>
            </div>
            
            {isMenuModalOpen && <MenuModal onClose={() => setIsMenuModalOpen(false)} />}
            
            {isMapModalOpen && (
                <WorldMapModal 
                    pois={worldState.pois}
                    playerPosition={character.position}
                    onClose={() => setIsMapModalOpen(false)}
                    onPoiClick={handlePoiClickInModal}
                />
            )}
        </>
    );
};

export default WorldScreen;
