export enum GameScreen {
  MENU = 'menu',
  CREATOR = 'creator',
  WORLD_DESIGNER = 'world_designer',
  WORLD = 'world',
  COMBAT = 'combat',
  FORGE = 'forge', // Replaced UPGRADE
  IMAGE_LIBRARY = 'image_library',
  SETTINGS = 'settings',
  SAVE_MANAGEMENT = 'save_management',
  DIALOGUE = 'dialogue',
  DUNGEON = 'dungeon',
  COMPANION = 'companion', // New screen for companions
}

export enum PlayerClass {
  THE_TU = 'Thể Tu',
  PHAP_TU = 'Pháp Tu',
  KIEM_TU = 'Kiếm Tu',
}

export enum Stat {
  STR = 'STR',
  AGI = 'AGI',
  INT = 'INT',
  SPI = 'SPI',
  CON = 'CON',
  DEX = 'DEX',
  HP = 'HP',
  MP = 'MP',
  ATK = 'ATK',
  MATK = 'MATK',
  DEF = 'DEF',
  SPEED = 'Speed',
  PENETRATION = 'Xuyên Giáp',
  EVASION = 'Né Tránh',
  CRIT_RATE = 'Chí Mạng',
  ACCURACY = 'Chính Xác',
  LIFESTEAL = 'Hút Máu',
  ATK_SPEED = 'Tốc Độ Đánh',
  // Elemental Stats
  FIRE_DMG_BONUS = 'Hỏa Sát Thưởng',
  WATER_DMG_BONUS = 'Thủy Sát Thưởng',
  WOOD_DMG_BONUS = 'Mộc Sát Thưởng',
  METAL_DMG_BONUS = 'Kim Sát Thưởng',
  EARTH_DMG_BONUS = 'Thổ Sát Thưởng',
  FIRE_RES = 'Hỏa Kháng',
  WATER_RES = 'Thủy Kháng',
  WOOD_RES = 'Mộc Kháng',
  METAL_RES = 'Kim Kháng',
  EARTH_RES = 'Thổ Kháng',
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
    WEAPON = 'Vũ Khí',
    ARMOR = 'Giáp',
    RING = 'Nhẫn',
    AMULET = 'Phù',
    CULTIVATION_MANUAL = 'Công Pháp',
    SKILL_BOOK = 'Sách Kỹ Năng',
}

export enum UpgradeMaterial {
    TINH_THACH_HA_PHAM = 'Tinh Thạch Hạ Phẩm',
    TINH_THACH_TRUNG_PHAM = 'Tinh Thạch Trung Phẩm',
    TINH_THACH_CAO_PHAM = 'Tinh Thạch Cao Phẩm',
    LINH_HON_THACH = 'Linh Hồn Thạch', // New material for enchanting
}

export enum UpgradeConsumable {
    BUA_SAO = 'Búa Sao',
    BOT_THAN_TUY = 'Bột Thần Túy',
    LINH_THU_PHU = 'Linh Thú Phù',
    LINH_THU_THUC = 'Linh Thú Thực',
    HON_AN_PHU = 'Hồn Ấn Phù',
}

export enum AffixId {
    LIFESTEAL = 'lifesteal',
    ECHO_DAMAGE = 'echo_damage',
}

