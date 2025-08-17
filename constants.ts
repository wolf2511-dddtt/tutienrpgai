import { Realm, PlayerClass, Rarity, Stat, ItemType, UpgradeMaterial, UpgradeConsumable, Item, AffixId, Affix, ItemSet, Skill, SkillType, TargetType, TerrainType, Poi, BaseStats, AppSettings, Difficulty, SkillEffectType, MonsterRank, Element, LinhCanQuality, LinhCan } from './types';

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 20;

export const CUSTOM_CLASS_CREATION_POINTS = 20;
export const CUSTOM_CLASS_POINTS_PER_LEVEL = 7;

export const DIFFICULTY_MODIFIERS: { 
    [key in Difficulty]: { 
        monsterStatMultiplier: number; 
        expRate: number; 
        lootRate: number;
        enemyRankUpChance: number; // additive % chance
        recoveryModifier: number; // multiplier for rest recovery
        upgradeSuccessBonus: number; // additive % bonus
    } 
} = {
    [Difficulty.EASY]:   { monsterStatMultiplier: 0.75, expRate: 1.25, lootRate: 1.2, enemyRankUpChance: -0.2, recoveryModifier: 1.5, upgradeSuccessBonus: 10 },
    [Difficulty.NORMAL]: { monsterStatMultiplier: 1.0,  expRate: 1.0,  lootRate: 1.0, enemyRankUpChance: 0,    recoveryModifier: 1.0, upgradeSuccessBonus: 0 },
    [Difficulty.HARD]:   { monsterStatMultiplier: 1.5,  expRate: 0.9,  lootRate: 0.9, enemyRankUpChance: 0.15, recoveryModifier: 0.75, upgradeSuccessBonus: -5 },
    [Difficulty.HELL]:   { monsterStatMultiplier: 2.5,  expRate: 0.8,  lootRate: 0.8, enemyRankUpChance: 0.30, recoveryModifier: 0.5, upgradeSuccessBonus: -15 },
};

export const MONSTER_RANK_MODIFIERS: { [key in MonsterRank]: { statMultiplier: number, bonusActiveSkills: number, bonusPassiveSkills: number, lootMultiplier: number } } = {
    [MonsterRank.Thường]: { statMultiplier: 1.0, bonusActiveSkills: 0, bonusPassiveSkills: 0, lootMultiplier: 1.0 },
    [MonsterRank.TinhAnh]: { statMultiplier: 1.5, bonusActiveSkills: 1, bonusPassiveSkills: 1, lootMultiplier: 1.5 },
    [MonsterRank.ThủLĩnh]: { statMultiplier: 2.2, bonusActiveSkills: 2, bonusPassiveSkills: 2, lootMultiplier: 2.5 },
    [MonsterRank.HùngChủ]: { statMultiplier: 4.0, bonusActiveSkills: 3, bonusPassiveSkills: 2, lootMultiplier: 5.0 },
};


export const TERRAIN_DATA: { [key in TerrainType]: { color: string, isPassable: boolean, element?: Element } } = {
    [TerrainType.PLAIN]: { color: 'bg-green-800', isPassable: true, element: Element.MOC },
    [TerrainType.FOREST]: { color: 'bg-green-900', isPassable: true, element: Element.MOC },
    [TerrainType.MOUNTAIN]: { color: 'bg-gray-600', isPassable: true, element: Element.THO },
    [TerrainType.VILLAGE]: { color: 'bg-yellow-700', isPassable: true },
    [TerrainType.WATER]: { color: 'bg-blue-700', isPassable: false, element: Element.THUY },
    [TerrainType.VOLCANO]: { color: 'bg-red-800', isPassable: true, element: Element.HOA },
};

