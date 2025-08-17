import React, { useState, useCallback, useEffect } from 'react';
import { Character, Item, GameScreen, ItemType, ExplorationEventLog, Poi, LogType } from '../types';
import { processPlayerAction } from '../services/geminiService';
import { getTerrainFromPosition } from '../services/gameLogic';
import CharacterStatusHeader from './CharacterStatusHeader';
import InventoryScreen from './InventoryScreen';
import ResourcesScreen from './ResourcesScreen';
import WorldMap from './WorldMap';
import { useGame } from '../contexts/GameContext';
import QuestLog from './QuestLog';
import QuestTracker from './QuestTracker';
import PetScreen from './PetScreen';
import CharacterSheet from './CharacterSheet';
import CultivationScreen from './CultivationScreen';
import FactionScreen from './FactionScreen';
import BestiaryScreen from './BestiaryScreen';
import WorldMapModal from './WorldMapModal';
import NpcListScreen from './NpcListScreen';
import StoryLog from './StoryLog';
import ItemCard from './ItemCard';
import { RARITY_DATA } from '../constants';
import CompanionScreen from './CompanionScreen';

type MainView = 'overview' | 'inventory' | 'resources' | 'quests' | 'pets' | 'cultivation' | 'factions' | 'bestiary' | 'npcs' | 'companions';
type LeftPanelTab = 'actions' | 'inventory' | 'quests';
type RightPanelContent = { type: 'map' } | { type: 'item'; item: Item };

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
            className={`flex-shrink-0 px-4 py-2 text-sm sm:text-base rounded-md transition-colors whitespace-nowrap ${activeView === view ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in p-2 sm:p-4">
            <div className="bg-gray-900 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] text-white relative flex flex-col overflow-hidden">
                <button onClick={onClose} className="absolute top-2 right-2 sm:top-4 sm:right-4 text-gray-400 hover:text-white text-3xl z-20">&times;</button>
                <nav className="w-full flex-shrink-0 bg-gray-800 p-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        <h2 className="hidden sm:block text-xl font-bold text-purple-400 mr-4 px-2 whitespace-nowrap">Bảng Nhân Vật</h2>
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
            className={`bg-gray-700 hover:bg-gray-600 rounded-md p-3 text-lg font-bold transition-colors disabled:opacity-50 ${gridClass}`}
        >
            {label}
        </button>
    );

    return (
        <div className="grid grid-cols-3 grid-rows-3 gap-2 w-40 mx-auto">
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


const WorldScreen: React.FC = () => {
    const { 
        character, 
        worldState,
        appSettings,
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
        handleOpenDialogue,
        handleEquipItem,
        handleUnequipItem
    } = useGame();

    const [eventLog, setEventLog] = useState<ExplorationEventLog[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
    const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTab>('actions');
    const [rightPanelContent, setRightPanelContent] = useState<RightPanelContent>({ type: 'map' });

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
        setRightPanelContent({type: 'map'}); // Switch back to map on move
        
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
    }, [character, worldState, isProcessing, appSettings.difficulty, handleStartCombat, handleGenerateContextualActions]);

    const handleBackToMenuWithConfirmation = useCallback(() => {
        if (window.confirm("Bạn có chắc muốn trở về menu chính? Mọi tiến trình chưa lưu sẽ bị mất.")) {
            handleBackToMenu();
        }
    }, [handleBackToMenu]);

    const handlePoiClickInModal = (poiId: number) => {
        handleOpenDialogue(poiId);
        setIsMapModalOpen(false);
    };

    const LeftPanel = () => {
        const TabButton: React.FC<{tab: LeftPanelTab, label: string}> = ({tab, label}) => (
            <button 
                onClick={() => setLeftPanelTab(tab)}
                className={`flex-1 py-2 text-sm font-semibold transition-colors rounded-t-md ${leftPanelTab === tab ? 'bg-gray-800 text-purple-300' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
            >
                {label}
            </button>
        );

        const CompactInventory = () => {
             const InventoryItemTile: React.FC<{ item: Item }> = ({ item }) => {
                const rarityInfo = RARITY_DATA[item.rarity];
                const isSelected = rightPanelContent.type === 'item' && rightPanelContent.item.id === item.id;
                return (
                    <div 
                        onClick={() => setRightPanelContent({type: 'item', item: item})}
                        className={`relative aspect-square p-1.5 rounded-md cursor-pointer flex flex-col justify-between transition-all border-2 ${isSelected ? 'border-yellow-400 bg-yellow-900/50' : `${rarityInfo.borderColor} bg-gray-900/50 hover:bg-gray-700/50`}`}
                        title={item.name}
                    >
                        <p className={`text-[10px] leading-tight font-semibold truncate ${rarityInfo.color}`}>{item.name}</p>
                        <div className="flex justify-between items-end">
                            <p className="text-[10px] text-gray-400">C{item.level}</p>
                            {item.upgradeLevel > 0 && <p className="text-[10px] font-bold text-white">+{item.upgradeLevel}</p>}
                        </div>
                    </div>
                );
            };
            return (
                 <div className="grid grid-cols-4 gap-2 p-2 bg-black/20 rounded-b-lg">
                        {character.inventory.map(item => <InventoryItemTile key={item.id} item={item} />)}
                 </div>
            )
        };

        return (
            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 h-full flex flex-col gap-4">
                <CharacterStatusHeader character={character} />
                
                <div className="flex-grow flex flex-col bg-gray-900 rounded-lg border border-gray-700">
                    <div className="flex-shrink-0 flex">
                        <TabButton tab="actions" label="Hành Động" />
                        <TabButton tab="inventory" label="Hành Trang" />
                        <TabButton tab="quests" label="Nhiệm Vụ" />
                    </div>
                    <div className="flex-grow overflow-y-auto p-3">
                        {leftPanelTab === 'actions' && (
                            <div className="space-y-4">
                                <MovementPad onMove={handleMove} disabled={isProcessing} />
                                 {isGeneratingActions && contextualActions.length === 0 ? (
                                    <div className="text-center text-gray-400 p-2">Đang nghĩ...</div>
                                ) : (
                                    <div className="space-y-2">
                                        {contextualActions.map((action, index) => (
                                            <button key={index} onClick={() => handleActionSubmit(action)} disabled={isProcessing} className="w-full text-left bg-cyan-800/50 hover:bg-cyan-700/70 border border-cyan-500/30 text-white font-semibold py-2 px-3 rounded-lg transition text-sm disabled:bg-gray-600">
                                                {action}
                                            </button>
                                        ))}
                                        <button onClick={handlePlayerRecover} disabled={isProcessing} className="w-full bg-green-800/50 hover:bg-green-700/70 border border-green-500/30 text-white font-semibold py-2 px-3 rounded-lg transition text-sm disabled:bg-gray-600">Nghỉ Ngơi</button>
                                    </div>
                                )}
                            </div>
                        )}
                        {leftPanelTab === 'inventory' && <CompactInventory />}
                        {leftPanelTab === 'quests' && <QuestTracker />}
                    </div>
                </div>

                <div className="flex-shrink-0 space-y-2">
                     <button onClick={() => setIsMenuModalOpen(true)} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition">Bảng Nhân Vật</button>
                     <button onClick={() => handleOpenForge()} disabled={isProcessing} className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition disabled:bg-gray-600">Lò Rèn</button>
                    <div className="grid grid-cols-3 gap-2">
                         <button onClick={() => handleOpenMenu(GameScreen.SAVE_MANAGEMENT)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition text-sm">Lưu/Tải</button>
                         <button onClick={() => handleOpenMenu(GameScreen.SETTINGS)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg transition text-sm">Thiết Lập</button>
                         <button onClick={handleBackToMenuWithConfirmation} className="bg-red-800 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition text-sm">Về Menu</button>
                    </div>
                </div>
            </div>
        )
    };
    
    const RightPanel = () => {
        return (
             <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 h-full flex flex-col">
                {rightPanelContent.type === 'map' && (
                    <WorldMap pois={worldState.pois} playerPosition={character.position} onPoiClick={handleOpenDialogue} onZoomClick={() => setIsMapModalOpen(true)} />
                )}
                {rightPanelContent.type === 'item' && (
                    <div className="h-full overflow-y-auto">
                        <ItemCard 
                            item={rightPanelContent.item} 
                            onPrimaryAction={() => handleEquipItem(rightPanelContent.item)}
                            isEquipped={false}
                        />
                    </div>
                )}
             </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-gray-900 text-white" style={{ backgroundImage: `url('https://images.wallpaperscraft.com/image/single/road_forest_night_200373_1280x720.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}>
                <div className="min-h-screen w-full bg-black/70 backdrop-blur-sm p-4">
                    <div className="h-[calc(100vh-2rem)] grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-3 h-full">
                            <LeftPanel />
                        </div>
                        <div className="lg:col-span-6 h-full bg-gray-900/50 p-4 rounded-xl border border-gray-700">
                             <StoryLog logs={eventLog} isProcessing={isProcessing} />
                        </div>
                         <div className="lg:col-span-3 h-full">
                             <RightPanel />
                        </div>
                    </div>
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
