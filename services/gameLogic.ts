import { Character, PlayerClass, Stat, Realm, BaseStats, DerivedStats, Item, ItemType, Rarity, UpgradeMaterial, UpgradeConsumable, AttackResult, AffixId, SetBonus, Skill, SkillType, ImageLibraryItem, WorldState, TerrainType, Difficulty, ActiveEffect, SkillEffect, TargetType, SkillEffectType, Combatant, Pet, PetStatus, CultivationTechnique, Faction, MonsterRank, LinhCan, LinhCanQuality, Element, MonsterTemplate, Servant, ServantTask, CultivationTechniqueType } from '../types';
import { REALMS, CLASS_STATS, RARITY_DATA, AVAILABLE_ITEM_TYPES, AVAILABLE_BONUS_STATS, ITEM_SETS, SKILLS, MAP_WIDTH, MAP_HEIGHT, TERRAIN_DATA, DIFFICULTY_MODIFIERS, MONSTER_RANK_MODIFIERS, LINH_CAN_QUALITIES, CUSTOM_CLASS_POINTS_PER_LEVEL } from '../constants';
import { generateItemDetails, generateMonsterName, generateSkill, generateBonusStatsForItem, generateCultivationTechniqueDetails, generateSkillForSkillBook, generateImage } from './geminiService';
import { BOSS_DEFINITIONS } from '../data/bossData';
import { BOSS_SKILLS } from '../data/bossSkills';

export const getRealmForLevel = (level: number): Realm => {
    return REALMS.find(r => level >= r.minLevel && level <= r.maxLevel) || REALMS[REALMS.length - 1];
};

export const generateLinhCan = (): LinhCan => {
    const qualities = Object.entries(LINH_CAN_QUALITIES);
    const totalWeight = qualities.reduce((sum, [, data]) => sum + data.weight, 0);
    let random = Math.random() * totalWeight;

    let chosenQuality: LinhCanQuality = LinhCanQuality.PHAM;
    for (const [quality, data] of qualities) {
        if (random < data.weight) {
            chosenQuality = quality as LinhCanQuality;
            break;
        }
        random -= data.weight;
    }

    const elements = [Element.KIM, Element.MOC, Element.THUY, Element.HOA, Element.THO];
    let chosenElements: Element[] = [];
    const roll = Math.random() * 100;
    let numElements = 1;

    if (roll < 60) numElements = 1;      // 60% chance for 1 element
    else if (roll < 85) numElements = 2; // 25% for 2
    else if (roll < 95) numElements = 3; // 10% for 3
    else if (roll < 99) numElements = 4; // 4% for 4
    else numElements = 5;                // 1% for 5 (Ngũ Hành)

    const shuffledElements = [...elements].sort(() => 0.5 - Math.random());
    chosenElements = shuffledElements.slice(0, numElements);
    
    let description = '';
    const elementNames = chosenElements.join(', ');
    if (numElements === 1) {
        description = `Thiên phú dị bẩm, một Linh Căn ${chosenElements[0]} đơn thuần khiết, đạt đến phẩm cấp ${chosenQuality}.`;
    } else if (numElements === 5) {
        description = `Vạn năm khó gặp, một Ngũ Hành Hỗn Độn Linh Căn, ẩn chứa sức mạnh kinh thiên, đạt đến phẩm cấp ${chosenQuality}.`;
    } else {
        description = `Một Linh Căn hiếm thấy, mang trong mình sức mạnh của các hệ ${elementNames}, đạt đến phẩm cấp ${chosenQuality}.`;
    }


    return {
        quality: chosenQuality,
        elements: chosenElements,
        description: description,
    };
};


export const calculateForgingExpToNextLevel = (level: number): number => {
    return Math.floor(100 * Math.pow(1.5, level - 1));
};

export const getSkillsForLevel = (level: number, playerClass: string): Skill[] => {
    // Custom classes have no predefined skills, they get them from AI during level up
    if (!Object.values(PlayerClass).includes(playerClass as PlayerClass)) {
        return [];
    }
    return SKILLS.filter(skill => skill.class === playerClass && level >= skill.levelRequired);
};

export const calculateExpToNextLevel = (level: number): number => {
    if (level === 0) return 100;
    // Switched to an exponential curve for better RPG progression feel
    return Math.floor(100 * Math.pow(level, 1.5));
};

export const calculateBaseStats = (level: number, playerClass: string, classDefinition?: BaseStats): BaseStats => {
    const realm = getRealmForLevel(level);
    const realmIndex = REALMS.findIndex(r => r.name === realm.name);
    
    const stats: BaseStats = {
        [Stat.STR]: 10,
        [Stat.AGI]: 10,
        [Stat.INT]: 10,
        [Stat.SPI]: 10,
        [Stat.CON]: 10,
        [Stat.DEX]: 10,
    };

    const levelUpStats = classDefinition || CLASS_STATS[playerClass as PlayerClass]?.levelUp;
    
    if (levelUpStats && level > 1) {
        // Optimization: Replaced loop with direct multiplication for performance
        const levelsToGainStats = level - 1;
        stats[Stat.STR] += (levelUpStats.STR || 0) * levelsToGainStats;
        stats[Stat.AGI] += (levelUpStats.AGI || 0) * levelsToGainStats;
        stats[Stat.INT] += (levelUpStats.INT || 0) * levelsToGainStats;
        stats[Stat.SPI] += (levelUpStats.SPI || 0) * levelsToGainStats;
        stats[Stat.CON] += (levelUpStats.CON || 0) * levelsToGainStats;
        stats[Stat.DEX] += (levelUpStats.DEX || 0) * levelsToGainStats;
    }
    
    // Add realm bonuses only for default classes
    if (!classDefinition && Object.values(PlayerClass).includes(playerClass as PlayerClass)) {
        const classStats = CLASS_STATS[playerClass as PlayerClass];
        if (realmIndex >= 0) {
            stats[Stat.STR] += (classStats.realmBonus[Stat.STR] || 0) * (realmIndex + 1);
            stats[Stat.AGI] += (classStats.realmBonus[Stat.AGI] || 0) * (realmIndex + 1);
            stats[Stat.INT] += (classStats.realmBonus[Stat.INT] || 0) * (realmIndex + 1);
            stats[Stat.SPI] += (classStats.realmBonus[Stat.SPI] || 0) * (realmIndex + 1);
            stats[Stat.CON] += (classStats.realmBonus[Stat.CON] || 0) * (realmIndex + 1);
            stats[Stat.DEX] += (classStats.realmBonus[Stat.DEX] || 0) * (realmIndex + 1);
        }
    }
    
    return stats;
};