export const SKILLS: Skill[] = [
    // Thể Tu
    { 
        id: 'thetu_passive_1', name: 'Thân Thể Cường Hóa', 
        description: 'Bị động tăng 10% Phòng thủ cơ bản.', 
        type: SkillType.PASSIVE, levelRequired: 3, class: PlayerClass.THE_TU,
        effects: [{ type: SkillEffectType.BUFF, target: TargetType.SELF, stat: Stat.DEF, value: 10, isPercent: true, description: "Tăng 10% DEF" }]
    },
    { 
        id: 'thetu_active_1', name: 'Chém Mạnh', 
        description: 'Một đòn tấn công mạnh mẽ gây 150% sát thương vật lý.', 
        type: SkillType.ACTIVE, levelRequired: 5, class: PlayerClass.THE_TU, mpCost: 15,
        effects: [{ type: SkillEffectType.DAMAGE, target: TargetType.ENEMY, powerMultiplier: 1.5, description: "Gây 150% sát thương" }]
    },
    { 
        id: 'thetu_active_2', name: 'Khiên Chấn', 
        description: 'Dùng khiên đập mạnh, gây 120% sát thương và có 50% tỷ lệ gây choáng trong 1 lượt.', 
        type: SkillType.ACTIVE, levelRequired: 12, class: PlayerClass.THE_TU, mpCost: 25,
        effects: [
            { type: SkillEffectType.DAMAGE, target: TargetType.ENEMY, powerMultiplier: 1.2, description: "Gây 120% sát thương." },
            { type: SkillEffectType.STUN, target: TargetType.ENEMY, duration: 1, chance: 50, description: "Gây choáng trong 1 lượt." }
        ]
    },
    
    // Pháp Tu
    { 
        id: 'phaptu_passive_1', name: 'Nguyên Tố Tinh Thông', 
        description: 'Bị động tăng 10% Công Phép cơ bản.', 
        type: SkillType.PASSIVE, levelRequired: 3, class: PlayerClass.PHAP_TU, 
        effects: [{ type: SkillEffectType.BUFF, target: TargetType.SELF, stat: Stat.MATK, value: 10, isPercent: true, description: "Tăng 10% MATK" }]
    },
    { 
        id: 'phaptu_active_1', name: 'Hỏa Cầu', 
        description: 'Tung một quả cầu lửa gây 160% sát thương phép và có 30% tỷ lệ thiêu đốt kẻ địch trong 2 lượt.', 
        type: SkillType.ACTIVE, levelRequired: 5, class: PlayerClass.PHAP_TU, mpCost: 20, element: Element.HOA,
        effects: [
            { type: SkillEffectType.DAMAGE, target: TargetType.ENEMY, powerMultiplier: 1.6, description: "Gây 160% sát thương phép." },
            { type: SkillEffectType.DOT, target: TargetType.ENEMY, powerMultiplier: 0.3, duration: 2, chance: 30, description: "Thiêu đốt trong 2 lượt." }
        ]
    },

    // Kiếm Tu
    { 
        id: 'kiemtu_passive_1', name: 'Thích Khách Chi Đạo', 
        description: 'Bị động tăng 5% tỉ lệ chí mạng.', 
        type: SkillType.PASSIVE, levelRequired: 3, class: PlayerClass.KIEM_TU, 
        effects: [{ type: SkillEffectType.BUFF, target: TargetType.SELF, stat: Stat.CRIT_RATE, value: 5, isPercent: false, description: "Tăng 5% tỉ lệ chí mạng." }]
    },
    { 
        id: 'kiemtu_active_1', name: 'Đâm Lén', 
        description: 'Một đòn tấn công hiểm hóc gây 120% sát thương và bỏ qua 25% phòng thủ của đối phương.', 
        type: SkillType.ACTIVE, levelRequired: 5, class: PlayerClass.KIEM_TU, mpCost: 10,
        effects: [{ type: SkillEffectType.DAMAGE, target: TargetType.ENEMY, powerMultiplier: 1.2, description: "Gây 120% sát thương và bỏ qua 25% phòng thủ." }] // Note: Penetration effect handled in useSkill logic
    },
];


