import type { Dispatch, SetStateAction } from 'react';

export enum GameScreen {
    MENU = 'MENU',
    CREATOR = 'CREATOR',
    WORLD_DESIGNER = 'WORLD_DESIGNER',
    WORLD = 'WORLD',
    COMBAT = 'COMBAT',
    FORGE = 'FORGE',
    IMAGE_LIBRARY = 'IMAGE_LIBRARY',
    SETTINGS = 'SETTINGS',
    SAVE_MANAGEMENT = 'SAVE_MANAGEMENT',
    DIALOGUE = 'DIALOGUE',
    DUNGEON = 'DUNGEON',
}

export enum PlayerClass {
    THE_TU = 'Thể Tu',
    PHAP_TU = 'Pháp Tu',
    KIEM_TU = 'Kiếm Tu',
}

export enum Stat {
    // Base Stats
    STR = 'STR', // Strength
    AGI = 'AGI', // Agility
    INT = 'INT', // Intelligence
    SPI = 'SPI', // Spirit
    CON = 'CON', // Constitution
    DEX = 'DEX', // Dexterity

    // Derived Stats
    HP = 'HP',
    MP = 'MP',
    ATK = 'ATK',
    MATK = 'MATK',
    DEF = 'DEF',
    SPEED = 'Speed',
    PENETRATION = 'Penetration',
    EVASION = 'Evasion',
    CRIT_RATE = 'Crit Rate',
    ACCURACY = 'Accuracy',
    LIFESTEAL = 'Lifesteal',
    ATK_SPEED = 'Attack Speed',
    
    // Elemental Bonuses
    FIRE_DMG_BONUS = 'Fire Damage Bonus',
    WATER_DMG_BONUS = 'Water Damage Bonus',
    WOOD_DMG_BONUS = 'Wood Damage Bonus',
    METAL_DMG_BONUS = 'Metal Damage Bonus',
    EARTH_DMG_BONUS = 'Earth Damage Bonus',
    FIRE_RES = 'Fire Resistance',
    WATER_RES = 'Water Resistance',
    WOOD_RES = 'Wood Resistance',
    METAL_RES = 'Metal Resistance',
    EARTH_RES = 'Earth Resistance',
}

export enum Rarity {
    COMMON = 'Common',
    UNCOMMON = 'Uncommon',
    RARE = 'Rare',
    EPIC = 'Epic',
    LEGENDARY = 'Legendary',
    MYTHIC = 'Mythic',
}

export enum ItemType {
    WEAPON = 'Weapon',
    ARMOR = 'Armor',
    RING = 'Ring',
    AMULET = 'Amulet',
    CULTIVATION_MANUAL = 'Công Pháp',
    SKILL_BOOK = 'Sách Kỹ Năng',
}

export enum UpgradeMaterial {
    TINH_THACH_HA_PHAM = 'Tinh Thạch Hạ Phẩm',
    TINH_THACH_TRUNG_PHAM = 'Tinh Thạch Trung Phẩm',
    TINH_THACH_CAO_PHAM = 'Tinh Thạch Cao Phẩm',
    LINH_HON_THACH = 'Linh Hồn Thạch',
}

export enum UpgradeConsumable {
    BUA_SAO = 'Búa Sao',
    BOT_THAN_TUY = 'Bột Thần Túy',
    LINH_THU_PHU = 'Linh Thú Phù',
    LINH_THU_THUC = 'Linh Thú Thực',
    HON_AN_PHU = 'Hồn Ấn Phù',
}

export enum SkillType {
    ACTIVE = 'Chủ động',
    PASSIVE = 'Bị động',
}

export enum TargetType {
    SELF = 'SELF',
    ENEMY = 'ENEMY',
    ALLY = 'ALLY',
    ALL_ALLIES = 'ALL_ALLIES',
    ALL_ENEMIES = 'ALL_ENEMIES',
}

export enum SkillEffectType {
    DAMAGE = 'DAMAGE',
    HEAL = 'HEAL',
    BUFF = 'BUFF',
    DEBUFF = 'DEBUFF',
    DOT = 'DOT', // Damage Over Time
    HOT = 'HOT', // Heal Over Time
    STUN = 'STUN',
    DISABLE_SKILL = 'DISABLE_SKILL',
    SUMMON = 'SUMMON',
}