export const calculateDerivedStats = (level: number, baseStats: BaseStats, equipment: Character['equipment'], skills: Skill[], learnedCultivationTechniques: CultivationTechnique[], activeCultivationTechniqueId: string | null, servants: Servant[]): DerivedStats => {
    const totalBaseStats = { ...baseStats };
    const bonusDerivedStats: { [key: string]: number } = {};
    const percentDerivedStats: { [key: string]: number } = {};

    Object.values(equipment).forEach(item => {
        if (!item) return;
        Object.entries(item.baseStats).forEach(([stat, value]) => {
            if (stat in totalBaseStats) {
                (totalBaseStats as any)[stat] += value;
            } else {
                bonusDerivedStats[stat] = (bonusDerivedStats[stat] || 0) + value;
            }
        });
        Object.entries(item.bonusStats).forEach(([stat, value]) => {
            if (Object.values(Stat).includes(stat as Stat)) {
                 bonusDerivedStats[stat] = (bonusDerivedStats[stat] || 0) + value;
            }
        });
        if (item.soulEffect) {
            const { stat, value, isPercent } = item.soulEffect.bonus;
            if (isPercent) {
                percentDerivedStats[stat] = (percentDerivedStats[stat] || 0) + value;
            } else {
                 if (stat in totalBaseStats) {
                    (totalBaseStats as any)[stat] += value;
                } else {
                    bonusDerivedStats[stat] = (bonusDerivedStats[stat] || 0) + value;
                }
            }
        }
    });

    const activeBonuses = getActiveSetBonuses(equipment);
    activeBonuses.forEach(set => {
        set.bonuses.forEach(({ bonus, active }) => {
            if (active) {
                Object.entries(bonus.stats).forEach(([statKey, value]) => {
                    if (statKey in totalBaseStats) {
                        (totalBaseStats as any)[statKey] += value;
                    } else {
                        bonusDerivedStats[statKey] = (bonusDerivedStats[statKey] || 0) + value;
                    }
                });
            }
        });
    });
    
    // Initialize new accumulators for specific stats
    let evasionFromThanPhap = 0;
    let accuracyFromCongKich = 0;
    let penetrationFromSkillsAndTechniques = 0;

    // Process passive skills
    skills.forEach(skill => {
        if (skill.type === SkillType.PASSIVE) {
            skill.effects.forEach(effect => {
                if (effect.type === SkillEffectType.BUFF && effect.stat && effect.value) {
                     if (effect.stat === Stat.PENETRATION) {
                        penetrationFromSkillsAndTechniques += effect.value;
                     } else if (effect.isPercent) {
                        percentDerivedStats[effect.stat] = (percentDerivedStats[effect.stat] || 0) + effect.value;
                    } else {
                        if (effect.stat in totalBaseStats) {
                            (totalBaseStats as any)[effect.stat] += effect.value;
                        } else {
                            bonusDerivedStats[effect.stat] = (bonusDerivedStats[effect.stat] || 0) + effect.value;
                        }
                    }
                }
            });
        }
    });

    // Process ALL learned cultivation techniques for passive bonuses
    learnedCultivationTechniques.forEach(tech => {
        tech.bonuses.forEach(bonus => {
            const { stat, value, isPercent } = bonus;
            
            if (stat === Stat.EVASION && tech.type === CultivationTechniqueType.THAN_PHAP) {
                evasionFromThanPhap += value;
            } else if (stat === Stat.ACCURACY && tech.type === CultivationTechniqueType.CONG_KICH) {
                accuracyFromCongKich += value;
            } else if (stat === Stat.PENETRATION) {
                penetrationFromSkillsAndTechniques += value;
            } else {
                 if (isPercent) {
                    percentDerivedStats[stat] = (percentDerivedStats[stat] || 0) + value;
                } else {
                    if (stat in totalBaseStats) {
                        (totalBaseStats as any)[stat] += value;
                    } else {
                        bonusDerivedStats[stat] = (bonusDerivedStats[stat] || 0) + value;
                    }
                }
            }
        });
    });

    let derived: DerivedStats = {
        [Stat.HP]: totalBaseStats.CON * 15 + (level * 5),
        [Stat.MP]: totalBaseStats.INT * 5 + totalBaseStats.SPI * 5 + (level * 2),
        [Stat.ATK]: totalBaseStats.STR * 2.0 + (level * 0.5),
        [Stat.MATK]: totalBaseStats.INT * 2.5 + (level * 0.5),
        [Stat.DEF]: totalBaseStats.CON * 1.5 + (level * 0.5),
        [Stat.SPEED]: totalBaseStats.AGI * 1.1 + (level * 0.1),
        [Stat.PENETRATION]: 0,
        [Stat.EVASION]: 0,
        [Stat.CRIT_RATE]: (totalBaseStats.DEX * 0.6 + totalBaseStats.AGI * 0.4) + (level * 0.1),
        [Stat.ACCURACY]: 0,
        [Stat.LIFESTEAL]: 0,
        [Stat.ATK_SPEED]: 0,
        [Stat.FIRE_DMG_BONUS]: 0,
        [Stat.WATER_DMG_BONUS]: 0,
        [Stat.WOOD_DMG_BONUS]: 0,
        [Stat.METAL_DMG_BONUS]: 0,
        [Stat.EARTH_DMG_BONUS]: 0,
        [Stat.FIRE_RES]: 0,
        [Stat.WATER_RES]: 0,
        [Stat.WOOD_RES]: 0,
        [Stat.METAL_RES]: 0,
        [Stat.EARTH_RES]: 0,
    };

    // Apply flat bonuses from equipment etc. to the base derived values before capping
    const baseEvasionFromStats = (totalBaseStats.AGI + totalBaseStats.DEX) * 0.6 + (level * 0.1) + (bonusDerivedStats[Stat.EVASION] || 0);
    const baseAccuracyFromStats = totalBaseStats.DEX * 1.5 + (level * 0.3) + (bonusDerivedStats[Stat.ACCURACY] || 0);
    // Penetration is now a percentage
    const basePenetrationFromStats = (totalBaseStats.STR * 0.1) + (level * 0.05) + (bonusDerivedStats[Stat.PENETRATION] || 0);
    
    // Apply new rules and caps
    const cappedBaseEvasion = Math.min(20, baseEvasionFromStats);
    const cappedSkillEvasion = Math.min(60, evasionFromThanPhap);
    derived[Stat.EVASION] = Math.min(80, cappedBaseEvasion + cappedSkillEvasion);

    const cappedBaseAccuracy = Math.min(10, baseAccuracyFromStats);
    const cappedSkillAccuracy = Math.min(85, accuracyFromCongKich);
    derived[Stat.ACCURACY] = Math.min(95, cappedBaseAccuracy + cappedSkillAccuracy);

    const cappedBasePenetration = Math.min(10, basePenetrationFromStats);
    const cappedSkillPenetration = Math.min(70, penetrationFromSkillsAndTechniques);
    derived[Stat.PENETRATION] = Math.min(80, cappedBasePenetration + cappedSkillPenetration);


    // Apply remaining flat bonuses
    for (const [stat, value] of Object.entries(bonusDerivedStats)) {
        if (stat in derived && ![Stat.EVASION, Stat.ACCURACY, Stat.PENETRATION].includes(stat as Stat)) {
            (derived as any)[stat] += value;
        }
    }
    
    // Apply percentage bonuses to all stats
    for (const [stat, value] of Object.entries(percentDerivedStats)) {
        if (stat in derived) {
            (derived as any)[stat] *= (1 + value / 100);
        }
    }

    // Process servant bonuses
    const guardingServants = servants.filter(s => s.task === ServantTask.GUARDING);
    if (guardingServants.length > 0) {
        const defBonus = guardingServants.reduce((total, servant) => total + (servant.level * 0.5), 0); // 0.5 DEF per level of each guarding servant
        derived[Stat.DEF] += defBonus;
    }

    derived[Stat.HP] = Math.floor(derived[Stat.HP]);
    derived[Stat.MP] = Math.floor(derived[Stat.MP]);
    derived[Stat.ATK] = parseFloat(derived[Stat.ATK].toFixed(2));
    derived[Stat.MATK] = parseFloat(derived[Stat.MATK].toFixed(2));
    derived[Stat.DEF] = parseFloat(derived[Stat.DEF].toFixed(2));
    derived[Stat.SPEED] = parseFloat(derived[Stat.SPEED].toFixed(1));
    derived[Stat.PENETRATION] = parseFloat(derived[Stat.PENETRATION].toFixed(2));
    derived[Stat.EVASION] = parseFloat(derived[Stat.EVASION].toFixed(2));
    derived[Stat.CRIT_RATE] = parseFloat(derived[Stat.CRIT_RATE].toFixed(2));
    derived[Stat.ACCURACY] = parseFloat(derived[Stat.ACCURACY].toFixed(2));
    derived[Stat.LIFESTEAL] = parseFloat(derived[Stat.LIFESTEAL].toFixed(2));
    derived[Stat.ATK_SPEED] = 0; // Removed
    
    return derived;
};