export enum TerrainType {
    PLAIN = 'PLAIN',
    FOREST = 'FOREST',
    MOUNTAIN = 'MOUNTAIN',
    VILLAGE = 'VILLAGE',
    WATER = 'WATER',
    VOLCANO = 'VOLCANO',
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

export enum Difficulty {
  EASY = 'Dễ',
  NORMAL = 'Thường',
  HARD = 'Khó',
  HELL = 'Địa Ngục',
}

export enum MonsterRank {
    Thường = 'Thường',
    TinhAnh = 'Tinh Anh',
    ThủLĩnh = 'Thủ Lĩnh',
    HùngChủ = 'Hùng Chủ',
}

// --- New Elemental System ---
export enum Element {
  KIM = 'Kim',
  MOC = 'Mộc',
  THUY = 'Thủy',
  HOA = 'Hỏa',
  THO = 'Thổ',
  VO = 'Vô', // None/Neutral
}

export enum LinhCanQuality {
  PHAM = 'Phàm phẩm',
  HOANG = 'Hoàng phẩm',
  HUYEN = 'Huyền phẩm',
  DIA = 'Địa phẩm',
  THIEN = 'Thiên phẩm',
}

export interface LinhCan {
  quality: LinhCanQuality;
  elements: Element[];
  description: string;
}
// --- End New Elemental System ---

// --- Faction System ---
export enum FactionType {
  CHINH_PHAI = 'Chính Phái',
  MA_DAO = 'Ma Đạo',
  TRUNG_LAP = 'Trung Lập',
}

export interface SectStoreItem {
  id: string;
  item: Omit<Item, 'id' | 'history' | 'evolved' | 'upgradeLevel'>;
  cost: number;
}


export interface Faction {
  id: string;
  name: string;
  description: string;
  type: FactionType;
  isJoinable: boolean;
  store: SectStoreItem[];
}
// --- End Faction System ---

export interface Quest {
    id: string;
    title: string;
    description: string;
    status: QuestStatus;
    type: QuestType;
    giverPoiId: number;
    target: {
        targetName: string; // e.g. "Yêu Lang" for HUNT, "Linh Thảo" for GATHER
        count: number;
        current: number;
    };
    rewards: {
        exp: number;
        items?: Item[];
        reputationChange?: {
            factionId: string;
            amount: number;
        }[];
        contributionPoints?: number;
    };
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

export interface Affix {
    id: AffixId;
    name: string;
    description: string;
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

export interface BaseStats {
  [Stat.STR]: number;
  [Stat.AGI]: number;
  [Stat.INT]: number;
  [Stat.SPI]: number;
  [Stat.CON]: number;
  [Stat.DEX]: number;
}

export interface DerivedStats {
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
}


// --- New Advanced Skill System ---

export enum SkillType {
    ACTIVE = 'Chủ động',
    PASSIVE = 'Bị động',
}

export enum TargetType {
    ENEMY = 'Kẻ địch',
    SELF = 'Bản thân',
    // ALL_ENEMIES = 'Tất cả kẻ địch', // Future expansion
    // ALL_ALLIES = 'Tất cả đồng minh', // Future expansion
}

export enum SkillEffectType {
    DAMAGE = 'DAMAGE',          // Gây sát thương
    HEAL = 'HEAL',            // Hồi máu
    BUFF = 'BUFF',            // Hiệu ứng có lợi
    DEBUFF = 'DEBUFF',          // Hiệu ứng bất lợi
    DOT = 'DOT',              // Sát thương theo thời gian (Damage over Time)
    HOT = 'HOT',              // Hồi máu theo thời gian (Heal over Time)
    STUN = 'STUN',            // Gây choáng
    SPECIAL = 'SPECIAL',        // Hiệu ứng đặc biệt (do AI mô tả)
    SUMMON = 'SUMMON',
    DISABLE_SKILL = 'DISABLE_SKILL',
}

export interface SkillEffect {
    type: SkillEffectType;
    target: TargetType;
    stat?: Stat;                // Stat cho BUFF/DEBUFF
    powerMultiplier?: number;   // Hệ số sức mạnh cho DAMAGE/HEAL/DOT/HOT
    value?: number;             // Giá trị cố định hoặc phần trăm cho BUFF/DEBUFF
    isPercent?: boolean;
    duration?: number;          // Số lượt hiệu lực
    description: string;        // Mô tả hiệu ứng, vd: "Gây 150% sát thương phép và thiêu đốt kẻ địch trong 3 lượt."
    chance?: number;            // Tỷ lệ kích hoạt hiệu ứng (0-100)
    summonCount?: number;
    summonMonsterName?: string;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    type: SkillType;
    levelRequired: number;
    realmRequired?: string;     // Cảnh giới yêu cầu để có kỹ năng đặc biệt
    class: string;           // Dùng string để linh hoạt cho cả class tùy chỉnh và quái vật
    mpCost?: number;
    effects: SkillEffect[];
    element?: Element;
}

export interface ActiveEffect {
    id: string;
    sourceSkillName: string;
    effect: SkillEffect;
    remainingTurns: number;
    disabledSkillId?: string;
}

// --- End New Advanced Skill System ---

// --- Pet System ---
export enum PetStatus {
    IDLE = 'IDLE', // In the 'pet hotel'
    FOLLOWING = 'FOLLOWING', // Active pet, follows player and enters combat
}

export interface Pet {
  id: string;
  name: string;
  originalName: string; // The monster's original name
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
  status: PetStatus;
  oneWordStatus: string; // e.g., "Trung thành", "Cảnh giác" from AI
  activeEffects: ActiveEffect[];
  isEvolved: boolean;
  evolutionLevel: number;
  linhCan?: LinhCan;
}
// --- End Pet System ---

// --- New Systems ---
export interface ForgingProficiency {
    level: number;
    exp: number;
    expToNextLevel: number;
}

export enum CultivationTechniqueType {
    TAM_PHAP = 'Tâm pháp',
    THAN_PHAP = 'Thân pháp',
    KIEM_PHAP = 'Kiếm pháp',
    PHAP_THUAT = 'Pháp thuật',
    TRAN_PHAP = 'Trận pháp',
    BIEN_DI = 'Biến dị',
}

export interface TechniqueBonus {
    stat: Stat;
    value: number;
    isPercent: boolean;
}

export interface CultivationTechnique {
    id: string;
    name: string;
    description: string;
    type: CultivationTechniqueType;
    level: number;
    maxLevel: number;
    bonuses: TechniqueBonus[]; // Bonuses for the CURRENT level
    bonusesPerLevel: TechniqueBonus[]; // How much it improves per level
}


export interface ForgeOptions {
    method: 'items' | 'mp';
    auxiliaryItems: Item[];
    mpUsed: number;
    itemType?: ItemType;
}

// --- Companion System ---
export enum ServantTask {
    MINING = 'Khai Khoáng',
    ALCHEMY = 'Luyện Dược',
    GUARDING = 'Hộ Vệ',
    RESTING = 'Nghỉ Ngơi',
}

export interface BaseCompanion {
    id: string;
    name: string;
    originalName: string;
    level: number;
    characterClass: string;
    imageUrl?: string;
}

export interface Servant extends BaseCompanion {
    task: ServantTask;
}
// --- End Companion System ---

// --- End New Systems ---

// --- Boss System ---
export interface BossPhase {
  name: string;
  hpThreshold: number; // Phase triggers when HP is <= this percentage (e.g., 0.7 for 70%)
  statMultiplier: number;
  skills: string[]; // Array of skill IDs
  description: string;
  imageUrl?: string;
  isImmuneWhileMinionsExist?: boolean;
}

export interface MetNpcInfo {
    name: string;
    role: string;
    factionName?: string;
    affinity: number;
    imageUrl?: string;
}

export interface Character {
  id: string;
  name: string;
  originalName?: string; // For tracking bestiary entries
  playerClass: string;
  classDefinition?: BaseStats;
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
  equipment: {
    [key in ItemType]?: Item;
  };
  materials: { [key in UpgradeMaterial]?: number };
  consumables: { [key in UpgradeConsumable]?: number };
  skills: Skill[];
  activeEffects: ActiveEffect[];
  imageUrl?: string;
  position: { x: number, y: number };
  quests: Quest[];
  pets: Pet[];
  activePetId: string | null;
  // New
  forgingProficiency: ForgingProficiency;
  learnedCultivationTechniques: CultivationTechnique[];
  activeCultivationTechniqueId: string | null;
  reputation: { [factionId: string]: number };
  sectId: string | null;
  sectRank: string | null;
  sectContributionPoints: number;
  npcAffinity: { [npcName: string]: number };
  metNpcs: MetNpcInfo[];
  isBoss?: boolean;
  rank?: MonsterRank;
  currentDungeonId: string | null;
  linhCan: LinhCan;
  unallocatedStatPoints?: number;
  // Companions
  retainers: Character[];
  activeRetainerId: string | null;
  servants: Servant[];
  isHumanoid?: boolean;
  // Boss Specific
  bossData?: {
    phases: BossPhase[];
    currentPhaseIndex: number;
    minions: Character[];
  };
  isImmune?: boolean;
}

export interface Realm {
  name: string;
  minLevel: number;
  maxLevel: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  level: number;
  rarity: Rarity;
  baseStats: { [key: string]: number };
  bonusStats: { [key: string]: number };
  upgradeLevel: number;
  maxUpgrade: number;
  description?: string;
  history: { result: 'success' | 'fail', level: number }[];
  affix?: Affix;
  soulEffect?: SoulEffect; // New enchanting effect
  evolved: boolean;
  setId?: string;
  setName?: string;
  cultivationTechniqueDetails?: Omit<CultivationTechnique, 'id' | 'level'> & { level: number };
  skillDetails?: Omit<Skill, 'id' | 'class'>;
  element?: Element;
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

export interface ImageLibraryItem {
  id: string;
  url: string;
  description: string;
  tags: string[];
  isMonster: boolean;
}

export interface AppSettings {
  gameSpeed: number;
  difficulty: Difficulty;
  eventFrequency: number;
  autoDismantleRarities: { [key in Rarity]?: boolean };
  useAdvancedCombatAI: boolean;
  fontSize?: number;
  fontFamily?: string;
}

export interface SaveSlot {
    slotId: number;
    characterName: string;
    level: number;
    realm: string;
    saveDate: string;
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
    factionId?: string;
    factionName?: string;
    affinity: number;
    options: string[];
}

export interface DialogueAIResponse {
    responseText: string;
    affinityChange?: number;
    giveQuest?: boolean;
    giveItem?: boolean;
    options?: string[];
}

export interface Poi {
    id: number;
    coords: { x: number; y: number };
    type: string;
    region: string;
    name?: string;
    description?: string;
    imageUrl?: string;
    isLoading: boolean;
    dialogue?: DialogueState;
    factionId?: string;
    dungeonId?: string;
}

// --- Dungeon System ---
export enum DungeonFloorType {
    COMBAT = 'COMBAT',
    ELITE_COMBAT = 'ELITE_COMBAT',
    TREASURE = 'TREASURE',
    BOSS = 'BOSS',
    EMPTY = 'EMPTY',
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


// --- World Generation & Lore ---
export interface MonsterTemplate {
  name: string;
  description: string;
  habitats: TerrainType[];
  baseClass: string; // e.g., "Yêu Thú Hệ Lôi", "Cương Thi"
  discovered: boolean;
  imageUrl?: string;
  imagePrompt: string;
  element?: Element;
  level?: number;
}

export interface NpcTemplate {
  name: string;
  role: string;
  backstory: string;
  factionId: string | null;
}

export interface WorldState {
    name?: string;
    description?: string;
    pois: Poi[];
    factions: Faction[];
    bestiary: MonsterTemplate[];
    notableNpcs: NpcTemplate[];
    dungeons: DungeonState[];
}


export interface SaveFile {
    character: Character;
    appSettings: AppSettings;
    imageLibrary: ImageLibraryItem[];
    worldState: WorldState;
    saveDate?: string;
}

export type ExplorationEvent = (
    | { type: 'TEXT' | 'ENEMY' | 'BOSS'; log: string }
    | { type: 'NPC'; log: string; dialogue: DialogueState }
    | { type: 'ITEM'; log: string; item: Item }
) & {
    groundingSources?: { uri: string; title: string }[];
};

export enum LogType {
    SYSTEM = 'system',
    NARRATIVE = 'narrative',
    LOOT = 'loot',
    QUEST = 'quest',
    COMBAT = 'combat',
    CRAFTING = 'crafting',
    ERROR = 'error',
}

export interface ExplorationEventLog {
  id: string;
  text: string;
  type: LogType;
  sources?: { uri: string; title: string }[];
}

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'system' | 'action' | 'narration' | 'info' | 'error';
}

export interface AITactic {
  action: 'ATTACK' | 'SKILL';
  skillId?: string; // ID of the skill to use
  targetId: string; // ID of the target combatant
  rationale: string; // AI's reasoning, for logging/debugging
}

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
    designedWorldStoryInfo?: { title: string; author: string; } | null;
    contextualActions: string[];
    isGeneratingActions: boolean;
    isQuickPlayLoading: boolean;
    levelUpInfo: { newLevel: number, realmChanged: boolean, newRealm: string } | null;
    clearLevelUpInfo: () => void;

