
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import {
    GameScreen,
    Character,
    WorldState,
    AppSettings,
    SaveSlot,
    Difficulty,
    BaseStats,
    ExplorationEventLog,
    Item,
    UpgradeMaterial,
    Pet,
    ServantTask,
    DesignedWorld,
    WorldSummary,
    StoryInfo,
    LevelUpInfo,
    PlayerClass,
    Faction,
    Poi,
    Quest,
    QuestType,
    QuestStatus,
    LogType,
    UpgradeConsumable,
    Servant,
    ServantTask as ServantTaskEnum,
    PetStatus,
    CultivationTechniqueType,
    EquipmentSlot,
    ItemType,
    GameContextType,
    DungeonFloorType,
    DialogueState
} from '../types';
import { loadSettings, saveSettings, loadAllSaveSlots, saveGame, loadGame, deleteSave } from '../services/storageService';
import { DEFAULT_SETTINGS, PLAYER_CLASS_BASE_STATS, UPGRADE_CONSUMABLES_DATA, UPGRADE_MATERIALS_DATA, PET_EVOLUTION_COST, PET_EVOLUTION_LEVEL, DIFFICULTY_MODIFIERS } from '../constants';
import { calculateDerivedStats, getUpgradeCost, processItemUpgrade, calculatePetDerivedStats, getTerrainFromPosition, generateRandomRetainer, calculateRetainerStats, generateRandomMonster, calculateLevelUp, createMonster } from '../services/gameLogic';
import { generateCharacterDetails, generateSectMission, generateContextualActions, generateStrategicAdvice, generateDialogueResponse } from '../services/geminiService';
import { VAN_LINH_GIOI_POIS } from '../data/worldData';
import { PREDEFINED_MONSTERS } from '../data/monsterData';

// Create the context with a default value
const GameContext = createContext<GameContextType | undefined>(undefined);