export enum TerrainType {
    PLAIN = 'Đồng Bằng',
    FOREST = 'Rừng Rậm',
    MOUNTAIN = 'Dãy Núi',
    VILLAGE = 'Làng Mạc',
    WATER = 'Sông Nước',
    VOLCANO = 'Núi Lửa',
}

export enum Difficulty {
    EASY = 'Dễ',
    NORMAL = 'Thường',
    HARD = 'Khó',
    HELL = 'Địa Ngục',
}

export enum QuestStatus {
    AVAILABLE = 'AVAILABLE',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    TURNED_IN = 'TURNED_IN',
}

export enum QuestType {
    HUNT = 'HUNT',
    GATHER = 'GATHER',
    SECT_JOIN = 'SECT_JOIN',
    SECT_MISSION = 'SECT_MISSION',
}

export enum AffixId {
    LIFESTEAL = 'LIFESTEAL',
    ECHO_DAMAGE = 'ECHO_DAMAGE',
}

export enum PetStatus {
    IDLE = 'IDLE',
    FOLLOWING = 'FOLLOWING',
    IN_COMBAT = 'IN_COMBAT',
}

export enum MonsterRank {
    Thường = 'Thường',
    TinhAnh = 'Tinh Anh',
    ThủLĩnh = 'Thủ Lĩnh',
    HùngChủ = 'Hùng Chủ',
}

export enum Element {
    KIM = 'Kim',
    MOC = 'Mộc',
    THUY = 'Thủy',
    HOA = 'Hỏa',
    THO = 'Thổ',
    VO = 'Vô', // Neutral/None
}

export enum LinhCanQuality {
    PHAM = 'Phàm phẩm',
    HOANG = 'Hoàng phẩm',
    HUYEN = 'Huyền phẩm',
    DIA = 'Địa phẩm',
    THIEN = 'Thiên phẩm',
}

export enum FactionType {
    CHINH_PHAI = 'Chính Phái',
    MA_DAO = 'Ma Đạo',
    TRUNG_LAP = 'Trung Lập',
}

export enum DungeonFloorType {
    COMBAT = 'Chiến Đấu',
    ELITE_COMBAT = 'Tinh Anh',
    TREASURE = 'Kho Báu',
    EMPTY = 'Trống',
    BOSS = 'Trùm',
}

export enum CultivationTechniqueType {
    TAM_PHAP = 'Tâm Pháp',
    THAN_PHAP = 'Thân Pháp',
    LUYEN_THE = 'Luyện Thể',
    CONG_KICH = 'Công Kích',
}

export enum ServantTask {
    RESTING = 'Nghỉ Ngơi',
    GUARDING = 'Hộ Pháp',
    EXPLORING = 'Dò Thám',
    FORAGING = 'Sưu Tầm',
}

export enum LogType {
    SYSTEM = 'SYSTEM',
    NARRATIVE = 'NARRATIVE',
    LOOT = 'LOOT',
    QUEST = 'QUEST',
    COMBAT = 'COMBAT',
    CRAFTING = 'CRAFTING',
    ERROR = 'ERROR',
}

export enum ColorTheme {
    DEFAULT = 'default',
    DEUTERANOPIA = 'deuteranopia', // Red-Green color blindness
    TRITANOPIA = 'tritanopia',    // Blue-Yellow color blindness
    HIGH_CONTRAST = 'high-contrast',
    SEPIA = 'sepia',
}


// Interfaces and Types
export type BaseStats = { [key in Stat]?: number };