export const calculateBonusStatsFromEquipment = (equipment: Character['equipment']): Partial<DerivedStats> => {
    const bonusStats: Partial<DerivedStats> = {};

    const addToBonus = (stat: string, value: number) => {
        (bonusStats as any)[stat] = ((bonusStats as any)[stat] || 0) + value;
    }

    // Equipment
    Object.values(equipment).forEach(item => {
        if (!item) return;
        // Base stats from items are considered bonuses in this context
        Object.entries(item.baseStats).forEach(([stat, value]) => addToBonus(stat, value));
        
        // Bonus stats
        Object.entries(item.bonusStats).forEach(([stat, value]) => {
             if (Object.values(Stat).includes(stat as Stat)) {
                addToBonus(stat, value);
            }
        });
        
        // Soul effect (only flat bonuses for this display)
        if (item.soulEffect && !item.soulEffect.bonus.isPercent) {
            addToBonus(item.soulEffect.bonus.stat, item.soulEffect.bonus.value);
        }
    });

    // Set Bonuses
    const activeBonuses = getActiveSetBonuses(equipment);
    activeBonuses.forEach(set => {
        set.bonuses.forEach(({ bonus, active }) => {
            if (active) {
                Object.entries(bonus.stats).forEach(([statKey, value]) => {
                    addToBonus(statKey, value);
                });
            }
        });
    });

    return bonusStats;
};

export const calculateBaseStatBonusesFromEquipment = (equipment: Character['equipment']): Partial<BaseStats> => {
    const bonuses: BaseStats = {
        [Stat.STR]: 0,
        [Stat.AGI]: 0,
        [Stat.INT]: 0,
        [Stat.SPI]: 0,
        [Stat.CON]: 0,
        [Stat.DEX]: 0,
    };

    const addToBonus = (stat: string, value: number) => {
        // Check if the stat key is one of the base stats we are tracking.
        if (stat in bonuses) {
             (bonuses as any)[stat] += value;
        }
    };

    // Iterate over all equipped items
    Object.values(equipment).forEach(item => {
        if (!item) return;

        // Add values from the item's primary stats
        Object.entries(item.baseStats).forEach(([stat, value]) => addToBonus(stat, value));
        
        // Add values from the item's bonus stats (if they happen to be base stats)
        Object.entries(item.bonusStats).forEach(([stat, value]) => addToBonus(stat, value));
        
        // Add values from the item's soul effect if it's a flat bonus to a base stat
        if (item.soulEffect && !item.soulEffect.bonus.isPercent) {
            addToBonus(item.soulEffect.bonus.stat, item.soulEffect.bonus.value);
        }
    });

    // Add values from active set bonuses
    const activeBonuses = getActiveSetBonuses(equipment);
    activeBonuses.forEach(set => {
        set.bonuses.forEach(({ bonus, active }) => {
            if (active) {
                Object.entries(bonus.stats).forEach(([statKey, value]) => {
                    addToBonus(statKey, value);
                });
            }
        });
    });

    return bonuses;
};

export const getTerrainFromPosition = (position: { x: number, y: number }): TerrainType => {
    // Simple logic based on Vạn Linh Giới regions
    // Bắc Hoang (North: y < 1024)
    if (position.y < 1024) return TerrainType.MOUNTAIN;
    // Nam Cương (South: y > 3072)
    if (position.y > 3072) return TerrainType.FOREST;
    // Trung Vực (Center)
    return TerrainType.PLAIN;
};

export const createInitialCharacter = (name: string, playerClass: string, classDefinition?: BaseStats, factions: Faction[] = []): Character => {
    const level = 1;
    const baseStats = calculateBaseStats(level, playerClass, classDefinition);
    const equipment = {};
    const skills = getSkillsForLevel(level, playerClass);
    const learnedCultivationTechniques: CultivationTechnique[] = [];
    const activeCultivationTechniqueId = null;
    const servants: Servant[] = [];
    const derivedStats = calculateDerivedStats(level, baseStats, equipment, skills, learnedCultivationTechniques, activeCultivationTechniqueId, servants);
    
    // Player starts in Trung Vực, near Thái Thanh Thành
    const startPosition = { x: 2048, y: 2048 };
    
    const initialReputation: { [factionId: string]: number } = {};
    factions.forEach(faction => {
        initialReputation[faction.id] = 0; // Start neutral
    });

    const linhCan = generateLinhCan();

    return {
        id: crypto.randomUUID(),
        name,
        playerClass,
        classDefinition,
        level,
        exp: 0,
        expToNextLevel: calculateExpToNextLevel(level),
        realm: getRealmForLevel(level),
        baseStats,
        derivedStats,
        currentHp: derivedStats.HP,
        currentMp: derivedStats.MP,
        backstory: '',
        inventory: [],
        equipment,
        materials: {
            [UpgradeMaterial.TINH_THACH_HA_PHAM]: 20,
            [UpgradeMaterial.LINH_HON_THACH]: 3,
        },
        consumables: {
            [UpgradeConsumable.BUA_SAO]: 2,
            [UpgradeConsumable.BOT_THAN_TUY]: 1,
            [UpgradeConsumable.LINH_THU_PHU]: 5,
            [UpgradeConsumable.LINH_THU_THUC]: 10,
            [UpgradeConsumable.HON_AN_PHU]: 2,
        },
        skills,
        activeEffects: [],
        position: startPosition,
        quests: [],
        pets: [],
        activePetId: null,
        forgingProficiency: { level: 1, exp: 0, expToNextLevel: calculateForgingExpToNextLevel(1) },
        learnedCultivationTechniques: [],
        activeCultivationTechniqueId: null,
        reputation: initialReputation,
        sectId: null,
        sectRank: null,
        sectContributionPoints: 0,
        npcAffinity: {},
        metNpcs: [],
        currentDungeonId: null,
        linhCan: linhCan,
        unallocatedStatPoints: 0,
        retainers: [],
        activeRetainerId: null,
        servants: [],
    };
};