export const REALMS: Realm[] = [
    { name: 'Phàm Nhân', minLevel: 0, maxLevel: 9 },
    { name: 'Luyện Khí', minLevel: 10, maxLevel: 19 },
    { name: 'Trúc Cơ', minLevel: 20, maxLevel: 29 },
    { name: 'Kim Đan', minLevel: 30, maxLevel: 39 },
    { name: 'Nguyên Anh', minLevel: 40, maxLevel: 49 },
    { name: 'Hóa Thần', minLevel: 50, maxLevel: 59 },
    { name: 'Luyện Hư', minLevel: 60, maxLevel: 69 },
    { name: 'Phân Thần', minLevel: 70, maxLevel: 79 },
    { name: 'Hợp Thể', minLevel: 80, maxLevel: 89 },
    { name: 'Đại Thừa', minLevel: 90, maxLevel: 99 },
    { name: 'Độ Kiếp', minLevel: 100, maxLevel: 109 },
    { name: 'Kiếp Tiên', minLevel: 110, maxLevel: 119 },
    { name: 'Chân Tiên', minLevel: 120, maxLevel: 129 },
    { name: 'Địa Tiên', minLevel: 130, maxLevel: 139 },
    { name: 'Thiên Tiên', minLevel: 140, maxLevel: 149 },
    { name: 'Kim Tiên', minLevel: 150, maxLevel: 159 },
    { name: 'Thái Ất Chân Tiên', minLevel: 160, maxLevel: 169 },
    { name: 'Thái Ất Kim Tiên', minLevel: 170, maxLevel: 179 },
    { name: 'Đại La Chân Tiên', minLevel: 180, maxLevel: 189 },
    { name: 'Đại La Kim Tiên', minLevel: 190, maxLevel: 199 },
    { name: 'Vô Cực Đại La', minLevel: 200, maxLevel: 209 },
    { name: 'Thần Thoại Đại La', minLevel: 210, maxLevel: 219 },
    { name: 'Tiên Vương', minLevel: 220, maxLevel: 229 },
    { name: 'Tiên Đế', minLevel: 230, maxLevel: 239 },
    { name: 'Tiên Tôn', minLevel: 240, maxLevel: 299 },
    { name: 'Tiên Tôn Vô Thượng', minLevel: 300, maxLevel: 599 },
    { name: 'Siêu Thoát Giả', minLevel: 600, maxLevel: 899 },
    { name: 'Vô Thượng Chí Tôn', minLevel: 900, maxLevel: 1000 },
    { name: 'Không Biết', minLevel: 1001, maxLevel: Infinity },
];

export const CLASS_STATS: { [key in PlayerClass]: { levelUp: BaseStats, realmBonus: Partial<BaseStats> } } = {
    [PlayerClass.THE_TU]: {
        levelUp: { [Stat.STR]: 2, [Stat.AGI]: 0, [Stat.INT]: 0, [Stat.SPI]: 0, [Stat.CON]: 2, [Stat.DEX]: 0 },
        realmBonus: { [Stat.STR]: 10, [Stat.CON]: 10 },
    },
    [PlayerClass.PHAP_TU]: {
        levelUp: { [Stat.STR]: 0, [Stat.AGI]: 0, [Stat.INT]: 2, [Stat.SPI]: 2, [Stat.CON]: 1, [Stat.DEX]: 0 },
        realmBonus: { [Stat.INT]: 10, [Stat.SPI]: 10, [Stat.DEX]: 5 },
    },
    [PlayerClass.KIEM_TU]: {
        levelUp: { [Stat.STR]: 0, [Stat.AGI]: 2, [Stat.INT]: 0, [Stat.SPI]: 0, [Stat.CON]: 0, [Stat.DEX]: 2 },
        realmBonus: { [Stat.AGI]: 10, [Stat.DEX]: 10 },
    },
};