export type DerivedStats = {
    [Stat.HP]: number;
    [Stat.MP]: number;
    [Stat.ATK]: number;
    [Stat.MATK]: number;
    [Stat.DEF]: number;
    [Stat.SPEED]: number;
    [Stat.PENETRATION]: number;
    [Stat.EVASION]: number;
    [Stat.CRIT_RATE]: number;
    [Stat.ACCURACY]: number;
    [Stat.LIFESTEAL]: number;
    [Stat.ATK_SPEED]: number;
    
    [Stat.FIRE_DMG_BONUS]: number;
    [Stat.WATER_DMG_BONUS]: number;
    [Stat.WOOD_DMG_BONUS]: number;
    [Stat.METAL_DMG_BONUS]: number;
    [Stat.EARTH_DMG_BONUS]: number;
    [Stat.FIRE_RES]: number;
    [Stat.WATER_RES]: number;
    [Stat.WOOD_RES]: number;
    [Stat.METAL_RES]: number;
    [Stat.EARTH_RES]: number;
};

export interface Realm {
    name: string;
    minLevel: number;
    maxLevel: number;
}

export interface SkillEffect {
    type: SkillEffectType;
    target: TargetType;
    stat?: Stat;
    powerMultiplier?: number;
    value?: number;
    isPercent?: boolean;
    duration?: number;
    description: string;
    chance?: number;
    summonCount?: number;
    summonMonsterName?: string;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    type: SkillType;
    levelRequired: number;
    realmRequired?: string;
    class: string;
    mpCost?: number;
    effects: SkillEffect[];
    element?: Element;
}

export interface Affix {
    id: AffixId;
    name: string;
    description: string;
}

export interface SoulEffect {
    name: string;
    description: string;
    bonus: {
        stat: Stat;
        value: number;
        isPercent: boolean;
    };
}

export interface CultivationTechnique {
    id: string;
    name: string;
    description: string;
    type: CultivationTechniqueType;
    level: number;
    maxLevel: number;
    bonuses: { stat: Stat, value: number, isPercent: boolean }[];
    bonusesPerLevel: { stat: Stat, value: number, isPercent: boolean }[];
}

export interface Item {
    id: string;
    name: string;
    description?: string;
    type: ItemType;
    level: number;
    rarity: Rarity;
    baseStats: { [key: string]: number };
    bonusStats: { [key: string]: number };
    upgradeLevel: number;
    maxUpgrade: number;
    history: { result: 'success' | 'fail', level: number }[];
    evolved: boolean;
    affix?: Affix;
    setId?: string;
    setName?: string;
    soulEffect?: SoulEffect;
    skillDetails?: Omit<Skill, 'id' | 'class'>;
    cultivationTechniqueDetails?: Omit<CultivationTechnique, 'id' | 'level'> & { level: number };
    element?: Element;
}


export interface SetBonus {
    pieces: number;
    stats: { [key: string]: number };
    description: string;
}

export interface ItemSet {
    id: string;
    name: string;
    items: { [key in ItemType]?: string };
    bonuses: SetBonus[];
}


export interface ActiveEffect {
    id: string;
    sourceSkillName: string;
    effect: SkillEffect;
    remainingTurns: number;
}

export interface LinhCan {
    quality: LinhCanQuality;
    elements: Element[];
    description: string;
}

export interface Character {
    id: string;
    name: string;
    originalName?: string;
    playerClass: string;
    classDefinition?: BaseStats; // For custom classes
    level: number;
    exp: number;
    expToNextLevel: number;
    realm: Realm;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    currentHp: number;
    currentMp: number;
    backstory?: string;
    inventory: Item[];
    equipment: { [key in ItemType]?: Item };
    materials: { [key in UpgradeMaterial]?: number };
    consumables: { [key in UpgradeConsumable]?: number };
    skills: Skill[];
    activeEffects: ActiveEffect[];
    position: { x: number; y: number };
    quests: Quest[];
    pets: Pet[];
    activePetId: string | null;
    retainers: Character[];
    activeRetainerId: string | null;
    servants: Servant[];
    forgingProficiency: { level: number, exp: number, expToNextLevel: number };
    learnedCultivationTechniques: CultivationTechnique[];
    activeCultivationTechniqueId: string | null;
    reputation: { [factionId: string]: number };
    sectId: string | null;
    sectRank: string | null;
    sectContributionPoints: number;
    npcAffinity: { [npcName: string]: number };
    metNpcs: MetNpcInfo[];
    imageUrl?: string;
    rank?: MonsterRank;
    isBoss?: boolean;
    isHumanoid?: boolean;
    currentDungeonId: string | null;
    bossData?: {
        phases: BossPhase[];
        currentPhaseIndex: number;
        minions: Character[];
    };
    isImmune?: boolean;
    linhCan: LinhCan;
    unallocatedStatPoints?: number;
}