export const createMonster = async (
    playerLevel: number, 
    imageLibrary: ImageLibraryItem[], 
    difficulty: Difficulty, 
    worldState: WorldState, 
    playerPosition: { x: number, y: number },
    options?: { forcedRank?: MonsterRank, fixedLevel?: number, forcedName?: string }
): Promise<Character> => {
    const difficultyMods = DIFFICULTY_MODIFIERS[difficulty];
    let rank: MonsterRank;

    if (options?.forcedRank) {
        rank = options.forcedRank;
    } else {
        const rankRoll = Math.random() * 100;
        if (rankRoll < 70) rank = MonsterRank.Thường;
        else if (rankRoll < 95) rank = MonsterRank.TinhAnh;
        else rank = MonsterRank.ThủLĩnh;

        // Difficulty modifier for rank
        const difficultyRankRoll = Math.random();
        if (difficultyMods.enemyRankUpChance > 0 && difficultyRankRoll < difficultyMods.enemyRankUpChance) {
            if (rank === MonsterRank.Thường) rank = MonsterRank.TinhAnh;
            else if (rank === MonsterRank.TinhAnh) rank = MonsterRank.ThủLĩnh;
        } else if (difficultyMods.enemyRankUpChance < 0 && difficultyRankRoll < Math.abs(difficultyMods.enemyRankUpChance)) {
            if (rank === MonsterRank.ThủLĩnh) rank = MonsterRank.TinhAnh;
            else if (rank === MonsterRank.TinhAnh) rank = MonsterRank.Thường;
        }
    }
    const rankModifiers = MONSTER_RANK_MODIFIERS[rank];

    let name: string;
    let monsterClass: string;
    let imageUrl: string | undefined;
    let imagePrompt: string | undefined;
    let originalName: string;
    let level: number;
    const monsterLinhCan = generateLinhCan();

    const currentTerrain = getTerrainFromPosition(playerPosition);
    const levelRange = 5;
    const suitableTemplates = worldState.bestiary.filter(m => 
        (options?.forcedName ? m.name === options.forcedName : m.habitats.includes(currentTerrain)) &&
        m.level &&
        m.level >= Math.max(1, playerLevel - levelRange) &&
        m.level <= playerLevel + levelRange
    );

    let template: (MonsterTemplate & { level: number }) | null = null;
    if (suitableTemplates.length > 0) {
        template = suitableTemplates[Math.floor(Math.random() * suitableTemplates.length)] as (MonsterTemplate & { level: number });
    }
    
    if (template) {
        level = options?.fixedLevel ?? template.level;
        name = template.name;
        originalName = template.name;
        monsterClass = template.baseClass;
        imageUrl = template.imageUrl;
        imagePrompt = template.imagePrompt;
        if (template.element && template.element !== Element.VO) {
            monsterLinhCan.elements = [template.element];
        }
    } else {
        level = options?.fixedLevel ?? Math.max(1, playerLevel + Math.floor(Math.random() * 5) - 2);
        const primaryElement = monsterLinhCan.elements[0] || Element.VO;
        monsterClass = `Quái Vật hệ ${primaryElement}`;
        const monsterImages = imageLibrary.filter(img => img.isMonster);
        name = `Yêu Thú lv ${level}`;

        if (monsterImages.length > 0) {
            const randomMonsterImage = monsterImages[Math.floor(Math.random() * monsterImages.length)];
            imagePrompt = randomMonsterImage.description || `một yêu thú đáng sợ`;
            imageUrl = randomMonsterImage.url;
            try {
                name = await generateMonsterName(imagePrompt, level);
            } catch (error) {
                console.error("AI monster name generation failed, using fallback:", error);
                name = randomMonsterImage.description || `Yêu Thú lv ${level}`;
            }
        }
        originalName = name;
    }
    
    if (!imageUrl && imagePrompt) {
        try {
            console.log(`Generating image for monster: ${name} with prompt: "${imagePrompt}"`);
            const imageResult = await generateImage(imagePrompt, false);
            if (imageResult.imageUrl) {
                imageUrl = imageResult.imageUrl;
            } else {
                 console.warn("AI image generation failed for monster:", imageResult.error);
            }
        } catch (error) {
            console.error("Error during AI image generation for monster:", error);
        }
    }

    const baseStats = calculateBaseStats(level, monsterClass);
    let skills: Skill[] = [];
    const numBaseSkills = Math.floor(level / 10) + (difficulty === Difficulty.HARD ? 1 : 0) + (difficulty === Difficulty.HELL ? 2 : 0);
    const totalActiveSkills = numBaseSkills + rankModifiers.bonusActiveSkills;
    const totalPassiveSkills = rankModifiers.bonusPassiveSkills;

    for (let i = 0; i < totalActiveSkills; i++) {
        try {
            const skill = await generateSkill(monsterClass, level, getRealmForLevel(level).name, SkillType.ACTIVE, false, difficulty);
            skills.push(skill);
        } catch (error) {
            console.error(`Failed to generate active skill ${i+1} for monster`, error);
        }
    }
     for (let i = 0; i < totalPassiveSkills; i++) {
        try {
            const skill = await generateSkill(monsterClass, level, getRealmForLevel(level).name, SkillType.PASSIVE, false, difficulty);
            skills.push(skill);
        } catch (error) {
            console.error(`Failed to generate passive skill ${i+1} for monster`, error);
        }
    }


    let derivedStats = calculateDerivedStats(level, baseStats, {}, skills, [], null, []);

    // Apply difficulty and rank stat multipliers
    const totalStatMultiplier = difficultyMods.monsterStatMultiplier * rankModifiers.statMultiplier;
    derivedStats[Stat.HP] = Math.floor(derivedStats[Stat.HP] * totalStatMultiplier);
    derivedStats[Stat.ATK] = parseFloat((derivedStats[Stat.ATK] * totalStatMultiplier).toFixed(2));
    derivedStats[Stat.MATK] = parseFloat((derivedStats[Stat.MATK] * totalStatMultiplier).toFixed(2));
    derivedStats[Stat.DEF] = parseFloat((derivedStats[Stat.DEF] * totalStatMultiplier).toFixed(2));
    
    const humanoidClasses = ["Ma Vật", "Linh Hồn", "Dị Thể AI", "Ma Thú", "Thánh Trí AI", "Dị Thể Không Gian"];
    const isHumanoid = humanoidClasses.includes(monsterClass);

    const monsterCharacter: Character = {
        id: crypto.randomUUID(),
        name: rank === MonsterRank.Thường ? name : `[${rank}] ${name}`,
        originalName,
        playerClass: monsterClass,
        level,
        exp: 0,
        expToNextLevel: Infinity,
        realm: getRealmForLevel(level),
        baseStats,
        derivedStats,
        currentHp: derivedStats.HP,
        currentMp: derivedStats.MP,
        inventory: [],
        equipment: {},
        materials: {},
        consumables: {},
        skills,
        activeEffects: [],
        imageUrl,
        position: {x: -1, y: -1},
        quests: [],
        pets: [],
        activePetId: null,
        forgingProficiency: { level: 1, exp: 0, expToNextLevel: 100 },
        learnedCultivationTechniques: [],
        activeCultivationTechniqueId: null,
        reputation: {},
        sectId: null,
        sectRank: null,
        sectContributionPoints: 0,
        npcAffinity: {},
        metNpcs: [],
        rank,
        currentDungeonId: null,
        linhCan: monsterLinhCan,
        retainers: [],
        activeRetainerId: null,
        servants: [],
        isHumanoid,
    };
    
    return monsterCharacter;
};