    // Actions
    setScreen: (screen: GameScreen) => void;
    handleCreateGame: (name: string, playerClass: string, classDefinition: BaseStats | undefined, characterContext: string, worldPrompt: string, worldKeywords: string, difficulty: Difficulty, storyInfo?: { title: string; author: string; }) => Promise<void>;
    handleQuickPlay: () => Promise<void>;
    handleStartCombat: (isBoss?: boolean, forcedBossName?: string) => void;
    handleCombatEnd: (playerWon: boolean, finalPlayerState: Character, finalPetState: Pet | null, expGained: number, itemsDropped: Item[], materialsDropped: { [key in UpgradeMaterial]?: number }, consumablesDropped: { [key in UpgradeConsumable]?: number }) => Promise<void>;
    handleOpenForge: (item?: Item, initialTab?: 'forge' | 'upgrade' | 'enchant' | 'dismantle' | 'craft') => void;
    handleCloseForge: () => void;
    handleUpgradeAttempt: (result: { updatedItem: Item, updatedCharacter: Character, message: string, isSuccess: boolean }) => void;
    handleUpdateCharacterAndWorld: (updatedCharacter: Character, updatedWorldState: WorldState) => void;
    handlePlayerMove: (newPosition: { x: number; y: number }) => Promise<void>;
    handlePlayerRecover: () => Promise<void>;
    handleSaveGame: (slotId: number) => boolean;
    handleLoadGame: (slotId: number) => void;
    handleDeleteSave: (slotId: number) => void;
    handleSettingsChange: (newSettings: AppSettings) => void;
    handleUpdateImageLibrary: (library: ImageLibraryItem[]) => void;
    handleToggleFullscreen: () => void;
    handleBackToMenu: () => void;
    handleOpenImageLibrary: () => void;
    handleOpenMenu: (screen: GameScreen) => void;
    handleStartNewGame: () => void;
    refreshSaveSlots: () => void;
    handleDiscoverPoi: (poiId: number) => void;
    handleOpenDialogue: (poiId: number) => void;
    handleCloseDialogue: () => void;
    handleSendDialogueMessage: (message: string) => Promise<void>;
    handleForgeNewItem: (options: ForgeOptions) => Promise<{ newItem: Item | null, messages: string[] }>;
    handleEnchantItem: (item: Item) => Promise<{ updatedItem: Item, updatedCharacter: Character, message: string } | null>;
    handleDismantleItem: (item: Item) => Promise<{ materialsGained: { [key in UpgradeMaterial]?: number }, message: string } | null>;
    setOneTimeMessages: (messages: ExplorationEventLog[]) => void;
    handleOpenTransientDialogue: (dialogue: DialogueState) => void;
    handleContinueTransientDialogue: (message: string) => Promise<void>;
    handleLearnCultivationTechnique: (item: Item) => Promise<void>;
    handleActivateCultivationTechnique: (techniqueId: string | null) => Promise<void>;
    handleLevelUpCultivationTechnique: (techniqueId: string) => Promise<{success: boolean, message: string}>;
    handleUseSkillBook: (item: Item) => Promise<void>;
    handleJoinSectRequest: (factionId: string) => Promise<void>;
    handleRequestSectMission: () => Promise<void>;
    handleContributeItemToSect: (item: Item) => Promise<{ pointsGained: number; message: string; }>;
    handleBuyFromSectStore: (storeItem: SectStoreItem) => Promise<{ message: string; }>;
    handleDesignWorldComplete: (analysisResults: any, summary: { prompt: string; keywords: string; }, storyInfo?: { title: string; author: string }) => void;
    handleAllocateStatPoint: (stat: Stat) => Promise<void>;
    handleCraftTalisman: () => Promise<{ success: boolean; message: string }>;
    handleGenerateContextualActions: () => Promise<void>;
    handleCatchPet: () => Promise<{ success: boolean; message: string; }>;
    handleEquipItem: (item: Item) => Promise<void>;
    handleUnequipItem: (itemType: ItemType) => Promise<void>;

    // Companion actions
    handleEnslaveTarget: () => Promise<{success: boolean; message: string;}>;
    handleSetActiveRetainer: (retainerId: string | null) => void;
    handleAssignServantTask: (servantId: string, task: ServantTask) => void;
    handleCraftHonAnPhu: () => Promise<{ success: boolean; message: string }>;

    // Pet actions
    handleSetActivePet: (petId: string | null) => void;
    handleRenamePet: (petId: string, newName: string) => Promise<void>;
    handleReleasePet: (petId: string) => void;
    handleFeedPet: (petId: string) => Promise<void>;
    handleEvolvePet: (petId: string) => Promise<void>;

    // Dungeon actions
    handleEnterDungeon: (poiId: number) => Promise<void>;
    handleProceedInDungeon: () => Promise<void>;
    handleExitDungeon: (force?: boolean) => void;
}