export interface MetNpcInfo {
    name: string;
    role: string;
    factionName?: string;
    affinity: number;
    imageUrl?: string;
    imagePrompt?: string;
}

export interface Pet {
    id: string;
    name: string;
    originalName: string;
    monsterClass: string;
    level: number;
    exp: number;
    expToNextLevel: number;
    baseStats: BaseStats;
    derivedStats: DerivedStats;
    currentHp: number;
    skills: Skill[];
    imageUrl?: string;
    loyalty: number; // 0-100
    loyaltyDescription: string;
    oneWordStatus: string;
    status: PetStatus;
    activeEffects: ActiveEffect[];
    isEvolved: boolean;
    evolutionLevel: number;
    linhCan: LinhCan;
}

export interface Servant {
    id: string;
    name: string;
    originalName: string;
    level: number;
    characterClass: string;
    imageUrl?: string;
    task: ServantTask;
}

export type Combatant = Character | Pet;

export interface AttackResult {
    damage: number;
    messages: string[];
    crit: boolean;
    miss: boolean;
    lifestealAmount: number;
    appliedEffects: ActiveEffect[];
    elementalEffect?: 'strong' | 'weak' | 'proficient';
}

export interface ImageLibraryItem {
    id: string;
    url: string;
    description: string;
    tags: string[];
    isMonster: boolean;
}

export interface DisplayStyle {
    font: string;
    size: string;
    textColor: string;
    bgColor?: string;
}

export interface DisplaySettings {
    aiNarrative: DisplayStyle;
    playerDialogue: DisplayStyle;
    npcDialogue: DisplayStyle;
    characterName: DisplayStyle;
}

export interface AppSettings {
    gameSpeed: number;
    difficulty: Difficulty;
    eventFrequency: number;
    autoDismantleRarities: { [key in Rarity]: boolean };
    useAdvancedCombatAI: boolean;
    colorTheme: ColorTheme;
    reduceMotion: boolean;
    displaySettings: DisplaySettings;
}

export interface Faction {
    id: string;
    name: string;
    description: string;
    type: FactionType;
    isJoinable: boolean;
    store: SectStoreItem[];
}

export interface SectStoreItem {
    id: string;
    item: Omit<Item, 'id' | 'history' | 'evolved' | 'upgradeLevel'>;
    cost: number;
}

export interface Poi {
    id: number;
    coords: { x: number, y: number };
    type: string;
    region: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    isLoading: boolean;
    dialogue?: DialogueState;
    factionId: string | null;
    dungeonId?: string;
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    status: QuestStatus;
    type: QuestType;
    giverPoiId: number;
    target: {
        targetName: string;
        count: number;
        current: number;
    };
    rewards: {
        exp: number;
        items?: Item[];
        reputationChange?: { factionId: string, amount: number }[];
        contributionPoints?: number;
    };
}

export interface DialogueTurn {
    speaker: 'player' | 'npc';
    text: string;
}

export interface DialogueState {
    npcName: string;
    npcRole: string;
    npcImageUrl?: string;
    history: DialogueTurn[];
    factionId?: string | null;
    factionName?: string;
    affinity: number;
    options: string[];
}

export interface DialogueAIResponse {
    responseText: string;
    affinityChange?: number;
    giveQuest?: boolean;
    options?: string[];
}


export interface MonsterTemplate {
    name: string;
    level?: number;
    description: string;
    habitats: TerrainType[];
    baseClass: string;
    imageUrl?: string;
    imagePrompt: string;
    discovered: boolean;
    element: Element;
}

export interface NpcTemplate {
    name: string;
    role: string;
    backstory: string;
    factionId: string | null;
    imagePrompt: string;
}

export interface DungeonFloor {
    type: DungeonFloorType;
    description: string;
    isCompleted: boolean;
}

export interface DungeonState {
    id: string;
    name: string;
    description: string;
    theme: string;
    level: number;
    floors: DungeonFloor[];
    currentFloorIndex: number;
    isCleared: boolean;
}