export const createBoss = async (playerLevel: number, imageLibrary: ImageLibraryItem[], difficulty: Difficulty, worldState: WorldState, playerPosition: { x: number, y: number }, forcedBossName?: string): Promise<Character> => {
    
    const bossName = forcedBossName || 'Nguyên Chủ Thánh Trí';
    const bossTemplate = worldState.bestiary.find(m => m.name === bossName);

    if (bossTemplate && bossName in BOSS_DEFINITIONS) {
        const bossDataDefinition = BOSS_DEFINITIONS[bossName as keyof typeof BOSS_DEFINITIONS];
        
        const bossBase = await createMonster(
            playerLevel, imageLibrary, difficulty, worldState, playerPosition,
            { forcedRank: MonsterRank.HùngChủ, fixedLevel: bossTemplate.level || 70, forcedName: bossName }
        );
        bossBase.name = bossTemplate.name; // Overwrite random name
        bossBase.isBoss = true;

        const firstPhase = bossDataDefinition.phases[0];
        bossBase.bossData = {
            phases: bossDataDefinition.phases,
            currentPhaseIndex: 0,
            minions: [],
        };
        bossBase.skills = BOSS_SKILLS.filter(s => firstPhase.skills.includes(s.id));
        bossBase.isImmune = firstPhase.isImmuneWhileMinionsExist;
        bossBase.name = `${bossBase.name} - ${firstPhase.name}`;
        
        return bossBase;
    }

    // Fallback to old boss logic
    const bossLevel = Math.max(5, playerLevel + Math.floor(Math.random() * 4) + 3);
    const boss = await createMonster(
        playerLevel, 
        imageLibrary, 
        difficulty, 
        worldState, 
        playerPosition, 
        { forcedRank: MonsterRank.HùngChủ, fixedLevel: bossLevel }
    );
    boss.isBoss = true;
    return boss;
};


export const gainExp = async (character: Character, expGained: number): Promise<{ char: Character, leveledUp: boolean, messages: string[] }> => {
    let newChar = { ...character };
    const oldRealmName = character.realm.name;
    const oldLevel = character.level;
    newChar.exp += expGained;
    let leveledUp = false;
    const messages: string[] = [];
    const isCustomClass = !Object.values(PlayerClass).includes(newChar.playerClass as PlayerClass);

    // Correctly handle multiple level-ups
    while (newChar.exp >= newChar.expToNextLevel) {
        newChar.exp -= newChar.expToNextLevel;
        newChar.level++;
        newChar.expToNextLevel = calculateExpToNextLevel(newChar.level); // Recalculate for next iteration
        leveledUp = true;
        messages.push(`✨ Chúc mừng! Bạn đã đạt đến cấp ${newChar.level}!`);
    }

    if (leveledUp) {
        // Grant new skills and stat points for custom classes
        if (isCustomClass) {
            const levelsGained = newChar.level - oldLevel;
            const pointsGained = levelsGained * CUSTOM_CLASS_POINTS_PER_LEVEL;
            newChar.unallocatedStatPoints = (newChar.unallocatedStatPoints || 0) + pointsGained;
            if(pointsGained > 0) {
                messages.push(`💪 Bạn nhận được ${pointsGained} điểm tiềm năng để phân bổ!`);
            }

            for (let lvl = oldLevel + 1; lvl <= newChar.level; lvl++) {
                if (lvl % 5 === 0) {
                     try {
                        const newSkill = await generateSkill(newChar.playerClass, lvl, newChar.realm.name, SkillType.ACTIVE, false, Difficulty.NORMAL);
                        newChar.skills.push(newSkill);
                        messages.push(`🔥 Bằng kinh nghiệm chiến đấu, bạn đã tự sáng tạo ra chiêu thức mới: [${newSkill.name}]!`);
                     } catch (error) {
                        console.error("Failed to generate custom class skill:", error);
                     }
                }
            }
        }

        newChar = await fullyUpdateCharacter(newChar);
        // BUG FIX: Restore HP and MP on level up
        newChar.currentHp = newChar.derivedStats.HP;
        newChar.currentMp = newChar.derivedStats.MP;
        messages.push(`HP và MP đã được phục hồi hoàn toàn.`);
        
        if (newChar.realm.name !== oldRealmName) {
            messages.push(`⚡ Cảnh giới đột phá! Bạn đã tiến vào ${newChar.realm.name}!`);
            try {
                // Generate a special realm skill
                const realmSkill = await generateSkill(newChar.playerClass, newChar.level, newChar.realm.name, SkillType.PASSIVE, true, Difficulty.NORMAL);
                newChar.skills.push(realmSkill);
                newChar = await fullyUpdateCharacter(newChar); // Recalculate stats with the new skill
                messages.push(`🔥 Bạn đã lĩnh ngộ được thần thông cảnh giới mới: [${realmSkill.name}]!`);
            } catch (error) {
                console.error("Failed to generate realm skill:", error);
                messages.push("Bạn cảm thấy sức mạnh của mình tăng lên nhưng chưa thể nắm bắt được thần thông mới.");
            }
        }
    } else {
        newChar.expToNextLevel = calculateExpToNextLevel(newChar.level);
    }
    
    return {char: newChar, leveledUp, messages};
};

export const fullyUpdateCharacter = async (character: Character): Promise<Character> => {
    const newChar = { 
        ...character,
        classDefinition: character.classDefinition || undefined,
        skills: character.skills || [],
        activeEffects: character.activeEffects || [],
        position: character.position || { x: 2048, y: 2048 },
        quests: character.quests || [],
        pets: character.pets || [],
        activePetId: character.activePetId || null,
        forgingProficiency: character.forgingProficiency || { level: 1, exp: 0, expToNextLevel: 100 },
        learnedCultivationTechniques: (character.learnedCultivationTechniques || []).map(tech => ({
            ...tech,
            type: tech.type || CultivationTechniqueType.TAM_PHAP, // Ensure every technique has a type for filtering
        })),
        activeCultivationTechniqueId: character.activeCultivationTechniqueId || null,
        reputation: character.reputation || {},
        sectId: character.sectId || null,
        sectRank: character.sectRank || null,
        sectContributionPoints: character.sectContributionPoints || 0,
        npcAffinity: character.npcAffinity || {},
        metNpcs: character.metNpcs || [],
        retainers: character.retainers || [],
        activeRetainerId: character.activeRetainerId || null,
        servants: character.servants || [],
    };
    newChar.realm = getRealmForLevel(newChar.level);
    
    const predefinedSkills = getSkillsForLevel(newChar.level, newChar.playerClass);
    const existingPredefinedIds = new Set(newChar.skills.map(s => s.id));
    predefinedSkills.forEach(ps => {
        if (!existingPredefinedIds.has(ps.id)) {
            newChar.skills.push(ps);
        }
    });

    newChar.baseStats = calculateBaseStats(newChar.level, newChar.playerClass, newChar.classDefinition);
    newChar.derivedStats = calculateDerivedStats(newChar.level, newChar.baseStats, newChar.equipment, newChar.skills, newChar.learnedCultivationTechniques, newChar.activeCultivationTechniqueId, newChar.servants);
    newChar.expToNextLevel = calculateExpToNextLevel(newChar.level);
    
    // Cap HP and MP to new max values
    newChar.currentHp = Math.min(character.currentHp, newChar.derivedStats.HP);
    newChar.currentMp = Math.min(character.currentMp, newChar.derivedStats.MP);

    return newChar;
};

