
import React, { createContext, useState, useCallback, useContext, useEffect, ReactNode } from 'react';
import { GameScreen, Character, Item, UpgradeMaterial, ImageLibraryItem, SaveSlot, AppSettings, SaveFile, WorldState, ItemType, Poi, Quest, QuestStatus, QuestType, DialogueState, DialogueTurn, SoulEffect, BaseStats, Difficulty, GameContextType, Rarity, TerrainType, SkillType, Pet, PetStatus, UpgradeConsumable, ExplorationEventLog, ExplorationEvent, CultivationTechnique, Faction, SectStoreItem, DialogueAIResponse, NpcTemplate, MonsterTemplate, DungeonState, DungeonFloorType, Skill, ForgeOptions, Stat, MonsterRank, Element, MetNpcInfo, LogType, ServantTask, Servant } from '../types';
import { createInitialCharacter, fullyUpdateCharacter, createMonster, getDismantleResult, generateItem, gainExp, convertMonsterToPet, gainExpForPet, fullyUpdatePet, calculateForgingExpToNextLevel, createBoss, getTerrainFromPosition, convertEnemyToServant } from '../services/gameLogic';
import * as geminiService from '../services/geminiService';
import { loadAllSaveSlots, saveGame, deleteSave, loadGame, saveSettings, loadSettings } from '../services/storageService';
import { DEFAULT_IMAGE_LIBRARY } from '../data/defaultImages';
import { DEFAULT_SETTINGS, PET_EVOLUTION_COST, PET_EVOLUTION_LEVEL, RARITY_DATA, MONSTER_RANK_MODIFIERS, DIFFICULTY_MODIFIERS } from '../constants';
import { PREDEFINED_MONSTERS } from '../data/monsterData';
import { VAN_LINH_GIOI_NAME, VAN_LINH_GIOI_DESCRIPTION, VAN_LINH_GIOI_FACTIONS, VAN_LINH_GIOI_POIS } from '../data/worldData';

type ForgeScreenTab = 'forge' | 'upgrade' | 'enchant' | 'dismantle' | 'craft';

const GameContext = createContext<GameContextType | undefined>(undefined);