export interface WorldState {
    name?: string;
    description?: string;
    factions: Faction[];
    pois: Poi[];
    bestiary: MonsterTemplate[];
    notableNpcs: NpcTemplate[];
    dungeons: DungeonState[];
}

export interface SaveFile {
    character: Character;
    appSettings: AppSettings;
    imageLibrary: ImageLibraryItem[];
    worldState: WorldState;
    saveDate: string;
}

export interface SaveSlot {
    slotId: number;
    characterName: string;
    level: number;
    realm: string;
    saveDate: string;
}

export interface ExplorationEventLog {
    id: string;
    text: string;
    type: LogType;
    sources?: { uri: string; title: string }[];
}

export type ExplorationEvent = 
    | { type: 'TEXT', log: string, groundingSources?: { uri: string; title: string }[] }
    | { type: 'ENEMY', log: string, groundingSources?: { uri: string; title: string }[] }
    | { type: 'BOSS', log: string, groundingSources?: { uri: string; title: string }[] }
    | { type: 'NPC', log: string, dialogue: DialogueState, npcDetails: { name: string, role: string, greeting: string, imagePrompt: string }, groundingSources?: { uri: string; title: string }[] }
    | { type: 'ITEM', log: string, item: Item, groundingSources?: { uri: string; title: string }[] };


export interface UpgradeAIResult {
    newBaseStatValue: number;
    bonusStatChange: {
        statKey: string;
        statName: string;
        increase: number;
        isNew: boolean;
    } | null;
    successMessage: string;
}

export interface AITactic {
    action: 'ATTACK' | 'SKILL';
    skillId?: string;
    targetId: string;
    rationale: string;
}

export interface BossPhase {
    name: string;
    hpThreshold: number;
    statMultiplier: number;
    skills: string[];
    description: string;
    isImmuneWhileMinionsExist: boolean;
}

export interface ForgeOptions {
    method: 'mp' | 'items';
    mpUsed: number;
    auxiliaryItems: Item[];
    itemType: ItemType;
}

export interface CombatLogEntry {
    id: string;
    text: string;
    type: 'action' | 'info' | 'error' | 'system' | 'narration';
}