export const generateItem = async (itemLevel: number, character: Character, forcedRarity?: Rarity, forcedType?: ItemType): Promise<Item> => {
    let rarity: Rarity;
    if (forcedRarity) {
        rarity = forcedRarity;
    } else {
        const rarityRoll = Math.random() * 100;
        if (rarityRoll < 60) rarity = Rarity.COMMON;
        else if (rarityRoll < 85) rarity = Rarity.UNCOMMON;
        else if (rarityRoll < 95) rarity = Rarity.RARE;
        else if (rarityRoll < 99) rarity = Rarity.EPIC;
        else if (rarityRoll < 99.9) rarity = Rarity.LEGENDARY;
        else rarity = Rarity.MYTHIC;
    }

    const rarityInfo = RARITY_DATA[rarity];
    const itemType = forcedType || AVAILABLE_ITEM_TYPES[Math.floor(Math.random() * AVAILABLE_ITEM_TYPES.length)];

    // Handle unique AI-generated items
    if (itemType === ItemType.CULTIVATION_MANUAL) {
        const techniqueDetails = await generateCultivationTechniqueDetails(character);
        return {
            id: crypto.randomUUID(),
            name: `Công Pháp: ${techniqueDetails.name}`,
            description: techniqueDetails.description,
            type: itemType,
            level: itemLevel,
            rarity,
            baseStats: {},
            bonusStats: {},
            upgradeLevel: 0,
            maxUpgrade: 0,
            history: [],
            evolved: false,
            cultivationTechniqueDetails: techniqueDetails
        };
    }

    if (itemType === ItemType.SKILL_BOOK) {
        const skillDetails = await generateSkillForSkillBook(character);
        return {
            id: crypto.randomUUID(),
            name: `Sách Kỹ Năng: ${skillDetails.name}`,
            description: `Một cuốn sách cổ chứa đựng bí thuật [${skillDetails.name}].`,
            type: itemType,
            level: itemLevel,
            rarity,
            baseStats: {},
            bonusStats: {},
            upgradeLevel: 0,
            maxUpgrade: 0,
            history: [],
            evolved: false,
            skillDetails
        };
    }

    // Handle standard equipment
    let baseStats: { [key: string]: number } = {};
    switch (itemType) {
        case ItemType.WEAPON:
            const isPhysical = Math.random() < 0.7;
            if (isPhysical) {
                baseStats[Stat.ATK] = itemLevel * 2.2 + 5;
            } else {
                baseStats[Stat.MATK] = itemLevel * 2.5 + 5;
            }
            break;
        case ItemType.ARMOR:
            baseStats[Stat.DEF] = itemLevel * 1.8 + 8;
            baseStats[Stat.HP] = itemLevel * 10;
            break;
        case ItemType.RING:
            const ringStats = [Stat.CRIT_RATE, Stat.STR, Stat.AGI, Stat.INT, Stat.DEX];
            const chosenRingStat = ringStats[Math.floor(Math.random() * ringStats.length)];
            baseStats[chosenRingStat] = (chosenRingStat === Stat.CRIT_RATE) ? itemLevel * 0.2 + 1 : itemLevel * 1.5 + 3;
            break;
        case ItemType.AMULET:
            const amuletStats = [Stat.HP, Stat.MP, Stat.CON, Stat.PENETRATION];
            const chosenAmuletStat = amuletStats[Math.floor(Math.random() * amuletStats.length)];
            baseStats[chosenAmuletStat] = chosenAmuletStat === Stat.HP ? itemLevel * 15 : chosenAmuletStat === Stat.MP ? itemLevel * 10 : itemLevel * 1.5 + 2;
            break;
    }
    // Apply rarity multiplier to all base stats
    for (const key in baseStats) {
        baseStats[key] = Math.floor(baseStats[key] * rarityInfo.multiplier);
    }
    
    let bonusStats: { [key: string]: number } = {};
    let itemName = `${rarity} ${itemType}`;
    let itemDescription: string | undefined;
    let setId: string | undefined;
    let setName: string | undefined;

    // Preliminary item for AI context
    const prelimItem: Item = {
        id: 'temp', name: itemName, type: itemType, level: itemLevel, rarity, baseStats, bonusStats: {},
        upgradeLevel: 0, maxUpgrade: rarityInfo.maxUpgrade, history: [], evolved: false,
    };

    // Generate name and description first for better AI context
    if (rarity >= Rarity.RARE) {
        try {
            const details = await generateItemDetails(prelimItem);
            itemName = details.name;
            itemDescription = details.description;
        } catch (e) {
            console.error("AI item detail generation failed, using fallback.", e);
        }
    }

    prelimItem.name = itemName;
    prelimItem.description = itemDescription;
    
    const isSetItem = [Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC].includes(rarity) && Math.random() < 0.20;
    if (isSetItem && !itemDescription) { // If it's a set item but had no AI description, try to get a set name
        const setKeys = Object.keys(ITEM_SETS);
        const randomSetId = setKeys[Math.floor(Math.random() * setKeys.length)];
        const chosenSet = ITEM_SETS[randomSetId];
        if (chosenSet.items[itemType]) {
            setId = chosenSet.id;
            setName = chosenSet.name;
            prelimItem.name = chosenSet.items[itemType]!; // Overwrite name with set item name
        }
    }
    prelimItem.setId = setId;
    prelimItem.setName = setName;
    

    // Now, generate bonus stats with full context
    const numBonusStats = rarityInfo.bonusStats;
    if (numBonusStats > 0) {
        try {
            bonusStats = await generateBonusStatsForItem(prelimItem, numBonusStats);
        } catch (e) {
            console.error("AI bonus stat generation failed, using fallback random generation.", e);
            // Fallback logic
            const availableBonuses = Object.values(Stat).filter(s => ![Stat.HP, Stat.MP, Stat.ATK, Stat.MATK, Stat.DEF, Stat.ATK_SPEED].includes(s));
            for (let i = 0; i < numBonusStats; i++) {
                if(availableBonuses.length === 0) break;
                const randIndex = Math.floor(Math.random() * availableBonuses.length);
                const selectedStat = availableBonuses.splice(randIndex, 1)[0];
                const value = Math.max(1, Math.floor((itemLevel / 4 + 1) * rarityInfo.multiplier * (0.8 + Math.random() * 0.4)));
                bonusStats[selectedStat] = value;
            }
        }
    }

    return {
        ...prelimItem,
        id: crypto.randomUUID(),
        bonusStats,
    };
};