export const RARITY_DATA = {
    [Rarity.COMMON]: { color: 'text-gray-400', borderColor: 'border-gray-500/50', multiplier: 1.0, bonusStats: 0, maxUpgrade: 5 },
    [Rarity.UNCOMMON]: { color: 'text-green-400', borderColor: 'border-green-500/50', multiplier: 1.2, bonusStats: 1, maxUpgrade: 6 },
    [Rarity.RARE]: { color: 'text-blue-400', borderColor: 'border-blue-500/50', multiplier: 1.5, bonusStats: 2, maxUpgrade: 8 },
    [Rarity.EPIC]: { color: 'text-purple-400', borderColor: 'border-purple-500/50', multiplier: 1.8, bonusStats: 3, maxUpgrade: 10 },
    [Rarity.LEGENDARY]: { color: 'text-orange-400', borderColor: 'border-orange-500/50', multiplier: 2.5, bonusStats: 4, maxUpgrade: 12 },
    [Rarity.MYTHIC]: { color: 'text-red-500 animate-pulse', borderColor: 'border-red-500/50', multiplier: 3.5, bonusStats: 5, maxUpgrade: 15 },
};

export const AFFIXES: { [key in AffixId]: Affix } = {
    [AffixId.LIFESTEAL]: {
        id: AffixId.LIFESTEAL,
        name: "Hút Máu",
        description: "Hồi lại 10% sát thương gây ra thành HP."
    },
    [AffixId.ECHO_DAMAGE]: {
        id: AffixId.ECHO_DAMAGE,
        name: "Vang Vọng",
        description: "Gây thêm một lượng sát thương bằng 20% sát thương đòn đánh."
    }
};

export const EVOLUTION_DATA: { [key in ItemType]?: { level: number, paths: { pathName: string, affixId: AffixId }[] } } = {
    [ItemType.WEAPON]: {
        level: 5,
        paths: [
            { pathName: "Huyết Ảnh", affixId: AffixId.LIFESTEAL },
            { pathName: "Vang Vọng", affixId: AffixId.ECHO_DAMAGE },
        ]
    }
};

// Pet Evolution Constants
export const PET_EVOLUTION_LEVEL = 30;
export const PET_EVOLUTION_COST = {
    [UpgradeMaterial.LINH_HON_THACH]: 10,
    [UpgradeMaterial.TINH_THACH_CAO_PHAM]: 50
};


export const ITEM_SETS: { [key: string]: ItemSet } = {
    huyet_long: {
        id: 'huyet_long',
        name: 'Huyết Long',
        items: {
            [ItemType.WEAPON]: 'Huyết Long Kiếm',
            [ItemType.ARMOR]: 'Huyết Long Giáp',
            [ItemType.RING]: 'Huyết Long Giới',
            [ItemType.AMULET]: 'Huyết Long Phù',
        },
        bonuses: [
            { pieces: 2, stats: { [Stat.STR]: 25, [Stat.HP]: 200 }, description: "+25 Sức Mạnh, +200 HP" },
            { pieces: 4, stats: { [Stat.ATK]: 50, [Stat.PENETRATION]: 10 }, description: "+50 Tấn Công, +10 Xuyên Giáp" },
        ]
    },
    thanh_phong: {
        id: 'thanh_phong',
        name: 'Thanh Phong',
        items: {
            [ItemType.WEAPON]: 'Thanh Phong Đao',
            [ItemType.ARMOR]: 'Thanh Phong Bào',
            [ItemType.RING]: 'Thanh Phong Nhẫn',
            [ItemType.AMULET]: 'Thanh Phong Bội',
        },
        bonuses: [
            { pieces: 2, stats: { [Stat.AGI]: 25, [Stat.DEX]: 25 }, description: "+25 Nhanh Nhẹn, +25 Khéo Léo" },
            { pieces: 4, stats: { [Stat.SPEED]: 20, [Stat.CRIT_RATE]: 10 }, description: "+20 Tốc độ, +10% Tỉ lệ chí mạng" },
        ]
    },
    huyen_vu: {
        id: 'huyen_vu',
        name: 'Huyền Vũ',
        items: {
            [ItemType.WEAPON]: 'Huyền Vũ Trượng',
            [ItemType.ARMOR]: 'Huyền Vũ Y',
            [ItemType.RING]: 'Huyền Vũ Giới Chỉ',
            [ItemType.AMULET]: 'Huyền Vũ Hộ Phù',
        },
        bonuses: [
            { pieces: 2, stats: { [Stat.INT]: 25, [Stat.MP]: 150 }, description: "+25 Trí Tuệ, +150 MP" },
            { pieces: 4, stats: { [Stat.MATK]: 50, [Stat.DEF]: 30 }, description: "+50 Công Phép, +30 Phòng Thủ" },
        ]
    }
};