// From GameContext
export interface GameContextType {
    screen: GameScreen;
    character: Character | null;
    enemy: Character | null;
    itemInForge: Item | null;
    initialForgeTab: 'forge' | 'upgrade' | 'enchant' | 'dismantle' | 'craft';
    imageLibrary: ImageLibraryItem[];
    appSettings: AppSettings;
    worldState: WorldState;
    saveSlots: SaveSlot[];
    isFullscreen: boolean;
    activePoiIdForDialogue: number | null;
    transientDialogue: DialogueState | null;
    oneTimeMessages: ExplorationEventLog[];
    designedWorldPrompt: { prompt: string; keywords: string; } | null;
    designedWorldStoryInfo: { title: string; author: string; } | null;
    contextualActions: string[];
    isGeneratingActions: boolean;
    isQuickPlayLoading: boolean;
    levelUpInfo: { newLevel: number, realmChanged: boolean, newRealm: string } | null;
    clearLevelUpInfo: () => void;
    setScreen: (screen: GameScreen) => void;
    handleCreateGame: (name: string, playerClass: string, classDefinition: BaseStats | undefined, characterContext: string, worldPrompt: string, worldKeywords: string, difficulty: Difficulty, storyInfo?: { title: string; author: string }) => Promise<void>;
    handleQuickPlay: () => Promise<void>;
    handleStartCombat: (isBoss?: boolean, forcedBossName?: string) => Promise<void>;
    handleCombatEnd: (playerWon: boolean, finalPlayerState: Character, finalPetState: Pet | null, expGained: number, itemsDropped: Item[], materialsDropped: { [key in UpgradeMaterial]?: number }, consumablesDropped: { [key in UpgradeConsumable]?: number }) => Promise<void>;
    handleOpenForge: (item?: Item, initialTab?: 'forge' | 'upgrade' | 'enchant' | 'dismantle' | 'craft') => void;
    handleCloseForge: () => void;
    handleUpgradeAttempt: (result: { updatedItem: Item, updatedCharacter: Character, message: string, isSuccess: boolean }) => Promise<void>;
    handleUpdateCharacterAndWorld: (updatedCharacter: Character, updatedWorldState: WorldState) => Promise<void>;
    handlePlayerMove: (newPosition: { x: number; y: number }) => Promise<void>;
    handlePlayerRecover: () => Promise<void>;
    handleSaveGame: (slotId: number) => boolean;
    handleLoadGame: (slotId: number) => Promise<void>;
    handleDeleteSave: (slotId: number) => void;
    handleSettingsChange: (newSettings: AppSettings) => void;
    handleUpdateImageLibrary: (library: ImageLibraryItem[]) => void;
    handleToggleFullscreen: () => void;
    handleBackToMenu: () => void;
    handleOpenImageLibrary: () => void;
    handleOpenMenu: (targetScreen: GameScreen) => void;
    handleStartNewGame: () => void;
    refreshSaveSlots: () => void;
    handleDiscoverPoi: (poiId: number) => Promise<void>;
    handleOpenDialogue: (poiId: number) => Promise<void>;
    handleCloseDialogue: () => void;
    handleSendDialogueMessage: (message: string) => Promise<void>;
    handleForgeNewItem: (options: ForgeOptions) => Promise<{ newItem: Item | null, messages: string[] }>;
    handleEnchantItem: (item: Item) => Promise<{ updatedItem: Item, updatedCharacter: Character, message: string } | null>;
    handleDismantleItem: (item: Item) => Promise<{ materialsGained: { [key in UpgradeMaterial]?: number }, message: string } | null>;
    setOneTimeMessages: Dispatch<SetStateAction<ExplorationEventLog[]>>;
    handleOpenTransientDialogue: (dialogue: DialogueState, imagePrompt: string) => Promise<void>;
    handleContinueTransientDialogue: (message: string) => Promise<void>;
    handleLearnCultivationTechnique: (item: Item) => Promise<void>;
    handleActivateCultivationTechnique: (techniqueId: string | null) => Promise<void>;
    handleLevelUpCultivationTechnique: (techniqueId: string) => Promise<{ success: boolean; message: string }>;
    handleUseSkillBook: (item: Item) => Promise<void>;
    handleJoinSectRequest: (factionId: string) => Promise<void>;
    handleRequestSectMission: () => Promise<void>;
    handleContributeItemToSect: (item: Item) => Promise<{ pointsGained: number; message: string; }>;
    handleBuyFromSectStore: (storeItem: SectStoreItem) => Promise<{ message: string; }>;
    handleDesignWorldComplete: (analysisResults: any, summary: { prompt: string; keywords: string; }, storyInfo?: { title: string; author: string; }) => void;
    handleAllocateStatPoint: (stat: Stat) => Promise<void>;
    handleCraftTalisman: () => Promise<{ success: boolean; message: string; }>;
    handleGenerateContextualActions: () => Promise<void>;
    handleCatchPet: () => Promise<{ success: boolean; message: string; }>;
    handleEquipItem: (itemToEquip: Item) => Promise<void>;
    handleUnequipItem: (itemType: ItemType) => Promise<void>;
    handleDevQuickStart: () => Promise<void>;
    handleEnslaveTarget: () => Promise<{ success: boolean; message: string; }>;
    handleSetActiveRetainer: (retainerId: string | null) => Promise<void>;
    handleAssignServantTask: (servantId: string, task: ServantTask) => Promise<void>;
    handleCraftHonAnPhu: () => Promise<{ success: boolean; message: string; }>;
    handleSetActivePet: (petId: string | null) => Promise<void>;
    handleRenamePet: (petId: string, newName: string) => Promise<void>;
    handleReleasePet: (petId: string) => Promise<void>;
    handleFeedPet: (petId: string) => Promise<void>;
    handleEvolvePet: (petId: string) => Promise<void>;
    handleEnterDungeon: (poiId: number) => Promise<void>;
    handleProceedInDungeon: () => Promise<void>;
    handleExitDungeon: (force?: boolean) => Promise<void>;
}