export const performAttack = (attacker: Combatant, defender: Combatant): AttackResult => {
    const result: AttackResult = {
        damage: 0,
        messages: [],
        crit: false,
        miss: false,
        lifestealAmount: 0,
        appliedEffects: [],
    };

    const hitRoll = Math.random() * 100;
    const chanceToHit = Math.max(10, Math.min(95, 50 + attacker.derivedStats[Stat.ACCURACY] - defender.derivedStats[Stat.EVASION]));

    if (hitRoll > chanceToHit) {
        result.miss = true;
        result.messages.push(`${attacker.name} tấn công nhưng ${defender.name} đã né được!`);
        return result;
    }
    
    const attackerClass = 'playerClass' in attacker ? attacker.playerClass : (attacker as Pet).monsterClass;
    result.crit = Math.random() * 100 < attacker.derivedStats[Stat.CRIT_RATE];
    const baseDamage = attackerClass.includes('Pháp Tu') ? attacker.derivedStats.MATK : attacker.derivedStats[Stat.ATK];
    const critMultiplier = result.crit ? 1.5 : 1;

    const penetrationPercent = attacker.derivedStats[Stat.PENETRATION] / 100;
    const effectiveDef = Math.max(0, defender.derivedStats[Stat.DEF] * (1 - penetrationPercent));
    const damageReductionPercent = effectiveDef / (effectiveDef + attacker.level * 20);
    let finalDamage = Math.max(1, (baseDamage * critMultiplier) * (1 - damageReductionPercent));

    result.damage = Math.floor(finalDamage);

    if (result.crit) {
        result.messages.push(`💥 ĐÒN CHÍ MẠNG! ${attacker.name} tấn công ${defender.name}, gây ${result.damage} sát thương!`);
    } else {
        result.messages.push(`${attacker.name} tấn công ${defender.name}, gây ${result.damage} sát thương.`);
    }

    if ('equipment' in attacker) {
         // Handle Lifesteal from stats and affixes
        let lifestealPercentage = (attacker.derivedStats[Stat.LIFESTEAL] || 0) / 100;

        const weapon = attacker.equipment[ItemType.WEAPON];
        if (weapon?.affix?.id === AffixId.LIFESTEAL) {
            lifestealPercentage += 0.10; // 10% lifesteal from affix
        }
        
        if (lifestealPercentage > 0) {
            const healed = Math.floor(result.damage * lifestealPercentage);
            if (healed > 0) {
                result.lifestealAmount = healed;
                result.messages.push(`🩸 ${attacker.name} được Hút Máu hồi ${healed} HP.`);
            }
        }

        // Handle other Affixes
        if (weapon?.affix?.id === AffixId.ECHO_DAMAGE) {
            const echoDmg = Math.floor(result.damage * 0.20); // 20% echo
            result.damage += echoDmg;
            result.messages.push(`🔊 Sát thương Vang Vọng gây thêm ${echoDmg} sát thương!`);
        }
    }


    return result;
};

export const useSkill = (attacker: Combatant, defender: Combatant, skill: Skill): AttackResult => {
    const result: AttackResult = {
        damage: 0,
        messages: [`${attacker.name} sử dụng kỹ năng [${skill.name}]!`],
        crit: false,
        miss: false,
        lifestealAmount: 0,
        appliedEffects: []
    };

    let totalDamage = 0;

    for (const effect of skill.effects) {
        if (effect.chance && Math.random() * 100 > effect.chance) {
            continue; // Effect did not trigger
        }

        if (effect.target === TargetType.ENEMY) {
            // Apply effect to defender
            const effectResult = applyEffectToTarget(effect, skill, attacker, defender);
            totalDamage += effectResult.damage;
            result.messages.push(...effectResult.messages);
            result.appliedEffects.push(...effectResult.appliedEffects);
        } else if (effect.target === TargetType.SELF) {
            // Apply effect to attacker
             const effectResult = applyEffectToTarget(effect, skill, attacker, attacker); // Target is self
             result.messages.push(...effectResult.messages);
             result.appliedEffects.push(...effectResult.appliedEffects);
        }
    }
    
    result.damage = totalDamage;
    return result;
};


const applyEffectToTarget = (effect: SkillEffect, skill: Skill, Caster: Combatant, Target: Combatant): { damage: number, messages: string[], appliedEffects: ActiveEffect[] } => {
    let damage = 0;
    const messages: string[] = [];
    const appliedEffects: ActiveEffect[] = [];
    const isSelfTarget = Caster.id === Target.id;
    const casterClass = 'playerClass' in Caster ? Caster.playerClass : (Caster as Pet).monsterClass;

    switch (effect.type) {
        case SkillEffectType.DAMAGE: {
            const hitRoll = Math.random() * 100;
            const chanceToHit = Math.max(10, Math.min(95, 80 + Caster.derivedStats[Stat.ACCURACY] - Target.derivedStats[Stat.EVASION]));
            if (hitRoll > chanceToHit) {
                messages.push(`Nhưng ${Target.name} đã né được!`);
                break;
            }

            const isCrit = Math.random() * 100 < Caster.derivedStats[Stat.CRIT_RATE];
            const baseDamage = casterClass.includes('Pháp Tu') ? Caster.derivedStats.MATK : Caster.derivedStats.ATK;
            const critMultiplier = isCrit ? 1.5 : 1;
            const powerMultiplier = effect.powerMultiplier || 1.0;
            
            const skillPenetrationBonus = skill.id === 'kiemtu_active_1' ? 25 : 0; // Đâm Lén ignores 25% armor
            const totalPenetrationPercent = Math.min(100, Caster.derivedStats[Stat.PENETRATION] + skillPenetrationBonus);
            const effectiveDef = Math.max(0, Target.derivedStats.DEF * (1 - totalPenetrationPercent / 100));
            const damageReductionPercent = effectiveDef / (effectiveDef + Caster.level * 20);
            const finalDamage = Math.max(1, (baseDamage * powerMultiplier * critMultiplier) * (1 - damageReductionPercent));
            
            damage = Math.floor(finalDamage);
            const critText = isCrit ? '💥 ĐÒN CHÍ MẠNG! ' : '';
            messages.push(`${critText}Kỹ năng gây ${damage} sát thương lên ${Target.name}.`);
            break;
        }
        case SkillEffectType.HEAL: {
            const baseHeal = Caster.derivedStats.MATK;
            const powerMultiplier = effect.powerMultiplier || 1.0;
            const healedAmount = Math.floor(baseHeal * powerMultiplier + (effect.value || 0));
            damage = -healedAmount; // Negative damage represents healing
            messages.push(`✨ ${Target.name} được hồi ${healedAmount} HP.`);
            break;
        }
        case SkillEffectType.BUFF:
        case SkillEffectType.DEBUFF:
        case SkillEffectType.DOT:
        case SkillEffectType.HOT:
        case SkillEffectType.STUN: 
        case SkillEffectType.DISABLE_SKILL: {
            const newActiveEffect: ActiveEffect = {
                id: crypto.randomUUID(),
                sourceSkillName: skill.name,
                effect: effect,
                remainingTurns: effect.duration || 1,
            };
            appliedEffects.push(newActiveEffect);
            messages.push(`🌀 ${Target.name} bị ảnh hưởng bởi [${effect.description}].`);
            break;
        }
    }
    return { damage, messages, appliedEffects };
};