// Create a provider component
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
    const [character, setCharacter] = useState<Character | null>(null);
    const [enemy, setEnemy] = useState<Character | null>(null);
    const [worldState, setWorldState] = useState<WorldState>({ pois: [], factions: [], dungeons: [], bestiary: [] });
    const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings());
    const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(loadAllSaveSlots());
    const [isQuickPlayLoading, setIsQuickPlayLoading] = useState(false);
    const [designedWorld, setDesignedWorld] = useState<DesignedWorld | null>(null);
    const [designedWorldPrompt, setDesignedWorldPrompt] = useState<WorldSummary | null>(null);
    const [designedWorldStoryInfo, setDesignedWorldStoryInfo] = useState<StoryInfo | null>(null);
    const [activePoiIdForDialogue, setActivePoiIdForDialogue] = useState<number | null>(null);
    const [transientDialogue, setTransientDialogue] = useState<any>(null);
    const [contextualActions, setContextualActions] = useState<string[]>([]);
    const [isGeneratingActions, setIsGeneratingActions] = useState(false);
    const [levelUpInfo, setLevelUpInfo] = useState<LevelUpInfo | null>(null);
    const [oneTimeMessages, setOneTimeMessages] = useState<ExplorationEventLog[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [imageLibrary, setImageLibrary] = useState<any[]>([]);
    
    // Most handlers are defined as stubs for now as they require significant logic.
    const unimplemented = useCallback((name: string) => () => { console.warn(`${name} is not implemented`); }, []);
    const unimplementedAsync = useCallback((name: string) => async () => { console.warn(`${name} is not implemented`); }, []);
    
    // FIX: Implement missing handlers to satisfy GameContextType
    const handleQuickPlay = unimplemented('handleQuickPlay');
    const handleDevQuickStart = unimplemented('handleDevQuickStart');

    const handleOpenForge = () => setScreen(GameScreen.FORGE);

    const handleOpenDialogue = (poiId: number) => {
        const poiIndex = worldState.pois.findIndex(p => p.id === poiId);
        if (poiIndex === -1 || !character) return;

        const poi = worldState.pois[poiIndex];
        if (!poi.dialogue) {
            const faction = worldState.factions.find(f => f.id === poi.factionId);
            const newDialogueState: DialogueState = {
                npcName: poi.name,
                npcRole: poi.type,
                affinity: character.reputation[poi.factionId || -1] || 0,
                history: [{ speaker: 'system', text: `[Bạn đã đến ${poi.name}]` }],
                options: ['Chào hỏi', 'Hỏi về xung quanh', 'Tạm biệt'],
                factionId: poi.factionId,
                factionName: faction?.name,
            };
            const updatedPois = [...worldState.pois];
            updatedPois[poiIndex] = { ...poi, dialogue: newDialogueState };
            setWorldState(prev => ({...prev, pois: updatedPois}));
        }
        
        setActivePoiIdForDialogue(poiId);
        setScreen(GameScreen.DIALOGUE);
    };

    const handleCloseDialogue = () => {
        setActivePoiIdForDialogue(null);
        setTransientDialogue(null);
        setScreen(GameScreen.WORLD);
    };


    const handleSettingsChange = (newSettings: AppSettings) => {
        setAppSettings(newSettings);
        saveSettings(newSettings);
    };

    const refreshSaveSlots = () => setSaveSlots(loadAllSaveSlots());
    
    const handleBackToMenu = () => {
        setScreen(GameScreen.MENU);
        setCharacter(null);
        setEnemy(null);
        setDesignedWorldPrompt(null);
    };

    const handleOpenMenu = (menu: GameScreen) => setScreen(menu);
    const handleStartNewGame = () => setScreen(GameScreen.WORLD_DESIGNER);
    
    const handleDesignWorldComplete = (world: DesignedWorld, summary: WorldSummary, storyInfo?: StoryInfo) => {
        setDesignedWorld(world);
        setDesignedWorldPrompt(summary);
        setDesignedWorldStoryInfo(storyInfo || null);
        setScreen(GameScreen.CREATOR);
    };

    const handleGenerateContextualActions = async () => {
        if (!character || isGeneratingActions) return;
        setIsGeneratingActions(true);
        try {
            const terrain = getTerrainFromPosition(character.position);
            const recentLogs = oneTimeMessages.map(l => l.text).slice(0, 3);
            const actions = await generateContextualActions(character, terrain, recentLogs);
            setContextualActions(actions);
        } catch (e) {
            console.error("Failed to generate actions", e);
        } finally {
            setIsGeneratingActions(false);
        }
    };

    const handleGetAIAdvice = async () => {
        if (!character || isGeneratingActions) return;
        setIsGeneratingActions(true);
        try {
            const terrain = getTerrainFromPosition(character.position);
            const recentLogs = oneTimeMessages.map(l => l.text).slice(0, 3);
            const advice = await generateStrategicAdvice(character, terrain, recentLogs);
            setOneTimeMessages([{ id: crypto.randomUUID(), text: `🔮 Linh Hồn Hộ Mệnh: ${advice}`, type: LogType.ADVICE }]);
        } catch (e) {
            console.error("Failed to get advice", e);
        } finally {
            setIsGeneratingActions(false);
        }
    };

    const handleRequestSectMission = async () => {
        if (!character || !character.sectId) {
            alert("Bạn chưa gia nhập tông môn nào!");
            return;
        }

        const faction = worldState.factions.find(f => f.id === character.sectId);
        if (!faction) return;

        try {
            const missionData = await generateSectMission(faction, character.sectRank || 'Đệ tử ngoại môn');
            
            const newQuest: Quest = {
                id: crypto.randomUUID(),
                title: missionData.title,
                description: missionData.description,
                type: QuestType.SECT_MISSION,
                status: QuestStatus.ACTIVE,
                target: {
                    targetName: missionData.targetName,
                    count: missionData.count,
                    current: 0,
                },
                rewards: {
                    exp: missionData.expReward,
                    contributionPoints: missionData.contributionReward,
                }
            };
            
            setCharacter(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    quests: [...prev.quests, newQuest]
                };
            });
            alert("Đã nhận nhiệm vụ mới!");

        } catch (e: any) {
            console.error(e);
            alert("Không thể nhận nhiệm vụ lúc này: " + e.message);
        }
    };

    const handleCreateGame = async (
        name: string,
        playerClass: string,
        classDefinition: BaseStats | undefined,
        characterContext: string,
        worldPrompt: string,
        worldKeywords: string[],
        difficulty: Difficulty,
        storyInfo?: StoryInfo
    ) => {
        console.log("Creating game...");
        if (!designedWorld) {
            throw new Error("Không có dữ liệu thế giới được thiết kế. Vui lòng quay lại bước 1.");
        }
        
        handleSettingsChange({ ...appSettings, difficulty });

        // 1. Create World State from designedWorld
        let factionIdCounter = 0;
        const factions: Faction[] = designedWorld.majorFactions.map(f => ({
            ...f,
            id: factionIdCounter++,
            store: [], // Initialize empty store
        }));
    
        const pois: Poi[] = VAN_LINH_GIOI_POIS.map((poiTemplate, index) => {
            const faction = factions.find(f => f.name === poiTemplate.factionName);
            return {
                ...poiTemplate,
                id: index,
                isLoading: false,
                factionId: faction ? faction.id : undefined,
                dialogue: undefined, // ensure dialogue is not carried over from template
            }
        });
    
        const worldState: WorldState = {
            factions,
            pois,
            dungeons: [],
            bestiary: PREDEFINED_MONSTERS.map(m => ({ ...m, discovered: false }))
        };
        
        // 2. Create Character
        const { backstory, linhCan } = await generateCharacterDetails(name, playerClass, characterContext, designedWorld.worldLore);
    
        const baseStats = classDefinition ?? PLAYER_CLASS_BASE_STATS[playerClass as PlayerClass];
        
        const partialCharacter: Omit<Character, 'derivedStats' | 'currentHp' | 'currentMp'> = {
            id: crypto.randomUUID(),
            name,
            playerClass,
            level: 1,
            exp: 0,
            expToNextLevel: 100,
            realm: { name: 'Luyện Khí Kỳ', level: 1 },
            baseStats,
            equipment: {},
            skills: [],
            backstory: '', // temp
            inventory: [],
            activeEffects: [],
            position: { x: 2048, y: 2048 },
            isHumanoid: true,
            isBoss: false,
            pets: [],
            retainers: [],
            servants: [],
            metNpcs: [],
            quests: [],
            reputation: {},
            materials: {},
            consumables: {},
            sectContributionPoints: 0,
            learnedCultivationTechniques: [],
        };
        
        const derivedStats = calculateDerivedStats(partialCharacter);
    
        const newCharacter: Character = {
            ...partialCharacter,
            derivedStats,
            currentHp: derivedStats.HP,
            currentMp: derivedStats.MP,
            backstory,
            unallocatedStatPoints: classDefinition ? 0 : 5,
            linhCan,
        };
    
        // 3. Update Game State
        setCharacter(newCharacter);
        setWorldState(worldState);
        setScreen(GameScreen.WORLD);
        console.log("Game created successfully!");
    };


    const handleToggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false));
        }
    };

    const handleUpgradeItem = async (itemId: string): Promise<{ success: boolean; message: string; }> => {
        if (!character) return { success: false, message: "Nhân vật không tồn tại." };

        const inventoryItem = character.inventory.find(i => i.id === itemId);
        const equippedItemKey = Object.keys(character.equipment).find(key => character.equipment[key as any]?.id === itemId);
        const item = inventoryItem || (equippedItemKey ? character.equipment[equippedItemKey as any] : null);

        if (!item) return { success: false, message: "Không tìm thấy vật phẩm." };

        const cost = getUpgradeCost(item);
        if (!cost) return { success: false, message: "Vật phẩm đã đạt cấp tối đa." };

        if ((character.materials[cost.material] || 0) < cost.amount) {
            return { success: false, message: `Không đủ ${cost.material} (Cần ${cost.amount}).` };
        }

        const upgradedItem = processItemUpgrade(item);
        
        const newMaterials = { ...character.materials };
        newMaterials[cost.material] = (newMaterials[cost.material] || 0) - cost.amount;

        let newInventory = [...character.inventory];
        let newEquipment = { ...character.equipment };

        if (inventoryItem) {
            newInventory = newInventory.map(i => i.id === itemId ? upgradedItem : i);
        } else if (equippedItemKey) {
             newEquipment = { ...newEquipment, [equippedItemKey]: upgradedItem };
        }
        
        // Recalculate stats only if updated item was equipped
        let newCharacter = {
            ...character,
            inventory: newInventory,
            equipment: newEquipment,
            materials: newMaterials
        };
        
        if (equippedItemKey) {
            const derived = calculateDerivedStats(newCharacter);
            newCharacter = { ...newCharacter, derivedStats: derived };
        }

        setCharacter(newCharacter);
        return { success: true, message: `Cường hóa ${item.name} thành công lên +${upgradedItem.upgradeLevel}!` };
    };

    // --- Pet Logic Implementation ---
    const handleFeedPet = async (petId: string) => {
        if (!character) return;
        const petIndex = character.pets.findIndex(p => p.id === petId);
        if (petIndex === -1) throw new Error("Không tìm thấy thú cưng.");

        const foodCount = character.consumables[UpgradeConsumable.LINH_THU_THUC] || 0;
        if (foodCount <= 0) throw new Error("Không đủ Linh Thú Thực.");

        const pet = character.pets[petIndex];
        const newPet = { ...pet };
        newPet.exp += 50; 
        
        // Simple level up logic for pets
        if (newPet.exp >= newPet.expToNextLevel) {
            newPet.level += 1;
            newPet.exp -= newPet.expToNextLevel;
            newPet.expToNextLevel = Math.floor(newPet.expToNextLevel * 1.5);
            
            // Boost stats
            newPet.baseStats.STR += 2;
            newPet.baseStats.CON += 2;
            newPet.baseStats.DEX += 1;
            newPet.derivedStats = calculatePetDerivedStats(newPet);
        }

        const newCharacter = { ...character };
        newCharacter.pets[petIndex] = newPet;
        newCharacter.consumables[UpgradeConsumable.LINH_THU_THUC] = foodCount - 1;

        setCharacter(newCharacter);
    };

    const handleEvolvePet = async (petId: string) => {
        if (!character) return;
        const petIndex = character.pets.findIndex(p => p.id === petId);
        if (petIndex === -1) throw new Error("Không tìm thấy thú cưng.");
        
        const pet = character.pets[petIndex];
        if (pet.isEvolved) throw new Error("Thú cưng đã tiến hóa.");
        
        // Check materials
        for (const [mat, cost] of Object.entries(PET_EVOLUTION_COST)) {
            if ((character.materials[mat as UpgradeMaterial] || 0) < cost) {
                throw new Error(`Không đủ ${UPGRADE_MATERIALS_DATA[mat as UpgradeMaterial].name}`);
            }
        }

        // Consume materials
        const newMaterials = { ...character.materials };
        for (const [mat, cost] of Object.entries(PET_EVOLUTION_COST)) {
             newMaterials[mat as UpgradeMaterial] = (newMaterials[mat as UpgradeMaterial] || 0) - cost;
        }

        const newPet = { ...pet, isEvolved: true };
        newPet.baseStats.STR = Math.floor(newPet.baseStats.STR * 1.5);
        newPet.baseStats.AGI = Math.floor(newPet.baseStats.AGI * 1.5);
        newPet.baseStats.INT = Math.floor(newPet.baseStats.INT * 1.5);
        newPet.baseStats.CON = Math.floor(newPet.baseStats.CON * 1.5);
        newPet.derivedStats = calculatePetDerivedStats(newPet);
        
        const newCharacter = { ...character, materials: newMaterials };
        newCharacter.pets[petIndex] = newPet;
        
        setCharacter(newCharacter);
    };

    const handleCatchPet = async (): Promise<{ success: boolean; message: string; }> => {
        if (!character || !enemy) return { success: false, message: "Lỗi trận đấu." };
        
        if ((character.consumables[UpgradeConsumable.LINH_THU_PHU] || 0) <= 0) {
            return { success: false, message: "Không có Linh Thú Phù!" };
        }

        // Chance based on HP
        const hpPercent = enemy.currentHp / enemy.derivedStats.HP;
        const chance = 0.8 - hpPercent; // Lower HP = higher chance
        const roll = Math.random();

        const newConsumables = { ...character.consumables };
        newConsumables[UpgradeConsumable.LINH_THU_PHU] = (newConsumables[UpgradeConsumable.LINH_THU_PHU] || 0) - 1;
        
        if (roll < chance) {
             const newPet: Pet = {
                id: crypto.randomUUID(),
                name: enemy.name,
                monsterClass: enemy.playerClass,
                level: 1, // Reset level or keep? Let's reset to 1 but with good base stats
                exp: 0,
                expToNextLevel: 100,
                baseStats: { ...enemy.baseStats }, // Inherit stats
                derivedStats: { ...enemy.derivedStats }, // Recalculate later
                skills: [], // Reset skills or keep basic ones?
                loyalty: 50,
                loyaltyDescription: "Vừa bị thu phục, còn chút hoang dã.",
                oneWordStatus: "Hoang mang",
                imageUrl: enemy.imageUrl,
                isEvolved: false,
                activeEffects: [],
                currentHp: enemy.derivedStats.HP,
                status: PetStatus.IDLE
             };
             newPet.derivedStats = calculatePetDerivedStats(newPet); // Ensure stats are correct for level 1
             
             setCharacter({ ...character, pets: [...character.pets, newPet], consumables: newConsumables });
             return { success: true, message: `Thu phục ${enemy.name} thành công!` };
        }

        setCharacter({ ...character, consumables: newConsumables });
        return { success: false, message: `Thu phục thất bại! ${enemy.name} đã kháng cự.` };
    };

    const handleEnslaveTarget = async (): Promise<{ success: boolean; message: string; }> => {
        if (!character || !enemy) return { success: false, message: "Lỗi trận đấu." };
        if (!enemy.isHumanoid) return { success: false, message: "Chỉ có thể nô dịch mục tiêu hình người." };

         if ((character.consumables[UpgradeConsumable.HON_AN_PHU] || 0) <= 0) {
            return { success: false, message: "Không có Hồn Ấn Phù!" };
        }
        
         // Chance based on HP
        const hpPercent = enemy.currentHp / enemy.derivedStats.HP;
        const chance = 0.5 - hpPercent; // Harder than pets
        const roll = Math.random();

        const newConsumables = { ...character.consumables };
        newConsumables[UpgradeConsumable.HON_AN_PHU] = (newConsumables[UpgradeConsumable.HON_AN_PHU] || 0) - 1;

        if (roll < chance) {
            const newServant: Servant = {
                ...enemy,
                id: crypto.randomUUID(),
                task: ServantTaskEnum.IDLE,
                characterClass: enemy.playerClass,
                derivedStats: enemy.derivedStats, // Keep stats
                // Ensure required arrays exist
                metNpcs: [],
                quests: [],
                reputation: {},
                materials: {},
                consumables: {},
                learnedCultivationTechniques: []
            };
             
             setCharacter({ ...character, servants: [...character.servants, newServant], consumables: newConsumables });
             return { success: true, message: `Nô dịch ${enemy.name} thành công! Đã thêm vào danh sách Nô Bộc.` };
        }

        setCharacter({ ...character, consumables: newConsumables });
        return { success: false, message: `Nô dịch thất bại! Ý chí của ${enemy.name} quá mạnh.` };
    };

    const handleLevelUpCultivationTechnique = async (techniqueId: string) => {
        if (!character) return;
        const techIndex = character.learnedCultivationTechniques.findIndex(t => t.id === techniqueId);
        if (techIndex === -1) return;

        const tech = character.learnedCultivationTechniques[techIndex];
        if (tech.level >= tech.maxLevel) return;

        const cost = Math.floor(100 * Math.pow(tech.level, 1.8));
        if (character.exp < cost) {
            alert("Không đủ EXP để nâng cấp.");
            return;
        }

        const newTech = { ...tech, level: tech.level + 1 };
        // Increase bonuses
        newTech.bonuses = newTech.bonuses.map(b => ({
            ...b,
            value: b.value + (b.isPercent ? 0.5 : 5)
        }));

        const newCharacter = { ...character };
        newCharacter.exp -= cost;
        newCharacter.learnedCultivationTechniques[techIndex] = newTech;
        
        setCharacter(newCharacter);
    };

    const handleContributeItemToSect = async (item: Item): Promise<{success: boolean, message: string}> => {
        if (!character) return { success: false, message: "Lỗi nhân vật" };
        
        // Simple calculation: Rarity * Level * 10
        const rarityMultiplier = {
            'Common': 1, 'Uncommon': 2, 'Rare': 5, 'Epic': 10, 'Legendary': 20
        }[item.rarity] || 1;
        
        const points = Math.floor(10 * item.level * rarityMultiplier);
        
        const newInventory = character.inventory.filter(i => i.id !== item.id);
        const newCharacter = {
            ...character,
            inventory: newInventory,
            sectContributionPoints: character.sectContributionPoints + points
        };
        setCharacter(newCharacter);
        return { success: true, message: `Đã cống hiến ${item.name}. Nhận được ${points} điểm cống hiến.` };
    };

    const handleBuyFromSectStore = async (storeItem: any): Promise<{success: boolean, message: string}> => {
        if (!character) return { success: false, message: "Lỗi nhân vật" };
        if (character.sectContributionPoints < storeItem.cost) return { success: false, message: "Không đủ điểm cống hiến" };

        const newCharacter = {
            ...character,
            sectContributionPoints: character.sectContributionPoints - storeItem.cost,
            inventory: [...character.inventory, { ...storeItem.item, id: crypto.randomUUID() }]
        };
        setCharacter(newCharacter);
        return { success: true, message: `Đã đổi ${storeItem.item.name} thành công!` };
    };

    // --- Added missing logic handlers ---
    const handleLoadGame = (slotId: number) => {
        const loadedData = loadGame(slotId);
        if (loadedData) {
            setCharacter(loadedData.character);
            setWorldState(loadedData.worldState);
            setScreen(GameScreen.WORLD);
            setOneTimeMessages([{id: crypto.randomUUID(), text: `Đã tải game từ ô ${slotId + 1}`, type: LogType.SYSTEM}]);
        } else {
             alert("Không tìm thấy dữ liệu lưu trữ.");
        }
    };

    const handleAllocateStatPoint = (stat: keyof BaseStats) => {
        if (!character || (character.unallocatedStatPoints || 0) <= 0) return;

        const newCharacter = { ...character };
        newCharacter.baseStats[stat] = (newCharacter.baseStats[stat] || 0) + 1;
        newCharacter.unallocatedStatPoints = (newCharacter.unallocatedStatPoints || 0) - 1;
        newCharacter.derivedStats = calculateDerivedStats(newCharacter);

        setCharacter(newCharacter);
    };

    const handleEquipItem = (item: Item) => {
        if (!character || !item.slot) return;
        const slot = item.slot;
        const currentEquipped = character.equipment[slot];
        
        let newInventory = character.inventory.filter(i => i.id !== item.id);
        if (currentEquipped) {
            newInventory.push(currentEquipped);
        }

        const newEquipment = { ...character.equipment, [slot]: item };
        
        const newCharacter = { 
            ...character, 
            inventory: newInventory, 
            equipment: newEquipment 
        };
        newCharacter.derivedStats = calculateDerivedStats(newCharacter);
        
        setCharacter(newCharacter);
    };

    const handleUnequipItem = (slot: EquipmentSlot) => {
        if (!character || !character.equipment[slot]) return;
        
        const item = character.equipment[slot]!;
        const newEquipment = { ...character.equipment };
        delete newEquipment[slot];

        const newInventory = [...character.inventory, item];
        
        const newCharacter = { 
            ...character, 
            inventory: newInventory, 
            equipment: newEquipment 
        };
        newCharacter.derivedStats = calculateDerivedStats(newCharacter);
        
        setCharacter(newCharacter);
    };

    const handleLearnItem = (item: Item) => {
        if (!character) return;
        
        let message = "";
        const newCharacter = { ...character };
        
        if (item.type === ItemType.SKILL_BOOK && item.skillDetails) {
            if (character.skills.some(s => s.name === item.skillDetails!.name)) {
                alert("Bạn đã học kỹ năng này rồi!");
                return;
            }
            newCharacter.skills = [...newCharacter.skills, item.skillDetails];
            message = `Đã học kỹ năng: ${item.skillDetails.name}`;
        } else if (item.type === ItemType.CULTIVATION_MANUAL && item.cultivationTechniqueDetails) {
             if (character.learnedCultivationTechniques.some(t => t.name === item.cultivationTechniqueDetails!.name)) {
                alert("Bạn đã lĩnh hội công pháp này rồi!");
                return;
            }
            newCharacter.learnedCultivationTechniques = [...newCharacter.learnedCultivationTechniques, item.cultivationTechniqueDetails];
            message = `Đã lĩnh hội: ${item.cultivationTechniqueDetails.name}`;
        } else {
            return;
        }

        // Remove item from inventory
        newCharacter.inventory = newCharacter.inventory.filter(i => i.id !== item.id);
        
        setCharacter(newCharacter);
        setOneTimeMessages([{id: crypto.randomUUID(), text: message, type: LogType.SYSTEM}]);
    };

    const handleSetActivePet = (petId: string | null) => {
        if (!character) return;
        setCharacter({ ...character, activePetId: petId });
    };

    const handleReleasePet = (petId: string) => {
         if (!character) return;
         if (window.confirm("Bạn có chắc muốn thả thú cưng này về tự nhiên?")) {
             const newPets = character.pets.filter(p => p.id !== petId);
             setCharacter({ ...character, pets: newPets, activePetId: character.activePetId === petId ? null : character.activePetId });
         }
    };

    const handleRenamePet = (petId: string, newName: string) => {
        if (!character) return;
        const petIndex = character.pets.findIndex(p => p.id === petId);
        if (petIndex === -1) return;

        const newPets = [...character.pets];
        newPets[petIndex] = { ...newPets[petIndex], name: newName };
        setCharacter({ ...character, pets: newPets });
    };

    // --- Retainer Logic ---
    const handleRecruitRetainer = async () => {
        if (!character) return;
        
        const newRetainer = generateRandomRetainer(Math.max(1, character.level - 5), character.id);
        const newCharacter = {
            ...character,
            retainers: [...character.retainers, newRetainer]
        };
        setCharacter(newCharacter);
        setOneTimeMessages([{id: crypto.randomUUID(), text: `Đã chiêu mộ đệ tử mới: ${newRetainer.name} (${newRetainer.playerClass})`, type: LogType.SYSTEM}]);
    };

    const handleTrainRetainer = async (retainerId: string) => {
        if (!character) return;
        const index = character.retainers.findIndex(r => r.id === retainerId);
        if (index === -1) return;

        const retainer = character.retainers[index];
        const cost = 5; // Cost in Spirit Stones (placeholder logic)
        
        if ((character.materials[UpgradeMaterial.TINH_THACH_HA_PHAM] || 0) < cost) {
            alert(`Cần ${cost} Tinh Thạch Hạ Phẩm để truyền công.`);
            return;
        }

        const newMaterials = { ...character.materials };
        newMaterials[UpgradeMaterial.TINH_THACH_HA_PHAM] = (newMaterials[UpgradeMaterial.TINH_THACH_HA_PHAM] || 0) - cost;

        const newRetainer = { ...retainer };
        const expGain = 100;
        newRetainer.exp += expGain;
        
        if (newRetainer.exp >= newRetainer.expToNextLevel) {
            newRetainer.level++;
            newRetainer.exp -= newRetainer.expToNextLevel;
            newRetainer.expToNextLevel = Math.floor(newRetainer.expToNextLevel * 1.2);
            // Stat growth based on potential
            const p = newRetainer.potential;
            newRetainer.baseStats.STR += Math.floor(2 * p);
            newRetainer.baseStats.AGI += Math.floor(2 * p);
            newRetainer.baseStats.INT += Math.floor(2 * p);
            newRetainer.baseStats.CON += Math.floor(2 * p);
            newRetainer.derivedStats = calculateRetainerStats(newRetainer);
            newRetainer.currentHp = newRetainer.derivedStats.HP; // Heal on level up
            newRetainer.currentMp = newRetainer.derivedStats.MP;
        }

        const newRetainers = [...character.retainers];
        newRetainers[index] = newRetainer;

        setCharacter({
            ...character,
            materials: newMaterials,
            retainers: newRetainers
        });
        setOneTimeMessages([{id: crypto.randomUUID(), text: `${retainer.name} đã nhận được ${expGain} kinh nghiệm.`, type: LogType.SYSTEM}]);
    };

    const handleSetActiveRetainer = (retainerId: string | null) => {
        if (!character) return;
        setCharacter({ ...character, activeRetainerId: retainerId });
    };

    // --- GAME LOOP IMPLEMENTATIONS ---

    const handleStartCombat = (monsterName?: string, levelOverride?: number) => {
        if (!character) return;
        let newEnemy: Character;
        if (monsterName) {
            newEnemy = createMonster(monsterName, levelOverride);
        } else {
            const terrain = getTerrainFromPosition(character.position);
            newEnemy = generateRandomMonster(character.level, terrain);
        }
        
        // Apply difficulty modifiers to the enemy
        const diffMods = DIFFICULTY_MODIFIERS[appSettings.difficulty];
        newEnemy.derivedStats.HP = Math.floor(newEnemy.derivedStats.HP * diffMods.enemyHp);
        newEnemy.currentHp = newEnemy.derivedStats.HP;
        newEnemy.derivedStats.ATK = Math.floor(newEnemy.derivedStats.ATK * diffMods.enemyDmg);
        newEnemy.derivedStats.MATK = Math.floor(newEnemy.derivedStats.MATK * diffMods.enemyDmg);
        
        setEnemy(newEnemy);
        setScreen(GameScreen.COMBAT);
        setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn đã chạm trán ${newEnemy.name}!`, type: LogType.COMBAT}]);
    };

    const handleCombatEnd = (playerWon: boolean, finalPlayer: Character, finalPet: Pet | null, expGained: number, itemsDropped: Item[], materialsDropped: { [key in UpgradeMaterial]?: number }, consumablesDropped: any, isInDungeon: boolean = false) => {
        if (!character) return;

        let newCharacter = { ...finalPlayer };
        let levelUpData = null;

        if (playerWon) {
            newCharacter.inventory = [...newCharacter.inventory, ...itemsDropped];
            for (const mat in materialsDropped) {
                const key = mat as UpgradeMaterial;
                newCharacter.materials[key] = (newCharacter.materials[key] || 0) + (materialsDropped[key] || 0);
            }
            for (const con in consumablesDropped) {
                const key = con as UpgradeConsumable;
                newCharacter.consumables[key] = (newCharacter.consumables[key] || 0) + (consumablesDropped[key] || 0);
            }
            const result = calculateLevelUp(newCharacter, expGained);
            newCharacter = result.newCharacter;
            levelUpData = result.levelUpInfo;
            if (finalPet && character.activePetId) {
                const petIndex = newCharacter.pets.findIndex(p => p.id === character.activePetId);
                if (petIndex !== -1) {
                    newCharacter.pets[petIndex] = finalPet;
                }
            }
        } else {
            newCharacter.currentHp = Math.floor(newCharacter.derivedStats.HP * 0.1);
            newCharacter.exp = Math.max(0, newCharacter.exp - Math.floor(newCharacter.expToNextLevel * 0.1));
            setOneTimeMessages([{id: crypto.randomUUID(), text: "Bạn đã bị đánh bại và tổn hao tu vi...", type: LogType.ERROR}]);
            if (isInDungeon) {
                handleExitDungeon(true); // Force exit dungeon on loss
                return;
            }
        }

        setCharacter(newCharacter);
        setEnemy(null);
        if (!isInDungeon || (isInDungeon && !playerWon)) {
             setScreen(GameScreen.WORLD);
        }
        
        if (levelUpData) {
            setLevelUpInfo(levelUpData);
        }
    };

    const handleActivateCultivationTechnique = (techniqueId: string) => {
        if (!character) return;
        setCharacter({ ...character, activeCultivationTechniqueId: techniqueId });
        setOneTimeMessages([{id: crypto.randomUUID(), text: "Đã chuyển đổi công pháp vận hành.", type: LogType.SYSTEM}]);
    };

    const handleSendDialogueMessage = async (message: string) => {
        if (!character || !activePoiIdForDialogue) return;
        const poiIndex = worldState.pois.findIndex(p => p.id === activePoiIdForDialogue);
        if (poiIndex === -1) return;

        const poi = worldState.pois[poiIndex];
        if (!poi.dialogue) return;

        const newHistory = [...poi.dialogue.history, { speaker: 'player', text: message } as any];
        const updatedPoi = { ...poi, dialogue: { ...poi.dialogue, history: newHistory } };
        const updatedPois = [...worldState.pois];
        updatedPois[poiIndex] = updatedPoi;
        setWorldState({ ...worldState, pois: updatedPois });

        try {
            const response = await generateDialogueResponse(
                poi.dialogue.npcName,
                poi.dialogue.npcRole,
                "Bình thường",
                poi.dialogue.affinity,
                message,
                poi.dialogue.history
            );

            const finalHistory = [...newHistory, { speaker: 'npc', text: response.text }];
            const finalPoi = { 
                ...poi, 
                dialogue: { 
                    ...poi.dialogue, 
                    history: finalHistory,
                    options: response.options,
                    affinity: response.newAffinity
                } 
            };
            const finalPois = [...worldState.pois];
            finalPois[poiIndex] = finalPoi;
            setWorldState({ ...worldState, pois: finalPois });

        } catch (e) {
            console.error("Dialogue Error", e);
        }
    };

    const handleContinueTransientDialogue = async (message: string) => {};

    const handleProceedInDungeon = async () => {};
    
    const handleExitDungeon = (force: boolean = false) => {
        if (!force && !window.confirm("Bạn có muốn rời khỏi Bí Cảnh không? Mọi tiến trình sẽ được giữ lại.")) return;
        setCharacter(prev => prev ? ({ ...prev, currentDungeonId: undefined }) : null);
        setScreen(GameScreen.WORLD);
        setOneTimeMessages([{id: crypto.randomUUID(), text: 'Bạn đã rời khỏi Bí Cảnh.', type: LogType.SYSTEM}]);
    };

    const handleAssignServantTask = (servantId: string, task: ServantTask) => {
        setCharacter(prev => {
            if (!prev) return null;
            const servantIndex = prev.servants.findIndex(s => s.id === servantId);
            if (servantIndex === -1) return prev;
            const newServants = [...prev.servants];
            newServants[servantIndex] = { ...newServants[servantIndex], task };
            return { ...prev, servants: newServants };
        });
    };

    const handleJoinSectRequest = (factionId: number) => {
        const faction = worldState.factions.find(f => f.id === factionId);
        if (!character || !faction) return;

        const joinQuest: Quest = {
            id: `join_sect_${factionId}`,
            title: `Khảo hạch gia nhập ${faction.name}`,
            description: `Để chứng tỏ thực lực, bạn cần đánh bại 5 Yêu thú trong khu vực của ${faction.name}.`,
            type: QuestType.SECT_MISSION,
            status: QuestStatus.ACTIVE,
            target: { targetName: "Yêu thú", count: 5, current: 0 },
            rewards: { exp: 500, reputationChange: [{ factionId, amount: 20 }] }
        };

        setCharacter(prev => prev ? ({ ...prev, quests: [...prev.quests, joinQuest] }) : null);
        setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn đã nhận nhiệm vụ khảo hạch để gia nhập ${faction.name}.`, type: LogType.QUEST}]);
    };

    const value: GameContextType = {
        screen,
        character,
        enemy,
        worldState,
        appSettings,
        saveSlots,
        isQuickPlayLoading,
        designedWorld,
        designedWorldPrompt,
        designedWorldStoryInfo,
        activePoiIdForDialogue,
        transientDialogue,
        contextualActions,
        isGeneratingActions,
        levelUpInfo,
        oneTimeMessages,
        isFullscreen,
        imageLibrary,
        handleSettingsChange,
        refreshSaveSlots,
        handleBackToMenu,
        handleOpenMenu,
        handleStartNewGame,
        handleToggleFullscreen,
        handleDesignWorldComplete,
        handleRequestSectMission,
        handleOpenImageLibrary: () => setScreen(GameScreen.IMAGE_LIBRARY),
        handleUpgradeItem,
        handleGenerateContextualActions,
        clearContextualActions: () => setContextualActions([]),
        handleFeedPet,
        handleEvolvePet,
        handleCatchPet,
        handleEnslaveTarget,
        handleLevelUpCultivationTechnique,
        handleContributeItemToSect,
        handleBuyFromSectStore,
        handleLoadGame,
        handleSaveGame: (slotId) => { character && saveGame(slotId, { character, worldState, saveDate: new Date().toISOString()}); refreshSaveSlots(); },
        handleDeleteSave: (slotId) => { deleteSave(slotId); refreshSaveSlots(); },
        
        handleAllocateStatPoint,
        handleEquipItem,
        handleUnequipItem,
        handleLearnItem,
        handleSetActivePet,
        handleReleasePet,
        handleRenamePet,
        handleGetAIAdvice,

        handleRecruitRetainer,
        handleTrainRetainer,
        handleSetActiveRetainer,

        handleCreateGame,
        handleCombatEnd,
        handleStartCombat,
        handleActivateCultivationTechnique,
        handleSendDialogueMessage,
        handleContinueTransientDialogue,
        
        handleProceedInDungeon,
        handleExitDungeon,
        handleAssignServantTask,
        handleJoinSectRequest,
        handleUpdateImageLibrary: (lib) => setImageLibrary(lib),
        clearLevelUpInfo: () => setLevelUpInfo(null),
        setOneTimeMessages,
        // FIX: Add missing properties to the context value to match the GameContextType interface.
        handleQuickPlay,
        handleDevQuickStart,
        handleOpenForge,
        handleOpenDialogue,
        handleCloseDialogue,
    };

    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

// Create a custom hook to use the context
export const useGame = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