export const useGame = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [screen, setScreen] = useState<GameScreen>(GameScreen.MENU);
    const [character, setCharacter] = useState<Character | null>(null);
    const [enemy, setEnemy] = useState<Character | null>(null);
    const [itemInForge, setItemInForge] = useState<Item | null>(null);
    const [initialForgeTab, setInitialForgeTab] = useState<ForgeScreenTab>('forge');
    const [imageLibrary, setImageLibrary] = useState<ImageLibraryItem[]>(DEFAULT_IMAGE_LIBRARY);
    const [appSettings, setAppSettings] = useState<AppSettings>(loadSettings());
    const [worldState, setWorldState] = useState<WorldState>({ pois: [], factions: [], bestiary: [], notableNpcs: [], dungeons: [] });
    const [saveSlots, setSaveSlots] = useState<SaveSlot[]>(loadAllSaveSlots());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activePoiIdForDialogue, setActivePoiIdForDialogue] = useState<number | null>(null);
    const [transientDialogue, setTransientDialogue] = useState<DialogueState | null>(null);
    const [oneTimeMessages, setOneTimeMessages] = useState<ExplorationEventLog[]>([]);
    const [designedWorldPrompt, setDesignedWorldPrompt] = useState<{ prompt: string; keywords: string; } | null>(null);
    const [designedWorldStoryInfo, setDesignedWorldStoryInfo] = useState<{ title: string; author: string; } | null>(null);
    const [contextualActions, setContextualActions] = useState<string[]>([]);
    const [isGeneratingActions, setIsGeneratingActions] = useState(false);
    const [isQuickPlayLoading, setIsQuickPlayLoading] = useState(false);
    const [levelUpInfo, setLevelUpInfo] = useState<{ newLevel: number, realmChanged: boolean, newRealm: string } | null>(null);
    const [isStartingCombat, setIsStartingCombat] = useState(false);


    const refreshSaveSlots = useCallback(() => {
        setSaveSlots(loadAllSaveSlots());
    }, []);

    useEffect(() => {
        geminiService.reinitializeAiClient();
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    
    const handleToggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    }, []);

    const handleStartNewGame = useCallback(() => {
        setDesignedWorldPrompt(null);
        setDesignedWorldStoryInfo(null);
        setScreen(GameScreen.WORLD_DESIGNER);
    }, []);

    const handleBackToMenu = useCallback(() => {
        setCharacter(null);
        setEnemy(null);
        setScreen(GameScreen.MENU);
    }, []);

    const handleOpenImageLibrary = useCallback(() => {
        setScreen(GameScreen.IMAGE_LIBRARY)
    }, []);

    const handleOpenMenu = useCallback((targetScreen: GameScreen) => {
        setScreen(targetScreen);
    }, []);

    const handleGenerateContextualActions = useCallback(async () => {
        if (!character) return;
        setIsGeneratingActions(true);
        try {
            const terrain = getTerrainFromPosition(character.position);
            const actions = await geminiService.generateContextualActions(character, worldState, terrain);
            setContextualActions(actions);
        } catch (e) {
            console.error("Failed to generate contextual actions", e);
            setContextualActions(["Dò xét xung quanh", "Thiền định tại chỗ", "Kiểm tra trang bị"]); // Fallback
        } finally {
            setIsGeneratingActions(false);
        }
    }, [character, worldState]);

    const handleCreateGame = useCallback(async (name: string, playerClass: string, classDefinition: BaseStats | undefined, characterContext: string, worldPrompt: string, worldKeywords: string, difficulty: Difficulty, storyInfo?: { title: string; author: string }) => {
        
        // Use predefined world data instead of generating
        const backstory = await geminiService.generateBackstory(name, playerClass, `Bối cảnh thế giới: ${VAN_LINH_GIOI_DESCRIPTION}. ${characterContext}`);

        const worldFactions: Faction[] = VAN_LINH_GIOI_FACTIONS.map(f => ({ ...f, id: crypto.randomUUID(), store: [] }));
        
        // Generate store stocks in a single batch call
        try {
            const joinableFactions = worldFactions.filter(f => f.isJoinable);
            if (joinableFactions.length > 0) {
                const storeStocks = await geminiService.generateAllSectStoreStocks(joinableFactions);
                const storeMap = new Map(storeStocks.map(s => [s.factionName, s.storeItems]));
                worldFactions.forEach(faction => {
                    if (storeMap.has(faction.name)) {
                        faction.store = storeMap.get(faction.name)!.map(si => ({ ...si, id: crypto.randomUUID() }));
                    }
                });
            }
        } catch (e) {
            console.error("Failed to generate any sect store stocks, continuing with empty stores.", e);
        }

        const bestiary: MonsterTemplate[] = PREDEFINED_MONSTERS.map(m => ({ ...m, discovered: false }));

        // Generate dynamic NPCs for the predefined world
        const notableNpcs = await geminiService.generateDynamicEntities({
            name: VAN_LINH_GIOI_NAME,
            description: VAN_LINH_GIOI_DESCRIPTION,
            factions: worldFactions
        }, storyInfo);

        const factionNameToIdMap = new Map(worldFactions.map(f => [f.name, f.id]));
        const finalNpcs: NpcTemplate[] = notableNpcs.npcs.map(n => ({
            name: n.name,
            role: n.role,
            backstory: n.backstory,
            factionId: n.factionName ? factionNameToIdMap.get(n.factionName) || null : null,
        }));
        
        let newCharacter = createInitialCharacter(name, playerClass, classDefinition, worldFactions);
        newCharacter.backstory = backstory;
        
        try {
            const gearResult = await geminiService.generateStartingGear(VAN_LINH_GIOI_NAME, VAN_LINH_GIOI_DESCRIPTION, newCharacter, difficulty);
            newCharacter.inventory.push(...gearResult.gear);
            setOneTimeMessages([{ id: crypto.randomUUID(), text: gearResult.message, type: LogType.LOOT }]);
        } catch (e) {
            console.error("Failed to get starting gear, proceeding without one.", e);
            setOneTimeMessages([]);
        }

        const finalCharacter = await fullyUpdateCharacter(newCharacter);

        const newWorldState: WorldState = {
            name: VAN_LINH_GIOI_NAME,
            description: VAN_LINH_GIOI_DESCRIPTION,
            factions: worldFactions,
            bestiary: bestiary,
            notableNpcs: finalNpcs,
            pois: VAN_LINH_GIOI_POIS.map((poiData, index) => ({
                id: index + 1,
                coords: poiData.coords,
                type: poiData.type,
                region: poiData.region,
                name: poiData.name,
                description: poiData.description,
                isLoading: false,
                factionId: poiData.factionName ? factionNameToIdMap.get(poiData.factionName) || null : null,
                dungeonId: poiData.type === 'Lối Vào Bí Cảnh' ? `dungeon-${index}` : undefined
            })),
            dungeons: [],
        };

        const newAppSettings = { ...appSettings, difficulty };
        setAppSettings(newAppSettings);
        saveSettings(newAppSettings);

        setCharacter(finalCharacter);
        setWorldState(newWorldState);
        setScreen(GameScreen.WORLD);
    }, [appSettings]);

    const handleQuickPlay = useCallback(async () => {
        setIsQuickPlayLoading(true);
        try {
            const settings = await geminiService.generateQuickPlaySettings();
             // In quick play, we bypass the world designer and use the predefined world
             // but with the AI-generated character concept.
            await handleCreateGame(
                settings.name,
                settings.playerClass,
                undefined, // Quick play uses default classes
                settings.characterContext,
                "Sử dụng thế giới Vạn Linh Giới đã được định sẵn.", // Dummy prompts
                "tiên hiệp, chiến đấu, tu luyện",
                settings.difficulty
            );
        } catch (e) {
            console.error("Quick play failed", e);
            alert(`Không thể bắt đầu chơi nhanh: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setIsQuickPlayLoading(false);
        }
    }, [handleCreateGame]);

    const handleOpenTransientDialogue = useCallback(async (dialogue: DialogueState) => {
        if (!character) return;
        dialogue.affinity = 0;
        dialogue.options = [];

        const newChar = { ...character };
        const npcExists = newChar.metNpcs.some(npc => npc.name === dialogue.npcName);
        if (!npcExists) {
            newChar.metNpcs.push({
                name: dialogue.npcName,
                role: dialogue.npcRole,
                affinity: 0,
                imageUrl: dialogue.npcImageUrl,
            });
            setCharacter(await fullyUpdateCharacter(newChar));
        }

        setTransientDialogue(dialogue);
        setScreen(GameScreen.DIALOGUE);
    }, [character]);

    const handleStartCombat = useCallback(async (isBoss: boolean = false, forcedBossName?: string) => {
        if (!character || isStartingCombat) return;
        setIsStartingCombat(true);
        try {
            const newEnemy = isBoss
                ? await createBoss(character.level, imageLibrary, appSettings.difficulty, worldState, character.position, forcedBossName)
                : await createMonster(character.level, imageLibrary, appSettings.difficulty, worldState, character.position);
            setEnemy(newEnemy);
            setScreen(GameScreen.COMBAT);
        } catch (error) {
            console.error("Failed to create enemy and start combat:", error);
            setOneTimeMessages(prev => [...prev, {id: crypto.randomUUID(), text: "Gặp phải một luồng sát khí, nhưng nó đã biến mất ngay sau đó. Có vẻ bạn đã may mắn lần này.", type: LogType.NARRATIVE}]);
            setEnemy(null);
            setScreen(GameScreen.WORLD);
        } finally {
            setIsStartingCombat(false);
        }
    }, [character, imageLibrary, appSettings.difficulty, worldState, isStartingCombat]);

    const checkAndCompleteQuests = useCallback(async (char: Character, eventType: 'hunt' | 'gather', targetName?: string): Promise<{ updatedCharacter: Character; completionMessages: string[] }> => {
        let updatedCharacter = JSON.parse(JSON.stringify(char));
        const completionMessages: string[] = [];
    
        const activeQuests: Quest[] = updatedCharacter.quests.filter((q: Quest) => q.status === QuestStatus.ACTIVE);
    
        for (const quest of activeQuests) {
            let progressMade = false;
            const questTargetLower = quest.target.targetName.toLowerCase();

            if ((eventType === 'hunt' && (quest.type === QuestType.HUNT || quest.type === QuestType.SECT_JOIN || quest.type === QuestType.SECT_MISSION))) {
                 if(targetName && targetName.toLowerCase().includes(questTargetLower)) {
                     quest.target.current = Math.min(quest.target.count, quest.target.current + 1);
                     progressMade = true;
                 }
            } else if (eventType === 'gather' && quest.type === QuestType.GATHER) {
                if (Math.random() < 0.25) { // 25% chance to find a gather item on move
                    quest.target.current = Math.min(quest.target.count, quest.target.current + 1);
                    progressMade = true;
                    completionMessages.push(`Bạn đã tìm thấy 1 ${quest.target.targetName}! (${quest.target.current}/${quest.target.count})`);
                }
            }
    
            if (progressMade && quest.target.current >= quest.target.count) {
                quest.status = QuestStatus.COMPLETED;
                const completionText = await geminiService.generateQuestCompletionText(updatedCharacter, quest);
                completionMessages.push(`🌟 [Mục Tiêu Hoàn Thành] ${quest.title} 🌟`);
                completionMessages.push(completionText);
            }
        }
        
        return { updatedCharacter, completionMessages };
    }, []);

    const handleCombatEnd = useCallback(async (playerWon: boolean, finalPlayerState: Character, finalPetState: Pet | null, expGained: number, itemsDropped: Item[], materialsDropped: { [key in UpgradeMaterial]?: number }, consumablesDropped: { [key in UpgradeConsumable]?: number } = {}) => {
        if (!character || !enemy) return;
        let finalCharacter = { ...finalPlayerState, activeEffects: [] };

        let newWorldState = { ...worldState };
        const messagesForLog: ExplorationEventLog[] = [];
        
        const wasInDungeon = finalCharacter.currentDungeonId !== null;
        let dungeon: DungeonState | undefined;
        const oldRealmName = finalCharacter.realm.name;
        if (wasInDungeon) {
            dungeon = worldState.dungeons.find(d => d.id === finalCharacter.currentDungeonId);
        }

        if (!playerWon) {
            finalCharacter.currentHp = 1;
            messagesForLog.push({id: crypto.randomUUID(), text: "Bạn đã bị đánh bại...", type: LogType.COMBAT});
            if (wasInDungeon) {
                messagesForLog.push({id: crypto.randomUUID(), text: "...và bị trục xuất khỏi Bí Cảnh!", type: LogType.NARRATIVE});
                finalCharacter.currentDungeonId = null;
            }
        } else {
            const enemyOriginalName = enemy.originalName || enemy.name;
            let bestiaryIndex = newWorldState.bestiary.findIndex(m => m.name === enemyOriginalName);

            if (bestiaryIndex === -1) {
                const newTemplate: MonsterTemplate = {
                    name: enemyOriginalName,
                    description: `Một loài ${enemy.playerClass} được phát hiện lần đầu.`,
                    habitats: [getTerrainFromPosition(character.position)],
                    baseClass: enemy.playerClass,
                    discovered: true,
                    imageUrl: enemy.imageUrl,
                    imagePrompt: `A ${enemy.playerClass} named ${enemyOriginalName}`,
                    element: enemy.linhCan.elements[0] || Element.VO,
                };
                newWorldState.bestiary.push(newTemplate);
                messagesForLog.push({ id: crypto.randomUUID(), text: `[Sách Yêu Quái Đã Cập Nhật] Bạn đã phát hiện ra một loài yêu thú mới: ${enemyOriginalName}!`, type: LogType.QUEST });
            } else if (!newWorldState.bestiary[bestiaryIndex].discovered) {
                const monsterTemplate = newWorldState.bestiary[bestiaryIndex];
                newWorldState.bestiary[bestiaryIndex].discovered = true;
                messagesForLog.push({ id: crypto.randomUUID(), text: `[Sách Yêu Quái Đã Cập Nhật] Bạn đã thu thập thông tin về ${monsterTemplate.name}.`, type: LogType.QUEST });
            }

            if (enemy.isBoss) {
                 messagesForLog.push({ id: crypto.randomUUID(), text: `Bạn đã đánh bại một Hùng Chủ! Phần thưởng đặc biệt!`, type: LogType.COMBAT });
                 if (Math.random() < 0.25) {
                    try {
                        const skillDetails = await geminiService.generateSkillForSkillBook(finalCharacter);
                        const skillBook: Item = { id: crypto.randomUUID(), name: `Sách Kỹ Năng: ${skillDetails.name}`, description: `Một cuốn sách cổ chứa đựng bí thuật [${skillDetails.name}].`, type: ItemType.SKILL_BOOK, level: finalCharacter.level, rarity: Rarity.LEGENDARY, baseStats: {}, bonusStats: {}, upgradeLevel: 0, maxUpgrade: 0, history: [], evolved: false, skillDetails };
                        itemsDropped.push(skillBook);
                        messagesForLog.push({ id: crypto.randomUUID(), text: `Một quyển sách bí ẩn rơi ra! Bạn nhặt được [${skillBook.name}].`, type: LogType.LOOT });
                    } catch (e) { console.error("Failed to generate skill book", e); }
                }
            }
            if (Math.random() < 0.10) { 
                try {
                    const techniqueDetails = await geminiService.generateCultivationTechniqueDetails(finalCharacter);
                    const manual: Item = { id: crypto.randomUUID(), name: `Công Pháp: ${techniqueDetails.name}`, description: techniqueDetails.description, type: ItemType.CULTIVATION_MANUAL, level: finalCharacter.level, rarity: Rarity.EPIC, baseStats: {}, bonusStats: {}, upgradeLevel: 0, maxUpgrade: 0, history: [], evolved: false, cultivationTechniqueDetails: { ...techniqueDetails, level: 1 } };
                    itemsDropped.push(manual);
                    messagesForLog.push({ id: crypto.randomUUID(), text: `Bí kíp rơi ra! Bạn nhặt được [Công Pháp: ${manual.name}].`, type: LogType.LOOT });
                } catch (e) { console.error("Failed to generate cultivation manual", e); }
            }

            const { char: charAfterExp, messages: levelUpMessages, leveledUp } = await gainExp(finalCharacter, expGained);
            finalCharacter = charAfterExp;
            levelUpMessages.forEach(m => messagesForLog.push({id: crypto.randomUUID(), text: m, type: LogType.SYSTEM}));

            if (leveledUp) {
                const realmChanged = oldRealmName !== finalCharacter.realm.name;
                setLevelUpInfo({ newLevel: finalCharacter.level, realmChanged, newRealm: finalCharacter.realm.name });
            }

            if (finalPetState) {
                const petExpGained = Math.floor(expGained * 0.75);
                const { pet: petAfterExp, messages: petLevelUpMessages } = gainExpForPet(finalPetState, petExpGained);
                finalCharacter.pets = finalCharacter.pets.map(p => p.id === petAfterExp.id ? petAfterExp : p);
                petLevelUpMessages.forEach(m => messagesForLog.push({ id: crypto.randomUUID(), text: m, type: LogType.SYSTEM }));
            }

            itemsDropped.forEach(item => {
                if (appSettings.autoDismantleRarities[item.rarity]) {
                    const materialsGained = getDismantleResult(item);
                    messagesForLog.push({id: crypto.randomUUID(), text: `Tự động phân giải ${item.name} thành nguyên liệu.`, type: LogType.CRAFTING});
                     for (const [mat, amount] of Object.entries(materialsGained)) {
                        finalCharacter.materials[mat as UpgradeMaterial] = (finalCharacter.materials[mat as UpgradeMaterial] || 0) + amount;
                    }
                } else {
                    finalCharacter.inventory.push(item);
                }
            });

            for (const [mat, amount] of Object.entries(materialsDropped)) {
                finalCharacter.materials[mat as UpgradeMaterial] = (finalCharacter.materials[mat as UpgradeMaterial] || 0) + amount;
            }

            for (const [con, amount] of Object.entries(consumablesDropped)) {
                finalCharacter.consumables[con as UpgradeConsumable] = (finalCharacter.consumables[con as UpgradeConsumable] || 0) + amount;
            }
            
            const questProgress = await checkAndCompleteQuests(finalCharacter, 'hunt', enemy?.originalName || enemy?.name);
            finalCharacter = questProgress.updatedCharacter;
            if (questProgress.completionMessages.length > 0) messagesForLog.push(...questProgress.completionMessages.map(m => ({ id: crypto.randomUUID(), text: m, type: LogType.QUEST })));
            
            if (wasInDungeon && dungeon) {
                const floorIndex = dungeon.currentFloorIndex;
                const isLastFloor = floorIndex === dungeon.floors.length - 1;

                const newFloors = [...dungeon.floors];
                newFloors[floorIndex] = { ...newFloors[floorIndex], isCompleted: true };
                let newDungeon = { ...dungeon, floors: newFloors };

                if (isLastFloor) {
                    messagesForLog.push({ id: crypto.randomUUID(), text: `Bạn đã chinh phục ${dungeon.name}! Nhận được phần thưởng cuối cùng!`, type: LogType.QUEST });
                    const bonusItem = await generateItem(character.level, finalCharacter, Rarity.EPIC);
                    finalCharacter.inventory.push(bonusItem);
                    finalCharacter.currentDungeonId = null; 
                    newDungeon.isCleared = true; 
                }
                newWorldState.dungeons = newWorldState.dungeons.map(d => d.id === newDungeon.id ? newDungeon : d);
            }
        }
        
        const finalChar = await fullyUpdateCharacter(finalCharacter);
        setCharacter(finalChar);
        setWorldState(newWorldState);
        setOneTimeMessages(messagesForLog);
        setEnemy(null);
        setScreen(GameScreen.WORLD);
    }, [character, appSettings, enemy, worldState, checkAndCompleteQuests]);

    const handleOpenForge = useCallback((item?: Item, initialTab: ForgeScreenTab = 'forge') => {
        setItemInForge(item || null);
        setInitialForgeTab(initialTab);
        setScreen(GameScreen.FORGE);
    }, []);

    const handleCloseForge = useCallback(() => {
        setItemInForge(null);
        setScreen(GameScreen.WORLD);
    }, []);

    const handleUpgradeAttempt = useCallback(async (result: { updatedItem: Item, updatedCharacter: Character, message: string, isSuccess: boolean }) => {
        const charWithUpdatedItem = { ...result.updatedCharacter };

        const inventoryIndex = charWithUpdatedItem.inventory.findIndex(i => i.id === result.updatedItem.id);
        if (inventoryIndex > -1) {
            charWithUpdatedItem.inventory[inventoryIndex] = result.updatedItem;
        } else {
            for (const key in charWithUpdatedItem.equipment) {
                const itemType = key as ItemType;
                if (charWithUpdatedItem.equipment[itemType]?.id === result.updatedItem.id) {
                    charWithUpdatedItem.equipment[itemType] = result.updatedItem;
                    break;
                }
            }
        }
        
        const char = await fullyUpdateCharacter(charWithUpdatedItem);
        setCharacter(char);
        setItemInForge(result.updatedItem);
    }, []);

    const handleUpdateCharacterAndWorld = useCallback(async (updatedCharacter: Character, updatedWorldState: WorldState) => {
        const char = await fullyUpdateCharacter(updatedCharacter);
        setCharacter(char);
        setWorldState(updatedWorldState);
    }, []);

    const handlePlayerMove = useCallback(async (newPosition: { x: number; y: number }) => {
        if (!character) return;
        let newCharacter = { ...character, position: newPosition };
        const messages: ExplorationEventLog[] = [];
        const questProgress = await checkAndCompleteQuests(newCharacter, 'gather');
        newCharacter = questProgress.updatedCharacter;
        messages.push(...questProgress.completionMessages.map(m => ({ id: crypto.randomUUID(), text: m, type: LogType.QUEST })));
        
        if (Math.random() < appSettings.eventFrequency) {
            try {
                const terrain = getTerrainFromPosition(newPosition);
                const event = await geminiService.generateExploreEvent(newCharacter, worldState, terrain, appSettings.difficulty);
                messages.push({ id: crypto.randomUUID(), text: event.log, type: LogType.NARRATIVE, sources: event.groundingSources });
                if (event.type === 'ENEMY') setTimeout(() => handleStartCombat(false), 1500);
                else if (event.type === 'BOSS') setTimeout(() => handleStartCombat(true), 1500);
                else if (event.type === 'NPC') handleOpenTransientDialogue(event.dialogue);
                else if (event.type === 'ITEM') newCharacter.inventory.push(event.item);
            } catch(e) { console.error(e); }
        }
        setOneTimeMessages(messages);
        const finalChar = await fullyUpdateCharacter(newCharacter);
        setCharacter(finalChar);
    }, [character, worldState, appSettings, handleStartCombat, handleOpenTransientDialogue, checkAndCompleteQuests]);
    
    const handlePlayerRecover = useCallback(async () => {
        if (!character) return;
        if (character.currentHp === character.derivedStats.HP && character.currentMp === character.derivedStats.MP) {
            setOneTimeMessages([{ id: crypto.randomUUID(), text: "Bạn đang ở trạng thái đỉnh cao, không cần hồi phục.", type: LogType.SYSTEM }]);
            return;
        }
        const difficultyMods = DIFFICULTY_MODIFIERS[appSettings.difficulty];
        const messages: ExplorationEventLog[] = [];
        const hpToRecover = character.derivedStats.HP * 0.25 * difficultyMods.recoveryModifier;
        const mpToRecover = character.derivedStats.MP * 0.25 * difficultyMods.recoveryModifier;
        const newChar = { ...character };
        newChar.currentHp = Math.min(character.derivedStats.HP, character.currentHp + hpToRecover);
        newChar.currentMp = Math.min(character.derivedStats.MP, character.currentMp + mpToRecover);

        messages.push({ id: crypto.randomUUID(), text: `Bạn ngồi xuống thiền định, hồi phục ${Math.round(hpToRecover)} HP và ${Math.round(mpToRecover)} MP.`, type: LogType.NARRATIVE });

        if (Math.random() < appSettings.eventFrequency * 0.5) {
            try {
                const terrain = getTerrainFromPosition(character.position);
                const event = await geminiService.generateExploreEvent(newChar, worldState, terrain, appSettings.difficulty);
                messages.push({ id: crypto.randomUUID(), text: `Trong lúc hồi phục... ${event.log}`, type: LogType.NARRATIVE, sources: event.groundingSources });
                
                if (event.type === 'ENEMY') setTimeout(() => handleStartCombat(false), 1500);
                else if (event.type === 'BOSS') setTimeout(() => handleStartCombat(true), 1500);
                else if (event.type === 'NPC') handleOpenTransientDialogue(event.dialogue);
                else if (event.type === 'ITEM') newChar.inventory.push(event.item);
            } catch(e) { console.error(e); }
        }
        setOneTimeMessages(messages);
        const finalChar = await fullyUpdateCharacter(newChar);
        setCharacter(finalChar);
    }, [character, worldState, appSettings, handleStartCombat, handleOpenTransientDialogue]);

    const handleSaveGame = useCallback((slotId: number): boolean => {
        if (!character) return false;
        const saveFile: SaveFile = { character, appSettings, imageLibrary, worldState, saveDate: new Date().toISOString() };
        saveGame(slotId, saveFile);
        refreshSaveSlots();
        setOneTimeMessages([{ id: crypto.randomUUID(), text: `Đã lưu game vào Ô ${slotId + 1}.`, type: LogType.SYSTEM }]);
        return true;
    }, [character, appSettings, imageLibrary, worldState, refreshSaveSlots]);

    const handleLoadGame = useCallback((slotId: number) => {
        const file = loadGame(slotId);
        if (file) {
            setCharacter(file.character);
            setAppSettings(file.appSettings);
            setImageLibrary(file.imageLibrary || DEFAULT_IMAGE_LIBRARY);
            setWorldState(file.worldState);
            setScreen(GameScreen.WORLD);
            setOneTimeMessages([{ id: crypto.randomUUID(), text: `Đã tải game từ Ô ${slotId + 1}.`, type: LogType.SYSTEM }]);
        }
    }, []);

    const handleDeleteSave = useCallback((slotId: number) => {
        deleteSave(slotId);
        refreshSaveSlots();
    }, [refreshSaveSlots]);

    const handleSettingsChange = useCallback((newSettings: AppSettings) => {
        setAppSettings(newSettings);
        saveSettings(newSettings);
    }, []);
    
    const handleUpdateImageLibrary = useCallback((library: ImageLibraryItem[]) => setImageLibrary(library), []);

    const handleDiscoverPoi = useCallback(async (poiId: number) => {
        const poiIndex = worldState.pois.findIndex(p => p.id === poiId);
        if (poiIndex === -1 || worldState.pois[poiIndex].name) return;

        let newWorldState = JSON.parse(JSON.stringify(worldState));
        newWorldState.pois[poiIndex].isLoading = true;
        setWorldState(newWorldState);

        const poi = newWorldState.pois[poiIndex];
        try {
            const { name, description, imagePrompt, factionName } = await geminiService.generatePoiDetails(poi.type, poi.region, worldState.factions);
            const factionId = worldState.factions.find(f => f.name === factionName)?.id || null;
            
            newWorldState.pois[poiIndex] = { ...poi, name, description, imageUrl: undefined, isLoading: false, factionId };
            
            setWorldState(newWorldState);
            setOneTimeMessages(prev => [...prev, {id: crypto.randomUUID(), text: `Bạn đã khám phá ra: ${name}!`, type: LogType.NARRATIVE}]);
        } catch (e) {
            console.error("Failed to discover POI", e);
            newWorldState.pois[poiIndex].isLoading = false;
            setWorldState(newWorldState);
        }
    }, [worldState]);

    const handleOpenDialogue = useCallback(async (poiId: number) => {
        const poi = worldState.pois.find(p => p.id === poiId);
        if (!poi || !character) return;

        let newWorldState = JSON.parse(JSON.stringify(worldState));
        let poiInNewState = newWorldState.pois.find((p: Poi) => p.id === poiId)!;
        let newChar = { ...character };

        if (!poiInNewState.dialogue) {
            try {
                const faction = newWorldState.factions.find((f: Faction) => f.id === poiInNewState.factionId);
                const { name, role } = await geminiService.generateNpcDetails(poi, faction, newWorldState);
                
                poiInNewState.dialogue = {
                    npcName: name, npcRole: role, npcImageUrl: undefined,
                    history: [{ speaker: 'npc', text: `Chào mừng đến ${poi.name}. Ta là ${name}, ${role} ở đây.` }],
                    factionId: poi.factionId, factionName: faction?.name, affinity: character.npcAffinity[name] || 0,
                    options: [],
                };

                const npcExists = newChar.metNpcs.some(npc => npc.name === name);
                if (!npcExists) {
                    newChar.metNpcs.push({
                        name: name,
                        role: role,
                        factionName: faction?.name,
                        affinity: character.npcAffinity[name] || 0,
                        imageUrl: undefined,
                    });
                }
            } catch (e) { console.error("Failed to init dialogue", e); return; }
        }
        
        setWorldState(newWorldState);
        setCharacter(await fullyUpdateCharacter(newChar));
        setActivePoiIdForDialogue(poiId);
        setScreen(GameScreen.DIALOGUE);
    }, [worldState, character]);

    const handleCloseDialogue = useCallback(() => {
        setScreen(GameScreen.WORLD);
        setActivePoiIdForDialogue(null);
        setTransientDialogue(null);
    }, []);

    const handleSendDialogueMessage = useCallback(async (message: string) => {
        const poi = worldState.pois.find(p => p.id === activePoiIdForDialogue);
        if (!poi?.dialogue || !character) return;

        let newWorldState = JSON.parse(JSON.stringify(worldState));
        let poiInNewState = newWorldState.pois.find((p: Poi) => p.id === activePoiIdForDialogue)!;
        let dialogue = poiInNewState.dialogue!;
        dialogue.history.push({ speaker: 'player', text: message });
        dialogue.options = []; // Clear options while waiting for response

        setWorldState(newWorldState);

        const activeQuest = character.quests.find(q => q.giverPoiId === activePoiIdForDialogue && q.status === QuestStatus.COMPLETED);
        
        if (activeQuest) {
            const newChar = { ...character };
            const quest = newChar.quests.find(q => q.id === activeQuest.id)!;
            quest.status = QuestStatus.TURNED_IN;
            newChar.exp += quest.rewards.exp;
            
            let turnInMessage = `[Nhiệm vụ hoàn thành] Bạn nhận được ${quest.rewards.exp} EXP.`;
            
            if (quest.rewards.reputationChange) {
                quest.rewards.reputationChange.forEach(change => {
                    newChar.reputation[change.factionId] = (newChar.reputation[change.factionId] || 0) + change.amount;
                    const faction = worldState.factions.find(f => f.id === change.factionId);
                    if (faction) turnInMessage += ` Danh vọng ${faction.name} ${change.amount > 0 ? `+${change.amount}` : change.amount}.`;
                });
            }

            if (quest.rewards.contributionPoints) {
                newChar.sectContributionPoints += quest.rewards.contributionPoints;
                turnInMessage += ` Bạn nhận được ${quest.rewards.contributionPoints} điểm cống hiến.`;
            }

            if (quest.type === QuestType.SECT_JOIN) {
                newChar.sectId = quest.rewards.reputationChange![0].factionId;
                const faction = worldState.factions.find(f => f.id === newChar.sectId);
                newChar.sectRank = "Đệ tử ngoại môn";
                turnInMessage += `\nChúc mừng! Bạn đã chính thức trở thành một thành viên của ${faction?.name}!`;
            }

            dialogue.history.push({ speaker: 'npc', text: "Làm tốt lắm. Đây là phần thưởng của ngươi." });
            dialogue.history.push({ speaker: 'player', text: `[SYSTEM] ${turnInMessage}` });
            setWorldState(newWorldState);
            setCharacter(await fullyUpdateCharacter(newChar));
            return;
        }

        try {
            const aiResponse: DialogueAIResponse = await geminiService.continueDialogue(character, dialogue, newWorldState, appSettings.difficulty, activeQuest);
            
            let charAfterDialogue = { ...character };
            dialogue.history.push({ speaker: 'npc', text: aiResponse.responseText });
            dialogue.options = aiResponse.options || [];
            
            if (aiResponse.affinityChange) {
                dialogue.affinity += aiResponse.affinityChange;
                charAfterDialogue.npcAffinity[dialogue.npcName] = dialogue.affinity;

                const npcIndex = charAfterDialogue.metNpcs.findIndex(n => n.name === dialogue.npcName);
                if (npcIndex > -1) {
                    charAfterDialogue.metNpcs[npcIndex].affinity = dialogue.affinity;
                }
            }

            if (aiResponse.giveQuest && !character.quests.some(q => q.giverPoiId === activePoiIdForDialogue && q.status !== QuestStatus.TURNED_IN)) {
                const questDetails = await geminiService.generateQuestDetails(character, poi, appSettings.difficulty, newWorldState);
                const faction = worldState.factions.find(f => f.name === questDetails.reputationChange?.[0]?.factionName);
                const newQuest: Quest = {
                    id: crypto.randomUUID(), title: questDetails.title, description: questDetails.description, status: QuestStatus.ACTIVE,
                    type: questDetails.type, giverPoiId: poi.id,
                    target: { targetName: questDetails.targetName, count: questDetails.targetCount, current: 0 },
                    rewards: { exp: questDetails.rewardExp, reputationChange: faction && questDetails.reputationChange ? [{ factionId: faction.id, amount: questDetails.reputationChange[0].amount }] : [] }
                };
                charAfterDialogue.quests.push(newQuest);
                dialogue.history.push({ speaker: 'player', text: `[Nhiệm vụ đã nhận] ${newQuest.title}` });
            }

            setWorldState(newWorldState);
            setCharacter(await fullyUpdateCharacter(charAfterDialogue));
        } catch (e) {
            console.error(e);
            dialogue.history.push({ speaker: 'npc', text: "(AI đang gặp sự cố, vui lòng thử lại sau)" });
            setWorldState(newWorldState);
        }
    }, [activePoiIdForDialogue, character, worldState, appSettings.difficulty]);

    const handleContinueTransientDialogue = useCallback(async (message: string) => {
        if (!transientDialogue || !character) return;

        let newDialogueState = JSON.parse(JSON.stringify(transientDialogue));
        newDialogueState.history.push({ speaker: 'player', text: message });
        newDialogueState.options = []; // Clear options while waiting
        setTransientDialogue(newDialogueState);

        try {
            const aiResponse = await geminiService.continueTransientDialogue(character, newDialogueState, appSettings.difficulty);
            let charAfterDialogue = { ...character };
            newDialogueState.history.push({ speaker: 'npc', text: aiResponse.responseText });
            if (aiResponse.affinityChange) {
                newDialogueState.affinity += aiResponse.affinityChange;
                charAfterDialogue.npcAffinity[newDialogueState.npcName] = newDialogueState.affinity;
                
                const npcIndex = charAfterDialogue.metNpcs.findIndex(n => n.name === newDialogueState.npcName);
                if (npcIndex > -1) {
                    charAfterDialogue.metNpcs[npcIndex].affinity = newDialogueState.affinity;
                }
            }
            newDialogueState.options = aiResponse.options || [];
            setTransientDialogue(newDialogueState);
            setCharacter(await fullyUpdateCharacter(charAfterDialogue));
        } catch(e) {
            console.error(e);
            newDialogueState.history.push({ speaker: 'npc', text: "(AI đang gặp sự cố, vui lòng thử lại sau)" });
            setTransientDialogue(newDialogueState);
        }
    }, [character, transientDialogue, appSettings.difficulty]);

    const handleForgeNewItem = useCallback(async (options: ForgeOptions): Promise<{ newItem: Item | null, messages: string[] }> => {
        if (!character) return { newItem: null, messages: ["Nhân vật không tồn tại."] };
        
        try {
            const { forgedItem, forgeExp, charExp } = await geminiService.generateForgeResult(character, options);
            const newChar = { ...character };
            const messages: string[] = [];
            const newForgedItem: Item = {
                ...forgedItem,
                id: crypto.randomUUID(),
                history: [],
                evolved: false,
                upgradeLevel: 0,
            };
            
            // Add new item
            newChar.inventory.push(newForgedItem);
            
            // Handle costs
            if (options.method === 'items') {
                const auxIds = new Set(options.auxiliaryItems.map(i => i.id));
                newChar.inventory = newChar.inventory.filter(i => !auxIds.has(i.id));
            } else if (options.method === 'mp') {
                newChar.currentMp -= options.mpUsed;
            }

            // Handle EXP gains
            newChar.exp += charExp;
            newChar.forgingProficiency.exp += forgeExp;
            while (newChar.forgingProficiency.exp >= newChar.forgingProficiency.expToNextLevel) {
                newChar.forgingProficiency.exp -= newChar.forgingProficiency.expToNextLevel;
                newChar.forgingProficiency.level++;
                newChar.forgingProficiency.expToNextLevel = calculateForgingExpToNextLevel(newChar.forgingProficiency.level);
                messages.push(`Trình độ rèn đã tăng lên cấp ${newChar.forgingProficiency.level}!`);
            }
            
            setCharacter(await fullyUpdateCharacter(newChar));
            return { newItem: newForgedItem, messages };
        } catch (error) {
            console.error(error);
            throw error;
        }
    }, [character]);

    const clearLevelUpInfo = useCallback(() => setLevelUpInfo(null), []);

    const handleEnchantItem = useCallback(async (item: Item): Promise<{ updatedItem: Item, updatedCharacter: Character, message: string } | null> => {
        if (!character || (character.materials[UpgradeMaterial.LINH_HON_THACH] || 0) < 1 || character.currentMp < 50) return null;
        
        const newChar = { ...character };
        newChar.materials[UpgradeMaterial.LINH_HON_THACH] = (newChar.materials[UpgradeMaterial.LINH_HON_THACH] || 0) - 1;
        newChar.currentMp -= 50;

        const soulEffect = await geminiService.generateSoulEffect(item, newChar);
        const newItem = { ...item, soulEffect };

        const itemInInventoryIndex = newChar.inventory.findIndex(i => i.id === newItem.id);
        if (itemInInventoryIndex > -1) newChar.inventory[itemInInventoryIndex] = newItem;
        else {
            for (const key in newChar.equipment) {
                if (newChar.equipment[key as ItemType]?.id === newItem.id) {
                    newChar.equipment[key as ItemType] = newItem;
                    break;
                }
            }
        }
        
        const finalChar = await fullyUpdateCharacter(newChar);
        setCharacter(finalChar);

        return { updatedItem: newItem, updatedCharacter: finalChar, message: `Khảm Nạm thành công! Vật phẩm nhận được hiệu ứng [${soulEffect.name}]!` };
    }, [character]);

    const handleDismantleItem = useCallback(async (item: Item): Promise<{ materialsGained: { [key in UpgradeMaterial]?: number }, message: string } | null> => {
        if (!character) return null;
        
        const materialsGained = getDismantleResult(item);
        
        const newChar = { ...character };
        newChar.inventory = newChar.inventory.filter(i => i.id !== item.id);
        for(const key in newChar.equipment) if (newChar.equipment[key as ItemType]?.id === item.id) delete newChar.equipment[key as ItemType];

        for (const [mat, amount] of Object.entries(materialsGained)) newChar.materials[mat as UpgradeMaterial] = (newChar.materials[mat as UpgradeMaterial] || 0) + amount;

        const finalChar = await fullyUpdateCharacter(newChar);
        setCharacter(finalChar);
        
        let message = `Phân hủy ${item.name} thành công. Nhận được: `;
        const gainedParts = Object.entries(materialsGained).map(([mat, amount]) => `${amount}x ${mat}`);
        message += gainedParts.join(', ');
        
        return { materialsGained, message };
    }, [character]);
    
    const handleLearnCultivationTechnique = useCallback(async (item: Item) => {
        if (!character || !item.cultivationTechniqueDetails) return;
        const newChar = { ...character };
        const newTechnique: CultivationTechnique = {
            id: crypto.randomUUID(),
            level: 1, // Start at level 1
            ...item.cultivationTechniqueDetails
        };
        newChar.learnedCultivationTechniques = [...newChar.learnedCultivationTechniques, newTechnique];
        newChar.inventory = newChar.inventory.filter(i => i.id !== item.id);
        setCharacter(await fullyUpdateCharacter(newChar));
        setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn đã lĩnh hội được [${newTechnique.name}]!`, type: LogType.SYSTEM}]);
    }, [character]);

    const handleActivateCultivationTechnique = useCallback(async (techniqueId: string | null) => {
        if (!character) return;
        const newChar = { ...character, activeCultivationTechniqueId: techniqueId };
        setCharacter(await fullyUpdateCharacter(newChar));
    }, [character]);

    const handleLevelUpCultivationTechnique = useCallback(async (techniqueId: string): Promise<{success: boolean, message: string}> => {
        if (!character) return { success: false, message: "Nhân vật không tồn tại." };
        
        const newChar = { ...character };
        const techIndex = newChar.learnedCultivationTechniques.findIndex(t => t.id === techniqueId);
        if (techIndex === -1) return { success: false, message: "Không tìm thấy công pháp." };

        const tech = { ...newChar.learnedCultivationTechniques[techIndex] };
        if (tech.level >= tech.maxLevel) return { success: false, message: "Công pháp đã đạt cấp tối đa." };

        const levelUpCost = Math.floor(100 * Math.pow(tech.level, 1.8));

        if (newChar.exp < levelUpCost) {
            return { success: false, message: `Không đủ kinh nghiệm. Cần ${levelUpCost.toLocaleString()} EXP.` };
        }

        newChar.exp -= levelUpCost;
        tech.level++;

        // Update bonuses
        tech.bonusesPerLevel.forEach(bonusPerLevel => {
            const existingBonus = tech.bonuses.find(b => b.stat === bonusPerLevel.stat && b.isPercent === bonusPerLevel.isPercent);
            if (existingBonus) {
                existingBonus.value += bonusPerLevel.value;
            } else {
                tech.bonuses.push({ ...bonusPerLevel });
            }
        });

        newChar.learnedCultivationTechniques[techIndex] = tech;
        setCharacter(await fullyUpdateCharacter(newChar));

        return { success: true, message: `[${tech.name}] đã đột phá lên tầng ${tech.level}!` };
    }, [character]);

    const handleUseSkillBook = useCallback(async (item: Item) => {
        if (!character || !item.skillDetails) return;
        const newChar = { ...character };
        const newSkill: Skill = {
            id: crypto.randomUUID(),
            class: "Chung", // General skill
            ...item.skillDetails
        };
        newChar.skills.push(newSkill);
        newChar.inventory = newChar.inventory.filter(i => i.id !== item.id);
        setCharacter(await fullyUpdateCharacter(newChar));
        setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn đã học được kỹ năng mới: [${newSkill.name}]!`, type: LogType.SYSTEM}]);
    }, [character]);

    const handleJoinSectRequest = useCallback(async (factionId: string) => {
        if (!character) return;
        const faction = worldState.factions.find(f => f.id === factionId);
        if (!faction) return;
        const questDetails = await geminiService.generateSectJoiningQuest(character, faction, worldState);
        const newQuest: Quest = {
            id: crypto.randomUUID(),
            title: questDetails.title, description: questDetails.description,
            status: QuestStatus.ACTIVE, type: QuestType.SECT_JOIN,
            giverPoiId: worldState.pois.find(p => p.factionId === factionId)?.id || 0,
            target: { targetName: questDetails.targetName, count: questDetails.targetCount, current: 0 },
            rewards: { exp: character.level * 50, reputationChange: [{ factionId, amount: 25 }] }
        };
        const newChar = { ...character, quests: [...character.quests, newQuest] };
        setCharacter(await fullyUpdateCharacter(newChar));
        setOneTimeMessages([{id: crypto.randomUUID(), text: `[Nhiệm vụ đã nhận] ${newQuest.title}`, type: LogType.QUEST}]);
    }, [character, worldState]);

    const handleRequestSectMission = useCallback(async () => {
        if (!character || !character.sectId) return;
        const faction = worldState.factions.find(f => f.id === character.sectId);
        if (!faction) return;
        const missionDetails = await geminiService.generateSectMission(character, faction);
        const newMission: Quest = {
            ...missionDetails,
            id: crypto.randomUUID(),
            status: QuestStatus.ACTIVE,
            giverPoiId: worldState.pois.find(p => p.factionId === faction.id)?.id || 0,
        };
        const newChar = { ...character, quests: [...character.quests, newMission] };
        setCharacter(await fullyUpdateCharacter(newChar));
    }, [character, worldState]);

    const handleContributeItemToSect = useCallback(async (item: Item): Promise<{ pointsGained: number; message: string; }> => {
        if (!character || !character.sectId) throw new Error("Not in a sect.");
        const faction = worldState.factions.find(f => f.id === character.sectId)!;
        const { points } = await geminiService.evaluateItemContribution(item, faction);
        const newChar = { ...character };
        newChar.inventory = newChar.inventory.filter(i => i.id !== item.id);
        newChar.sectContributionPoints += points;
        setCharacter(await fullyUpdateCharacter(newChar));
        return { pointsGained: points, message: `Cống hiến ${item.name}, nhận được ${points} điểm cống hiến.` };
    }, [character, worldState.factions]);

    const handleBuyFromSectStore = useCallback(async (storeItem: SectStoreItem): Promise<{ message: string; }> => {
        if (!character || character.sectContributionPoints < storeItem.cost) throw new Error("Not enough contribution points.");
        const newChar = { ...character };
        newChar.sectContributionPoints -= storeItem.cost;
        const newItem: Item = {
            ...storeItem.item,
            id: crypto.randomUUID(),
            history: [],
            evolved: false,
            upgradeLevel: 0,
        };
        newChar.inventory.push(newItem);
        setCharacter(await fullyUpdateCharacter(newChar));
        return { message: `Đổi thành công [${newItem.name}]!` };
    }, [character]);

    const handleAllocateStatPoint = useCallback(async (stat: Stat) => {
        if (!character || (character.unallocatedStatPoints || 0) <= 0) return;

        const newChar = { ...character };
        newChar.unallocatedStatPoints = (newChar.unallocatedStatPoints || 1) - 1;
        newChar.baseStats[stat as keyof BaseStats] += 1;
        
        const finalChar = await fullyUpdateCharacter(newChar);
        setCharacter(finalChar);
    }, [character]);
    
    const handleCraftTalisman = useCallback(async (): Promise<{ success: boolean; message: string; }> => {
        if (!character) return { success: false, message: "Nhân vật không tồn tại." };

        const TALISMAN_CRAFT_COST = {
            [UpgradeMaterial.LINH_HON_THACH]: 1,
            [UpgradeMaterial.TINH_THACH_HA_PHAM]: 5,
            MP: 50
        };

        const hasLinhHonThach = (character.materials[UpgradeMaterial.LINH_HON_THACH] || 0) >= TALISMAN_CRAFT_COST[UpgradeMaterial.LINH_HON_THACH];
        const hasTinhThach = (character.materials[UpgradeMaterial.TINH_THACH_HA_PHAM] || 0) >= TALISMAN_CRAFT_COST[UpgradeMaterial.TINH_THACH_HA_PHAM];
        const hasMp = character.currentMp >= TALISMAN_CRAFT_COST.MP;

        if (!hasLinhHonThach || !hasTinhThach || !hasMp) {
            return { success: false, message: "Không đủ nguyên liệu hoặc linh lực." };
        }

        const newChar = { ...character };
        newChar.materials[UpgradeMaterial.LINH_HON_THACH] = (newChar.materials[UpgradeMaterial.LINH_HON_THACH] || 0) - TALISMAN_CRAFT_COST[UpgradeMaterial.LINH_HON_THACH];
        newChar.materials[UpgradeMaterial.TINH_THACH_HA_PHAM] = (newChar.materials[UpgradeMaterial.TINH_THACH_HA_PHAM] || 0) - TALISMAN_CRAFT_COST[UpgradeMaterial.TINH_THACH_HA_PHAM];
        newChar.currentMp -= TALISMAN_CRAFT_COST.MP;
        newChar.consumables[UpgradeConsumable.LINH_THU_PHU] = (newChar.consumables[UpgradeConsumable.LINH_THU_PHU] || 0) + 1;
        
        setCharacter(await fullyUpdateCharacter(newChar));
        return { success: true, message: `Chế tạo thành công 1x ${UpgradeConsumable.LINH_THU_PHU}!` };

    }, [character]);

    const handleDesignWorldComplete = useCallback((analysisResults: any, summary: { prompt: string; keywords: string; }, storyInfo?: { title: string; author: string; }) => {
        setDesignedWorldPrompt(summary);
        setDesignedWorldStoryInfo(storyInfo || null);
        setScreen(GameScreen.CREATOR);
    }, []);

    const handleEquipItem = useCallback(async (itemToEquip: Item) => {
        if (!character) return;
        const newCharacter = JSON.parse(JSON.stringify(character));
        const currentEquipped = newCharacter.equipment[itemToEquip.type];
        const inventoryWithoutItem = newCharacter.inventory.filter((i: Item) => i.id !== itemToEquip.id);
        
        if (currentEquipped) {
            inventoryWithoutItem.push(currentEquipped);
        }
        
        newCharacter.equipment[itemToEquip.type] = itemToEquip;
        newCharacter.inventory = inventoryWithoutItem;
        
        setCharacter(await fullyUpdateCharacter(newCharacter));
    }, [character]);

    const handleUnequipItem = useCallback(async (itemType: ItemType) => {
        if (!character) return;
        const newCharacter = JSON.parse(JSON.stringify(character));
        const itemToUnequip = newCharacter.equipment[itemType];
        if (itemToUnequip) {
            delete newCharacter.equipment[itemType];
            newCharacter.inventory.push(itemToUnequip);
            setCharacter(await fullyUpdateCharacter(newCharacter));
        }
    }, [character]);
    
    // Pet actions
    const handleSetActivePet = useCallback(async (petId: string | null) => {
        if (!character) return;
        const newChar = { ...character };
        newChar.pets = newChar.pets.map(p => ({ ...p, status: p.id === petId ? PetStatus.FOLLOWING : PetStatus.IDLE }));
        newChar.activePetId = petId;
        setCharacter(await fullyUpdateCharacter(newChar));
    }, [character]);

    const handleRenamePet = useCallback(async (petId: string, newName: string) => {
        if (!character) return;
        const newChar = { ...character };
        const petIndex = newChar.pets.findIndex(p => p.id === petId);
        if (petIndex > -1) {
            newChar.pets[petIndex].name = newName;
            setCharacter(await fullyUpdateCharacter(newChar));
        }
    }, [character]);

    const handleReleasePet = useCallback(async (petId: string) => {
        if (!character) return;
        if (!window.confirm("Bạn có chắc muốn thả thú cưng này về tự nhiên không?")) return;
        
        const newChar = { ...character };
        newChar.pets = newChar.pets.filter(p => p.id !== petId);
        if (newChar.activePetId === petId) {
            newChar.activePetId = null;
        }
        setCharacter(await fullyUpdateCharacter(newChar));
    }, [character]);
    
    const handleFeedPet = useCallback(async (petId: string) => {
        if (!character) throw new Error("Character not found.");
        if ((character.consumables[UpgradeConsumable.LINH_THU_THUC] || 0) < 1) {
            throw new Error("Không đủ Linh Thú Thực.");
        }
        
        const newChar = { ...character };
        const petIndex = newChar.pets.findIndex(p => p.id === petId);
        if (petIndex > -1) {
            newChar.consumables[UpgradeConsumable.LINH_THU_THUC]! -= 1;
            const pet = { ...newChar.pets[petIndex] };
            const loyaltyGain = Math.floor(Math.random() * 5) + 1;
            pet.loyalty = Math.min(100, pet.loyalty + loyaltyGain);
            
            try {
                const loyaltyDesc = await geminiService.generateLoyaltyDescription(pet.name, pet.loyalty, pet.monsterClass);
                pet.loyaltyDescription = loyaltyDesc.description;
                pet.oneWordStatus = loyaltyDesc.oneWordStatus;
            } catch(e) { console.error("Failed to generate loyalty description", e); }

            newChar.pets[petIndex] = pet;
            setCharacter(await fullyUpdateCharacter(newChar));
            setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn cho ${pet.name} ăn. Độ trung thành tăng lên ${loyaltyGain}!`, type: LogType.SYSTEM}]);
        }
    }, [character]);

    const handleEvolvePet = useCallback(async (petId: string) => {
        if (!character) throw new Error("Character not found.");
        const petToEvolve = character.pets.find(p => p.id === petId);
        if (!petToEvolve) throw new Error("Pet not found.");
        if (petToEvolve.isEvolved) throw new Error("Pet has already evolved.");
        if (petToEvolve.level < PET_EVOLUTION_LEVEL) throw new Error(`Pet must be at least level ${PET_EVOLUTION_LEVEL}.`);
        
        const newChar = { ...character };
        for (const [mat, cost] of Object.entries(PET_EVOLUTION_COST)) {
            if ((newChar.materials[mat as UpgradeMaterial] || 0) < cost) {
                throw new Error(`Not enough ${mat}.`);
            }
            newChar.materials[mat as UpgradeMaterial]! -= cost;
        }

        const petIndex = newChar.pets.findIndex(p => p.id === petId);
        let pet = { ...newChar.pets[petIndex] };

        try {
            const evoDetails = await geminiService.generatePetEvolutionDetails(pet);
            
            pet.name = evoDetails.newName;
            pet.isEvolved = true;
            pet.evolutionLevel = (pet.evolutionLevel || 0) + 1;
            Object.entries(evoDetails.statBoosts).forEach(([stat, boost]) => {
                if (boost) {
                  pet.baseStats[stat as keyof BaseStats] += boost;
                }
            });
            const newSkill: Skill = {
                ...evoDetails.newPassiveSkill,
                id: crypto.randomUUID(),
                class: pet.monsterClass,
            };
            pet.skills.push(newSkill);

            pet = fullyUpdatePet(pet);
            newChar.pets[petIndex] = pet;
            setCharacter(await fullyUpdateCharacter(newChar));
            setOneTimeMessages([{id: crypto.randomUUID(), text: `🌟 ${petToEvolve.name} tiến hóa thành ${pet.name}! Nó đã học được kỹ năng mới: [${newSkill.name}]!`, type: LogType.SYSTEM}]);
        } catch (e) {
            console.error(e);
            throw new Error(`Pet evolution failed: ${e instanceof Error ? e.message : String(e)}`);
        }
    }, [character]);

    const handleCatchPet = useCallback(async (): Promise<{ success: boolean; message: string; }> => {
        if (!character || !enemy) return { success: false, message: "Invalid state for catching pet." };
        if ((character.consumables[UpgradeConsumable.LINH_THU_PHU] || 0) < 1) {
            return { success: false, message: "Không có Linh Thú Phù!" };
        }

        const newChar = { ...character };
        newChar.consumables[UpgradeConsumable.LINH_THU_PHU]! -= 1;

        const healthPercent = (enemy.currentHp / enemy.derivedStats.HP);
        const levelDifference = enemy.level - character.level;
        let baseCatchRate = 50; // 50% base rate
        baseCatchRate -= healthPercent * 40; // up to 40% reduction for full health
        baseCatchRate -= levelDifference * 3; // 3% reduction per level higher
        const finalCatchRate = Math.max(5, Math.min(95, baseCatchRate));

        if (Math.random() * 100 < finalCatchRate) {
            const petData = convertMonsterToPet(enemy);
            const loyaltyDesc = await geminiService.generateLoyaltyDescription(petData.name, petData.loyalty, petData.monsterClass);
            const newPet: Pet = { ...petData, loyaltyDescription: loyaltyDesc.description, oneWordStatus: loyaltyDesc.oneWordStatus };

            newChar.pets.push(newPet);
            setCharacter(await fullyUpdateCharacter(newChar));
            setEnemy(null);
            setScreen(GameScreen.WORLD);
            setOneTimeMessages([{id: crypto.randomUUID(), text: `Thu phục thành công! ${enemy.name} đã trở thành thú cưng của bạn.`, type: LogType.SYSTEM}]);
            return { success: true, message: `Thu phục thành công! ${enemy.name} đã trở thành thú cưng của bạn.` };
        } else {
            setCharacter(await fullyUpdateCharacter(newChar));
            return { success: false, message: `${enemy.name} đã phá vỡ Linh Thú Phù và thoát ra!` };
        }
    }, [character, enemy]);

    const handleEnslaveTarget = useCallback(async (): Promise<{ success: boolean; message: string; }> => {
        if (!character || !enemy) return { success: false, message: "Trạng thái không hợp lệ." };
        if ((character.consumables[UpgradeConsumable.HON_AN_PHU] || 0) < 1) {
            return { success: false, message: "Không có Hồn Ấn Phù!" };
        }

        const newChar = { ...character };
        newChar.consumables[UpgradeConsumable.HON_AN_PHU]! -= 1;
        
        const healthPercent = (enemy.currentHp / enemy.derivedStats.HP);
        if (!enemy.isHumanoid || healthPercent > 0.2) {
            setCharacter(await fullyUpdateCharacter(newChar));
            return { success: false, message: "Mục tiêu không phù hợp hoặc còn quá mạnh." };
        }

        const levelDifference = enemy.level - character.level;
        let baseSuccessRate = 40; // 40% base rate
        baseSuccessRate -= healthPercent * 30; // up to 6% reduction
        baseSuccessRate -= levelDifference * 2; // 2% reduction per level higher
        const finalSuccessRate = Math.max(5, Math.min(95, baseSuccessRate));

        if (Math.random() * 100 < finalSuccessRate) {
            const newServant: Servant = convertEnemyToServant(enemy);
            newChar.servants.push(newServant);

            setCharacter(await fullyUpdateCharacter(newChar));
            setEnemy(null);
            setScreen(GameScreen.WORLD);
            setOneTimeMessages([{id: crypto.randomUUID(), text: `Nô Dịch thành công! ${enemy.name} đã quy phục.`, type: LogType.SYSTEM}]);
            return { success: true, message: `Nô Dịch thành công! ${enemy.name} đã quy phục.` };
        } else {
            setCharacter(await fullyUpdateCharacter(newChar));
            return { success: false, message: `${enemy.name} đã chống cự lại Hồn Ấn Phù!` };
        }
    }, [character, enemy]);

    const handleSetActiveRetainer = useCallback(async (retainerId: string | null) => {
        if (!character) return;
        const newChar = { ...character, activeRetainerId: retainerId };
        setCharacter(await fullyUpdateCharacter(newChar));
    }, [character]);

    const handleAssignServantTask = useCallback(async (servantId: string, task: ServantTask) => {
        if (!character) return;
        const newChar = { ...character };
        const servantIndex = newChar.servants.findIndex(s => s.id === servantId);
        if (servantIndex > -1) {
            newChar.servants[servantIndex].task = task;
            const finalChar = await fullyUpdateCharacter(newChar);
            setCharacter(finalChar);
            setOneTimeMessages([{id: crypto.randomUUID(), text: `${newChar.servants[servantIndex].name} đã bắt đầu nhiệm vụ ${task}.`, type: LogType.SYSTEM}]);
        }
    }, [character]);
    
    const handleCraftHonAnPhu = useCallback(async (): Promise<{ success: boolean; message: string; }> => {
        if (!character) return { success: false, message: "Nhân vật không tồn tại." };

        const CRAFT_COST = {
            [UpgradeMaterial.LINH_HON_THACH]: 2,
            [UpgradeMaterial.TINH_THACH_TRUNG_PHAM]: 5,
            MP: 100
        };

        const hasLinhHonThach = (character.materials[UpgradeMaterial.LINH_HON_THACH] || 0) >= CRAFT_COST[UpgradeMaterial.LINH_HON_THACH];
        const hasTinhThach = (character.materials[UpgradeMaterial.TINH_THACH_TRUNG_PHAM] || 0) >= CRAFT_COST[UpgradeMaterial.TINH_THACH_TRUNG_PHAM];
        const hasMp = character.currentMp >= CRAFT_COST.MP;

        if (!hasLinhHonThach || !hasTinhThach || !hasMp) {
            return { success: false, message: "Không đủ nguyên liệu hoặc linh lực." };
        }

        const newChar = { ...character };
        newChar.materials[UpgradeMaterial.LINH_HON_THACH] = (newChar.materials[UpgradeMaterial.LINH_HON_THACH] || 0) - CRAFT_COST[UpgradeMaterial.LINH_HON_THACH];
        newChar.materials[UpgradeMaterial.TINH_THACH_TRUNG_PHAM] = (newChar.materials[UpgradeMaterial.TINH_THACH_TRUNG_PHAM] || 0) - CRAFT_COST[UpgradeMaterial.TINH_THACH_TRUNG_PHAM];
        newChar.currentMp -= CRAFT_COST.MP;
        newChar.consumables[UpgradeConsumable.HON_AN_PHU] = (newChar.consumables[UpgradeConsumable.HON_AN_PHU] || 0) + 1;
        
        setCharacter(await fullyUpdateCharacter(newChar));
        return { success: true, message: `Chế tạo thành công 1x ${UpgradeConsumable.HON_AN_PHU}!` };

    }, [character]);

    // Dungeon actions
    const handleEnterDungeon = useCallback(async (poiId: number) => {
        if (!character) return;
        const poi = worldState.pois.find(p => p.id === poiId);
        if (!poi || !poi.dungeonId) return;

        let newWorldState = { ...worldState };
        let dungeon = newWorldState.dungeons.find(d => d.id === poi.dungeonId);

        if (!dungeon) {
            try {
                const theme = `Dungeon near ${poi.name} in ${poi.region}`;
                const dungeonDetails = await geminiService.generateDungeonDetails(character, theme);
                dungeon = {
                    ...dungeonDetails,
                    id: poi.dungeonId,
                    currentFloorIndex: 0,
                    isCleared: false,
                };
                newWorldState.dungeons.push(dungeon);
            } catch(e) {
                console.error("Failed to generate dungeon", e);
                setOneTimeMessages([{id: crypto.randomUUID(), text: "Không thể tiến vào Bí Cảnh lúc này.", type: LogType.SYSTEM}]);
                return;
            }
        }

        const newChar = { ...character, currentDungeonId: poi.dungeonId };
        setCharacter(await fullyUpdateCharacter(newChar));
        setWorldState(newWorldState);
        setScreen(GameScreen.DUNGEON);
    }, [character, worldState]);

    const handleProceedInDungeon = useCallback(async () => {
        if (!character || !character.currentDungeonId) return;
        const dungeon = worldState.dungeons.find(d => d.id === character.currentDungeonId);
        if (!dungeon) return;

        const currentFloor = dungeon.floors[dungeon.currentFloorIndex];
        const newDungeon = { ...dungeon };

        switch (currentFloor.type) {
            case DungeonFloorType.COMBAT:
                handleStartCombat(false);
                break;
            case DungeonFloorType.ELITE_COMBAT:
                const elite = await createMonster(dungeon.level, imageLibrary, appSettings.difficulty, worldState, character.position, { forcedRank: MonsterRank.TinhAnh, fixedLevel: dungeon.level + 2 });
                setEnemy(elite);
                setScreen(GameScreen.COMBAT);
                break;
            case DungeonFloorType.BOSS:
                 const boss = await createMonster(dungeon.level, imageLibrary, appSettings.difficulty, worldState, character.position, { forcedRank: MonsterRank.ThủLĩnh, fixedLevel: dungeon.level + 5 });
                setEnemy(boss);
                setScreen(GameScreen.COMBAT);
                break;
            case DungeonFloorType.TREASURE:
                const item = await generateItem(dungeon.level, character);
                const newChar = { ...character };
                newChar.inventory.push(item);
                setCharacter(await fullyUpdateCharacter(newChar));
                setOneTimeMessages([{id: crypto.randomUUID(), text: `Bạn tìm thấy một rương báu và nhận được [${item.name}]!`, type: LogType.LOOT}]);
                newDungeon.floors[dungeon.currentFloorIndex].isCompleted = true;
                if (dungeon.currentFloorIndex < dungeon.floors.length - 1) newDungeon.currentFloorIndex++;
                setWorldState({...worldState, dungeons: worldState.dungeons.map(d => d.id === dungeon.id ? newDungeon : d)});
                break;
            case DungeonFloorType.EMPTY:
            default:
                newDungeon.floors[dungeon.currentFloorIndex].isCompleted = true;
                 if (dungeon.currentFloorIndex < dungeon.floors.length - 1) newDungeon.currentFloorIndex++;
                setWorldState({...worldState, dungeons: worldState.dungeons.map(d => d.id === dungeon.id ? newDungeon : d)});
                break;
        }
    }, [character, worldState, appSettings.difficulty, imageLibrary, handleStartCombat]);

    const handleExitDungeon = useCallback(async (force = false) => {
        if (!character) return;
        if (!force && !window.confirm("Bạn có muốn rời khỏi Bí Cảnh không? Mọi tiến trình trong tầng hiện tại sẽ bị mất.")) return;

        const newChar = { ...character, currentDungeonId: null };
        setCharacter(await fullyUpdateCharacter(newChar));
        setScreen(GameScreen.WORLD);
    }, [character]);

    const value: GameContextType = {
        screen,
        character,
        enemy,
        itemInForge,
        initialForgeTab,
        imageLibrary,
        appSettings,
        worldState,
        saveSlots,
        isFullscreen,
        activePoiIdForDialogue,
        transientDialogue,
        oneTimeMessages,
        designedWorldPrompt,
        designedWorldStoryInfo,
        contextualActions,
        isGeneratingActions,
        isQuickPlayLoading,
        levelUpInfo,
        clearLevelUpInfo,
        setScreen,
        handleCreateGame,
        handleQuickPlay,
        handleStartCombat,
        handleCombatEnd,
        handleOpenForge,
        handleCloseForge,
        handleUpgradeAttempt,
        handleUpdateCharacterAndWorld,
        handlePlayerMove,
        handlePlayerRecover,
        handleSaveGame,
        handleLoadGame,
        handleDeleteSave,
        handleSettingsChange,
        handleUpdateImageLibrary,
        handleToggleFullscreen,
        handleBackToMenu,
        handleOpenImageLibrary,
        handleOpenMenu,
        handleStartNewGame,
        refreshSaveSlots,
        handleDiscoverPoi,
        handleOpenDialogue,
        handleCloseDialogue,
        handleSendDialogueMessage,
        handleForgeNewItem,
        handleEnchantItem,
        handleDismantleItem,
        setOneTimeMessages,
        handleOpenTransientDialogue,
        handleContinueTransientDialogue,
        handleLearnCultivationTechnique,
        handleActivateCultivationTechnique,
        handleLevelUpCultivationTechnique,
        handleUseSkillBook,
        handleJoinSectRequest,
        handleRequestSectMission,
        handleContributeItemToSect,
        handleBuyFromSectStore,
        handleDesignWorldComplete,
        handleAllocateStatPoint,
        handleCraftTalisman,
        handleGenerateContextualActions,
        handleCatchPet,
        handleEquipItem,
        handleUnequipItem,
        handleEnslaveTarget,
        handleSetActiveRetainer,
        handleAssignServantTask,
        handleCraftHonAnPhu,
        handleSetActivePet,
        handleRenamePet,
        handleReleasePet,
        handleFeedPet,
        handleEvolvePet,
        handleEnterDungeon,
        handleProceedInDungeon,
        handleExitDungeon,
    };

    return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