export const getActiveSetBonuses = (equipment: Character['equipment']): { setName: string, pieceCount: number, totalPieces: number, bonuses: { bonus: SetBonus, active: boolean }[] }[] => {
    const equippedSets: { [key: string]: number } = {};
    Object.values(equipment).forEach(item => {
        if (item?.setId) {
            equippedSets[item.setId] = (equippedSets[item.setId] || 0) + 1;
        }
    });

    const result = Object.entries(equippedSets).map(([setId, count]) => {
        const setInfo = ITEM_SETS[setId];
        if (!setInfo) return null;

        return {
            setName: setInfo.name,
            pieceCount: count,
            totalPieces: Object.keys(setInfo.items).length,
            bonuses: setInfo.bonuses.map(bonus => ({
                bonus: bonus,
                active: count >= bonus.pieces
            })).sort((a,b) => a.bonus.pieces - b.bonus.pieces)
        };
    });

    return result.filter(r => r !== null) as Exclude<typeof result[0], null>[];
};

export const getDismantleResult = (item: Item): { [key in UpgradeMaterial]?: number } => {
    const materials: { [key in UpgradeMaterial]?: number } = {};
    const { rarity, upgradeLevel } = item;

    let baseMaterial: UpgradeMaterial;
    let baseAmount: number;

    switch (rarity) {
        case Rarity.COMMON:
            baseMaterial = UpgradeMaterial.TINH_THACH_HA_PHAM;
            baseAmount = 1;
            break;
        case Rarity.UNCOMMON:
            baseMaterial = UpgradeMaterial.TINH_THACH_HA_PHAM;
            baseAmount = 2;
            break;
        case Rarity.RARE:
            baseMaterial = UpgradeMaterial.TINH_THACH_TRUNG_PHAM;
            baseAmount = 1;
            break;
        case Rarity.EPIC:
            baseMaterial = UpgradeMaterial.TINH_THACH_TRUNG_PHAM;
            baseAmount = 2;
            break;
        case Rarity.LEGENDARY:
            baseMaterial = UpgradeMaterial.TINH_THACH_CAO_PHAM;
            baseAmount = 1;
            break;
        case Rarity.MYTHIC:
            baseMaterial = UpgradeMaterial.TINH_THACH_CAO_PHAM;
            baseAmount = 2;
            break;
        default:
            return {};
    }

    // Add materials based on upgrade level
    const upgradeBonus = Math.floor(upgradeLevel * 1.2);
    materials[baseMaterial] = (materials[baseMaterial] || 0) + baseAmount + upgradeBonus;
    
    // Chance to get back Soul Stones from epic+ items or high upgrades
    if ((rarity >= Rarity.EPIC && Math.random() < 0.15) || (upgradeLevel >= 10 && Math.random() < 0.25)) {
        materials[UpgradeMaterial.LINH_HON_THACH] = (materials[UpgradeMaterial.LINH_HON_THACH] || 0) + 1;
    }

    return materials;
};

// --- Pet Logic ---

export const convertMonsterToPet = (monster: Character): Omit<Pet, 'loyaltyDescription' | 'oneWordStatus'> => {
    const petLevel = Math.max(1, Math.floor(monster.level * 0.9)); // Start at 90% of monster level
    const baseStats = calculateBaseStats(petLevel, monster.playerClass);
    // Pets have slightly simpler skills or a subset
    const petSkills = monster.skills.filter(s => s.levelRequired <= petLevel);
    // Pets have no MP, their skill usage is based on chance
    const derivedStats = calculateDerivedStats(petLevel, baseStats, {}, petSkills, [], null, []);
    derivedStats.MP = 0;

    return {
        id: crypto.randomUUID(),
        name: monster.name,
        originalName: monster.originalName || monster.name,
        monsterClass: monster.playerClass,
        level: petLevel,
        exp: 0,
        expToNextLevel: calculateExpToNextLevel(petLevel),
        baseStats,
        derivedStats,
        currentHp: derivedStats.HP,
        skills: petSkills,
        imageUrl: monster.imageUrl,
        loyalty: 50, // Start at neutral loyalty
        status: PetStatus.IDLE,
        activeEffects: [],
        isEvolved: false,
        evolutionLevel: 0,
        linhCan: monster.linhCan,
    };
};

export const fullyUpdatePet = (pet: Pet): Pet => {
    const newPet = { ...pet };
    // Recalculate everything based on level
    newPet.baseStats = calculateBaseStats(newPet.level, newPet.monsterClass);
    const derivedStats = calculateDerivedStats(newPet.level, newPet.baseStats, {}, newPet.skills, [], null, []);
    derivedStats.MP = 0; // Pets don't use MP

    // Apply loyalty bonus to derived stats
    const loyaltyBonus = 1 + (newPet.loyalty / 100) * 0.25; // Up to 25% bonus at 100 loyalty
    derivedStats.HP = Math.floor(derivedStats.HP * loyaltyBonus);
    derivedStats.ATK = parseFloat((derivedStats.ATK * loyaltyBonus).toFixed(2));
    derivedStats.MATK = parseFloat((derivedStats.MATK * loyaltyBonus).toFixed(2));
    derivedStats[Stat.DEF] = parseFloat((derivedStats[Stat.DEF] * loyaltyBonus).toFixed(2));
    
    newPet.derivedStats = derivedStats;
    newPet.expToNextLevel = calculateExpToNextLevel(newPet.level);
    newPet.currentHp = Math.min(pet.currentHp, newPet.derivedStats.HP); // Cap HP
    return newPet;
};

export const gainExpForPet = (pet: Pet, expGained: number): { pet: Pet, leveledUp: boolean, messages: string[] } => {
    let newPet = { ...pet };
    newPet.exp += expGained;
    let leveledUp = false;
    const messages: string[] = [];

    while (newPet.exp >= newPet.expToNextLevel) {
        newPet.exp -= newPet.expToNextLevel;
        newPet.level++;
        leveledUp = true;
        messages.push(`🐾 Thú cưng [${newPet.name}] đã đạt đến cấp ${newPet.level}!`);
    }

    if (leveledUp) {
        newPet = fullyUpdatePet(newPet);
        messages.push(`HP của ${newPet.name} đã được phục hồi.`);
    }

    return { pet: newPet, leveledUp, messages };
};

// --- Companion Logic ---
export const convertEnemyToServant = (enemy: Character): Servant => {
    return {
        id: crypto.randomUUID(),
        name: `Nô Bộc: ${enemy.originalName || enemy.name}`,
        originalName: enemy.originalName || enemy.name,
        level: enemy.level,
        characterClass: enemy.playerClass,
        imageUrl: enemy.imageUrl,
        task: ServantTask.RESTING,
    };
};