export const AVAILABLE_ITEM_TYPES: ItemType[] = [ItemType.WEAPON, ItemType.ARMOR, ItemType.RING, ItemType.AMULET, ItemType.SKILL_BOOK, ItemType.CULTIVATION_MANUAL];

export const AVAILABLE_BONUS_STATS = [
    { key: "crit_rate", name: "Tỉ lệ chí mạng" },
    { key: "lifesteal", name: "Hút máu" },
    { key: "burn", name: "Thiêu đốt" },
    { key: "ice_chance", name: "Tỉ lệ đóng băng" },
    { key: "atk_speed", name: "Tốc độ tấn công" },
];

export const UPGRADE_MATERIALS_DATA = {
    [UpgradeMaterial.TINH_THACH_HA_PHAM]: { name: "Tinh Thạch Hạ Phẩm", description: "Dùng để cường hóa trang bị cấp thấp." },
    [UpgradeMaterial.TINH_THACH_TRUNG_PHAM]: { name: "Tinh Thạch Trung Phẩm", description: "Dùng để cường hóa trang bị cấp trung." },
    [UpgradeMaterial.TINH_THACH_CAO_PHAM]: { name: "Tinh Thạch Cao Phẩm", description: "Dùng để cường hóa trang bị cấp cao." },
    [UpgradeMaterial.LINH_HON_THACH]: { name: "Linh Hồn Thạch", description: "Một viên đá chứa đựng linh hồn năng lượng, dùng để khảm nạm và cường hóa trang bị với những hiệu ứng đặc biệt." },
}

export const UPGRADE_CONSUMABLES_DATA = {
    [UpgradeConsumable.BUA_SAO]: { name: "Búa Sao", description: "Tăng 15% tỉ lệ thành công, dùng 1 lần.", bonusRate: 15 },
    [UpgradeConsumable.BOT_THAN_TUY]: { name: "Bột Thần Túy", description: "Nếu thất bại, giữ nguyên cấp trang bị.", protects: true },
    [UpgradeConsumable.LINH_THU_PHU]: { name: "Linh Thú Phù", description: "Một lá bùa chứa đựng sức mạnh thần bí, dùng để thu phục yêu thú. Tỉ lệ thành công phụ thuộc vào sức mạnh và trạng thái của mục tiêu." },
    [UpgradeConsumable.LINH_THU_THUC]: { name: "Linh Thú Thực", description: "Thức ăn đặc biệt dành cho linh thú, giúp tăng độ trung thành." },
    [UpgradeConsumable.HON_AN_PHU]: { name: "Hồn Ấn Phù", description: "Một lá bùa mạnh mẽ dùng để nô dịch những kẻ địch hình người đã bị suy yếu, bắt chúng làm nô bộc." },
}

// --- New Elemental System Constants ---
export const ELEMENTAL_RELATIONSHIPS: { [key in Element]?: { strongAgainst: Element, weakAgainst: Element } } = {
    [Element.KIM]: { strongAgainst: Element.MOC, weakAgainst: Element.HOA },
    [Element.MOC]: { strongAgainst: Element.THO, weakAgainst: Element.KIM },
    [Element.THUY]: { strongAgainst: Element.HOA, weakAgainst: Element.THO },
    [Element.HOA]: { strongAgainst: Element.KIM, weakAgainst: Element.THUY },
    [Element.THO]: { strongAgainst: Element.THUY, weakAgainst: Element.MOC },
};

export const ELEMENT_STRONG_MULTIPLIER = 1.25;
export const ELEMENT_WEAK_MULTIPLIER = 0.75;
export const ELEMENT_PROFICIENCY_MULTIPLIER = 1.10; // Bonus for using skill matching Linh Can

export const LINH_CAN_QUALITIES: { [key in LinhCanQuality]: { weight: number, bonusMultiplier: number } } = {
    [LinhCanQuality.PHAM]: { weight: 40, bonusMultiplier: 1.0 },
    [LinhCanQuality.HOANG]: { weight: 30, bonusMultiplier: 1.2 },
    [LinhCanQuality.HUYEN]: { weight: 15, bonusMultiplier: 1.5 },
    [LinhCanQuality.DIA]: { weight: 10, bonusMultiplier: 2.0 },
    [LinhCanQuality.THIEN]: { weight: 5, bonusMultiplier: 2.5 },
};

export const ELEMENT_STAT_MAP: { [key in Element]?: { primary: Stat, secondary: Stat } } = {
    [Element.KIM]: { primary: Stat.ATK, secondary: Stat.DEF },
    [Element.MOC]: { primary: Stat.HP, secondary: Stat.CON },
    [Element.THUY]: { primary: Stat.MP, secondary: Stat.SPI },
    [Element.HOA]: { primary: Stat.MATK, secondary: Stat.CRIT_RATE },
    [Element.THO]: { primary: Stat.DEF, secondary: Stat.HP },
};

export const ELEMENT_ICONS: { [key in Element]: string } = {
    [Element.KIM]: '⚔️',
    [Element.MOC]: '🌳',
    [Element.THUY]: '💧',
    [Element.HOA]: '🔥',
    [Element.THO]: '⛰️',
    [Element.VO]: '🌀',
};

export const ELEMENT_COLORS: { [key in Element]: string } = {
    [Element.KIM]: 'text-gray-300',
    [Element.MOC]: 'text-green-400',
    [Element.THUY]: 'text-blue-400',
    [Element.HOA]: 'text-red-500',
    [Element.THO]: 'text-yellow-600',
    [Element.VO]: 'text-purple-400',
};
// --- End New Elemental System Constants ---


export const getUpgradeCost = (item: Item): { material: UpgradeMaterial, amount: number } => {
    const level = item.upgradeLevel;
    if (level < 5) return { material: UpgradeMaterial.TINH_THACH_HA_PHAM, amount: (level + 1) * 2 };
    if (level < 10) return { material: UpgradeMaterial.TINH_THACH_TRUNG_PHAM, amount: (level - 4) * 2 };
    return { material: UpgradeMaterial.TINH_THACH_CAO_PHAM, amount: (level - 9) * 2 };
};

export const getSuccessRate = (level: number) => {
    if (level < 3) return 95;   // +1, +2, +3
    if (level < 6) return 80;   // +4, +5, +6
    if (level < 9) return 60;   // +7, +8, +9
    if (level < 12) return 40;  // +10, +11, +12
    if (level < 14) return 25;  // +13, +14
    return 15;                  // +15
};

// Returns true if item level should drop on failure
export const checkDegradeOnFail = (level: number) => {
    if (level >= 9) return true; // 100% chance to drop level at +9 and above
    if (level >= 6) return Math.random() < 0.5; // 50% chance to drop at +6, +7, +8
    return false;
}

export const NUM_SAVE_SLOTS = 3;
export const LOCAL_STORAGE_KEY_API_KEY = 'rpg_ai_sim_api_key';
export const LOCAL_STORAGE_KEY_SETTINGS = 'rpg_ai_sim_settings';
export const LOCAL_STORAGE_KEY_SAVE_GAME = 'rpg_ai_sim_save_';

export const DEFAULT_SETTINGS: AppSettings = {
    gameSpeed: 1,
    difficulty: Difficulty.NORMAL,
    eventFrequency: 0.25, // 25% chance per move
    autoDismantleRarities: {
        [Rarity.COMMON]: false,
        [Rarity.UNCOMMON]: false,
        [Rarity.RARE]: false,
        [Rarity.EPIC]: false,
        [Rarity.LEGENDARY]: false,
        [Rarity.MYTHIC]: false,
    },
    useAdvancedCombatAI: false,
};