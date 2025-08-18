import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Item, AffixId, UpgradeConsumable, UpgradeMaterial, ItemType, Rarity, ForgeOptions, Character } from '../types';
import ItemCard from './ItemCard';
import { getUpgradeCost, getSuccessRate, UPGRADE_CONSUMABLES_DATA, checkDegradeOnFail, EVOLUTION_DATA, AFFIXES, RARITY_DATA, DIFFICULTY_MODIFIERS } from '../constants';
import { generateUpgradeResult } from '../services/geminiService';
import { useGame } from '../contexts/GameContext';
import { getDismantleResult } from '../services/gameLogic';

type ForgeTab = 'forge' | 'upgrade' | 'enchant' | 'dismantle' | 'craft';

// --- SUB-COMPONENTS FOR TABS ---

const EvolutionChoiceUI: React.FC<{
    item: Item;
    onEvolve: (path: { pathName: string, affixId: AffixId }) => void;
}> = ({ item, onEvolve }) => {
    const evolutionOptions = EVOLUTION_DATA[item.type];
    if (!evolutionOptions) return null;

    return (
        <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-20 animate-fade-in p-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-yellow-300 mb-2 drop-shadow-[0_0_10px_#facc15]">VẬT PHẨM THỨC TỈNH!</h2>
            <p className="text-md sm:text-lg text-gray-300 mb-8 text-center">Chọn một con đường tiến hóa cho {item.name}:</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {evolutionOptions.paths.map(path => {
                    const affix = AFFIXES[path.affixId];
                    return (
                        <div 
                            key={path.pathName}
                            onClick={() => onEvolve(path)}
                            className="bg-gray-800 border-2 border-purple-500 rounded-xl p-4 sm:p-6 w-full sm:w-72 text-center transform hover:scale-105 hover:border-yellow-400 transition-all duration-300 cursor-pointer"
                        >
                            <h3 className="text-xl sm:text-2xl font-bold text-purple-400 mb-3">{item.name} - {path.pathName}</h3>
                            <div className="my-4 py-3 border-t border-b border-yellow-500/30">
                                <h4 className="text-yellow-400 font-semibold">Hiệu ứng mới: {affix.name}</h4>
                                <p className="text-sm text-gray-300 mt-1">{affix.description}</p>
                            </div>
                            <button className="w-full bg-purple-600 text-white font-bold py-2 rounded-lg">Chọn nhánh này</button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}

const UpgradeTab: React.FC<{ item: Item, setNotification: (notif: { message: string, type: 'success' | 'error' } | null) => void }> = ({ item, setNotification }) => {
    const { character, handleUpgradeAttempt, appSettings } = useGame();
    if (!character) return null;

    const [isUpgrading, setIsUpgrading] = useState(false);
    const [useBuaSao, setUseBuaSao] = useState(false);
    const [useBotThanTuy, setUseBotThanTuy] = useState(false);
    const [showEvolutionChoice, setShowEvolutionChoice] = useState(false);
    const charAfterMaterialDeductionRef = useRef<Character | null>(null);
    
    const cost = getUpgradeCost(item);
    const playerHasMaterial = (character.materials[cost.material] || 0) >= cost.amount;
    const playerHasBuaSao = (character.consumables[UpgradeConsumable.BUA_SAO] || 0) > 0;
    const playerHasBotThanTuy = (character.consumables[UpgradeConsumable.BOT_THAN_TUY] || 0) > 0;

    const difficultyMods = DIFFICULTY_MODIFIERS[appSettings.difficulty];
    const baseSuccessRate = getSuccessRate(item.upgradeLevel);
    const pity = item.history.filter(h => h.result === 'fail').length * 2;
    const buaSaoBonus = useBuaSao && playerHasBuaSao ? UPGRADE_CONSUMABLES_DATA[UpgradeConsumable.BUA_SAO].bonusRate : 0;
    const finalSuccessRate = Math.min(100, baseSuccessRate + pity + buaSaoBonus + difficultyMods.upgradeSuccessBonus);

    const handleSelectEvolution = (path: { pathName: string, affixId: AffixId }) => {
        const characterForEvolve = charAfterMaterialDeductionRef.current;
        if (!characterForEvolve) return; // Should not happen

        const tempItem = JSON.parse(JSON.stringify(item));
        
        tempItem.name = `${tempItem.name} - ${path.pathName}`;
        tempItem.affix = AFFIXES[path.affixId];
        tempItem.evolved = true;
        tempItem.upgradeLevel += 1;
        tempItem.history = [];

        const baseStatKey = Object.keys(tempItem.baseStats)[0];
        tempItem.baseStats[baseStatKey] = Math.floor(tempItem.baseStats[baseStatKey] * 1.5);
        
        const message = `Tiến Hóa thành công! Vật phẩm đã thức tỉnh sức mạnh mới!`;
        handleUpgradeAttempt({ updatedItem: tempItem, updatedCharacter: characterForEvolve, message, isSuccess: true });
        
        setShowEvolutionChoice(false);
        setNotification({ message, type: 'success' });
        charAfterMaterialDeductionRef.current = null; // Clean up ref
    };

    const handleUpgrade = () => {
        if (item.upgradeLevel >= item.maxUpgrade || isUpgrading || !playerHasMaterial) return;

        setIsUpgrading(true);
        setNotification(null);

        const tempCharacter = JSON.parse(JSON.stringify(character));
        tempCharacter.materials[cost.material] -= cost.amount;
        if (useBuaSao && playerHasBuaSao) tempCharacter.consumables[UpgradeConsumable.BUA_SAO] -= 1;
        if (useBotThanTuy && playerHasBotThanTuy) tempCharacter.consumables[UpgradeConsumable.BOT_THAN_TUY] -= 1;

        setTimeout(async () => {
            const roll = Math.random() * 100;
            const tempItem = JSON.parse(JSON.stringify(item));
            let message: string;
            let isSuccess = false;
            
            const evolutionInfo = EVOLUTION_DATA[item.type];
            const isEvolutionLevel = !item.evolved && evolutionInfo && item.upgradeLevel + 1 === evolutionInfo.level;

            if (roll < finalSuccessRate) {
                isSuccess = true;
                if (isEvolutionLevel) {
                    setIsUpgrading(false);
                    charAfterMaterialDeductionRef.current = tempCharacter;
                    setShowEvolutionChoice(true);
                    return;
                }
                
                try {
                    const aiResult = await generateUpgradeResult(tempItem, item.upgradeLevel + 1);
                    message = aiResult.successMessage;
                    const baseStatKey = Object.keys(tempItem.baseStats)[0];
                    if(baseStatKey) tempItem.baseStats[baseStatKey] = aiResult.newBaseStatValue;
                    if (aiResult.bonusStatChange) {
                        const { statKey, increase, statName } = aiResult.bonusStatChange;
                        tempItem.bonusStats[statKey] = (tempItem.bonusStats[statKey] || 0) + increase;
                        message += ` 🌟 ${statName} +${increase}!`;
                    }
                } catch (e) {
                    console.error("AI upgrade failed, using fallback logic", e);
                    message = "Cường Hóa Thành Công!";
                    const baseStatKey = Object.keys(tempItem.baseStats)[0];
                    if(baseStatKey) tempItem.baseStats[baseStatKey] = Math.floor(tempItem.baseStats[baseStatKey] * (1.1 + (item.upgradeLevel + 1) * 0.02));
                }
                tempItem.upgradeLevel += 1;
                tempItem.history = [];
            } else {
                message = "Cường Hóa Thất Bại!";
                tempItem.history.push({ result: 'fail', level: item.upgradeLevel });
                const isProtected = useBotThanTuy && playerHasBotThanTuy;
                if(checkDegradeOnFail(item.upgradeLevel) && !isProtected) {
                    tempItem.upgradeLevel = Math.max(0, tempItem.upgradeLevel - 1);
                    message += " Vật phẩm bị tụt -1 cấp!";
                } else if (isProtected) {
                    message += " May mắn được Bột Thần Túy bảo vệ, cấp không đổi.";
                }
            }

            handleUpgradeAttempt({ updatedItem: tempItem, updatedCharacter: tempCharacter, message, isSuccess });
            setNotification({ message, type: isSuccess ? 'success' : 'error' });
            setIsUpgrading(false);
            setUseBuaSao(false);
            setUseBotThanTuy(false);
        }, 1500);
    };

    return (
         <div className="relative p-4 space-y-4">
             {showEvolutionChoice && <EvolutionChoiceUI item={item} onEvolve={handleSelectEvolution} />}
             <div className="text-center">
                <p className="text-gray-400">Tỉ lệ thành công</p>
                <p className="text-5xl font-bold text-green-400 drop-shadow-[0_0_10px_#22c55e]">{finalSuccessRate.toFixed(0)}%</p>
                <div className="text-sm space-x-4">
                    <span className="text-gray-400">Gốc: {baseSuccessRate}%</span>
                    {pity > 0 && <span className="text-cyan-400">Vận may: +{pity}%</span>}
                    {buaSaoBonus > 0 && <span className="text-yellow-400">Búa Sao: +{buaSaoBonus}%</span>}
                    {difficultyMods.upgradeSuccessBonus !== 0 && 
                        <span className={difficultyMods.upgradeSuccessBonus > 0 ? "text-green-400" : "text-red-400"}>
                            Độ khó: {difficultyMods.upgradeSuccessBonus > 0 ? '+' : ''}{difficultyMods.upgradeSuccessBonus}%
                        </span>
                    }
                </div>
            </div>
            <div className="w-full text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                <p className="font-semibold mb-2 text-gray-300">Chi phí cường hóa</p>
                <div className={`flex justify-between ${playerHasMaterial ? 'text-white' : 'text-red-500'}`}>
                    <span>{cost.material}:</span>
                    <span>{character.materials[cost.material] || 0} / {cost.amount}</span>
                </div>
            </div>
             <div className="space-y-2">
                 <div onClick={() => playerHasBuaSao && setUseBuaSao(!useBuaSao)} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${useBuaSao ? 'border-yellow-400 bg-yellow-900/50' : 'border-gray-700 bg-gray-800'}`}>
                     <div className="flex justify-between items-center">
                         <span className="font-bold">Búa Sao ({character.consumables[UpgradeConsumable.BUA_SAO] || 0})</span>
                         <div className="w-6 h-6 rounded border-2 flex items-center justify-center">{useBuaSao && <div className="w-3 h-3 bg-yellow-400 rounded-sm"></div>}</div>
                     </div>
                     <p className="text-xs text-gray-400 mt-1">{UPGRADE_CONSUMABLES_DATA[UpgradeConsumable.BUA_SAO].description}</p>
                 </div>
                 <div onClick={() => playerHasBotThanTuy && setUseBotThanTuy(!useBotThanTuy)} className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${useBotThanTuy ? 'border-cyan-400 bg-cyan-900/50' : 'border-gray-700 bg-gray-800'}`}>
                     <div className="flex justify-between items-center">
                         <span className="font-bold">Bột Thần Túy ({character.consumables[UpgradeConsumable.BOT_THAN_TUY] || 0})</span>
                         <div className="w-6 h-6 rounded border-2 flex items-center justify-center">{useBotThanTuy && <div className="w-3 h-3 bg-cyan-400 rounded-sm"></div>}</div>
                     </div>
                     <p className="text-xs text-gray-400 mt-1">{UPGRADE_CONSUMABLES_DATA[UpgradeConsumable.BOT_THAN_TUY].description}</p>
                 </div>
            </div>
            <button onClick={handleUpgrade} disabled={isUpgrading || item.upgradeLevel >= item.maxUpgrade || !playerHasMaterial} className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:from-gray-600 disabled:cursor-not-allowed flex items-center justify-center text-xl shadow-lg transform hover:scale-105">
                {isUpgrading ? 'Đang Rèn...' : `Cường Hóa +${item.upgradeLevel + 1}`}
            </button>
         </div>
    );
};

const EnchantTab: React.FC<{ item: Item, setNotification: (notif: { message: string, type: 'success' | 'error' } | null) => void }> = ({ item, setNotification }) => {
    const { character, handleEnchantItem } = useGame();
    const [isEnchanting, setIsEnchanting] = useState(false);

    if (!character) return null;

    const enchantCost = { mp: 50, material: UpgradeMaterial.LINH_HON_THACH, amount: 1 };
    const canEnchant = (character.materials[enchantCost.material] || 0) >= enchantCost.amount && character.currentMp >= enchantCost.mp;

    const handleEnchant = async () => {
        if (!canEnchant || isEnchanting) return;
        setIsEnchanting(true);
        setNotification(null);
        try {
            const result = await handleEnchantItem(item);
            if (result) {
                setNotification({ message: result.message, type: 'success' });
            }
        } catch (e: any) {
            setNotification({ message: e.message, type: 'error' });
        }
        setIsEnchanting(false);
    };

    return (
        <div className="p-4 space-y-4 text-center">
            <h3 className="text-2xl font-bold text-cyan-300">Khảm Nạm Linh Hồn</h3>
            <p className="text-gray-400">Sử dụng Linh Hồn Thạch và Linh Lực để truyền một sức mạnh đặc biệt vào vật phẩm.</p>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <p className="font-semibold text-gray-300 mb-2">Chi phí</p>
                <div className={`flex justify-between ${(character.materials[enchantCost.material] || 0) < enchantCost.amount ? 'text-red-500' : 'text-white'}`}>
                    <span>{enchantCost.material}:</span>
                    <span>{character.materials[enchantCost.material] || 0} / {enchantCost.amount}</span>
                </div>
                <div className={`flex justify-between ${character.currentMp < enchantCost.mp ? 'text-red-500' : 'text-white'}`}>
                    <span>Linh Lực (MP):</span>
                    <span>{Math.round(character.currentMp)} / {enchantCost.mp}</span>
                </div>
            </div>
            {item.soulEffect && (
                <div className="p-4 bg-cyan-900/50 rounded-lg border border-cyan-700">
                    <p className="text-cyan-300 font-bold">Vật phẩm đã được khảm nạm!</p>
                    <p className="text-gray-300">Hiệu ứng: {item.soulEffect.name}</p>
                </div>
            )}
            <button onClick={handleEnchant} disabled={!canEnchant || isEnchanting || !!item.soulEffect} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-600 disabled:from-gray-600">
                {isEnchanting ? 'Đang Khảm Nạm...' : 'Bắt Đầu'}
            </button>
        </div>
    );
};

const DismantleTab: React.FC<{ item: Item, setNotification: (notif: { message: string, type: 'success' | 'error' } | null) => void, onComplete: () => void }> = ({ item, setNotification, onComplete }) => {
    const { handleDismantleItem } = useGame();
    const [isDismantling, setIsDismantling] = useState(false);

    const materialsGained = useMemo(() => getDismantleResult(item), [item]);

    const handleDismantle = async () => {
        if (isDismantling) return;
        setIsDismantling(true);
        setNotification(null);
        try {
            const result = await handleDismantleItem(item);
            if (result) {
                setNotification({ message: result.message, type: 'success' });
                onComplete();
            }
        } catch (e: any) {
            setNotification({ message: e.message, type: 'error' });
        }
        setIsDismantling(false);
    };

    return (
        <div className="p-4 space-y-4 text-center">
            <h3 className="text-2xl font-bold text-red-400">Phân Giải Vật Phẩm</h3>
            <p className="text-gray-400">Hành động này sẽ phá hủy vật phẩm để nhận lại nguyên liệu. Không thể hoàn tác.</p>
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-left">
                <p className="font-semibold text-gray-300 mb-2">Nguyên liệu dự kiến nhận được:</p>
                {Object.keys(materialsGained).length > 0 ? (
                    <ul className="list-disc list-inside text-green-400">
                        {Object.entries(materialsGained).map(([mat, amount]) => (
                            <li key={mat}>{mat}: {amount}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic">Không nhận được nguyên liệu nào.</p>
                )}
            </div>
            <button onClick={handleDismantle} disabled={isDismantling} className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-bold py-3 rounded-lg disabled:bg-gray-600 disabled:from-gray-600">
                {isDismantling ? 'Đang Phân Giải...' : 'Xác Nhận Phân Giải'}
            </button>
        </div>
    );
};

const ForgeTab: React.FC<{ setNotification: (notif: { message: string, type: 'success' | 'error' } | null) => void }> = ({ setNotification }) => {
    const { character, handleForgeNewItem } = useGame();
    const [isForging, setIsForging] = useState(false);
    const [mpToUse, setMpToUse] = useState(10);
    const [itemType, setItemType] = useState<ItemType>(ItemType.WEAPON);

    if (!character) return null;

    const handleForge = async () => {
        if (isForging || character.currentMp < mpToUse) return;
        setIsForging(true);
        setNotification(null);
        const options: ForgeOptions = {
            method: 'mp',
            mpUsed: mpToUse,
            itemType: itemType,
            auxiliaryItems: []
        };
        try {
            const { newItem, messages } = await handleForgeNewItem(options);
            if (newItem) {
                let successMessage = `Rèn thành công [${newItem.name}]!`;
                if (messages.length > 0) {
                    successMessage += `\n${messages.join('\n')}`;
                }
                setNotification({ message: successMessage, type: 'success' });
            }
        } catch (e: any) {
             setNotification({ message: `Rèn thất bại: ${e.message}`, type: 'error' });
        }
        setIsForging(false);
    };

    return (
        <div className="p-4 space-y-4 text-center">
            <h3 className="text-2xl font-bold text-orange-400">Rèn Vật Phẩm Mới</h3>
            <p className="text-gray-400">Dùng Linh Lực để ngưng tụ thành một vật phẩm ngẫu nhiên.</p>
            
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="block text-gray-300 mb-2">Loại vật phẩm muốn rèn:</label>
                <select value={itemType} onChange={e => setItemType(e.target.value as ItemType)} className="w-full bg-gray-700 p-2 rounded">
                    {Object.values(ItemType).filter(t => t !== ItemType.CULTIVATION_MANUAL && t !== ItemType.SKILL_BOOK).map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
            </div>

             <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="block text-gray-300 mb-2">Linh Lực sử dụng: {mpToUse} / {Math.round(character.currentMp)} MP</label>
                <input type="range" min="10" max={character.derivedStats.MP} step="10" value={mpToUse} onChange={e => setMpToUse(Number(e.target.value))} className="w-full" />
             </div>
             <p className="text-xs text-gray-500">Dùng càng nhiều Linh Lực, tỉ lệ ra vật phẩm hiếm càng cao.</p>

             <button onClick={handleForge} disabled={isForging || character.currentMp < mpToUse} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold py-3 rounded-lg disabled:bg-gray-600 disabled:from-gray-600">
                {isForging ? 'Đang Rèn...' : 'Bắt Đầu Rèn'}
            </button>
        </div>
    );
};

const CraftTab: React.FC<{ setNotification: (notif: { message: string, type: 'success' | 'error' } | null) => void }> = ({ setNotification }) => {
    const { character, handleCraftTalisman, handleCraftHonAnPhu } = useGame();
    const [isCrafting, setIsCrafting] = useState<string | null>(null);
    if (!character) return null;

    const craftables = [
        {
            name: "Linh Thú Phù",
            description: "Dùng để thu phục yêu thú.",
            cost: { [UpgradeMaterial.LINH_HON_THACH]: 1, [UpgradeMaterial.TINH_THACH_HA_PHAM]: 5, MP: 50 },
            handler: handleCraftTalisman
        },
        {
            name: "Hồn Ấn Phù",
            description: "Dùng để nô dịch kẻ địch hình người.",
            cost: { [UpgradeMaterial.LINH_HON_THACH]: 2, [UpgradeMaterial.TINH_THACH_TRUNG_PHAM]: 5, MP: 100 },
            handler: handleCraftHonAnPhu
        }
    ];

    const handleCraft = async (craftable: typeof craftables[0]) => {
        setIsCrafting(craftable.name);
        setNotification(null);
        const result = await craftable.handler();
        setNotification({ message: result.message, type: result.success ? 'success' : 'error' });
        setIsCrafting(null);
    };

    return (
        <div className="p-4 space-y-4">
            <h3 className="text-2xl font-bold text-green-400 text-center">Chế Tạo Vật Phẩm</h3>
            {craftables.map(craftable => {
                const canCraft = Object.entries(craftable.cost).every(([key, val]) => {
                    if (key === 'MP') return character.currentMp >= val;
                    return (character.materials[key as UpgradeMaterial] || 0) >= val;
                });
                return (
                    <div key={craftable.name} className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-left">
                        <p className="font-semibold text-gray-300 text-lg">{craftable.name}</p>
                        <p className="text-sm text-gray-400 mb-2">{craftable.description}</p>
                        <p className="font-semibold text-gray-300 mb-1">Chi phí:</p>
                        <ul className="list-disc list-inside text-sm">
                            {Object.entries(craftable.cost).map(([key, val]) => (
                                <li key={key}>{key}: {val}</li>
                            ))}
                        </ul>
                        <button onClick={() => handleCraft(craftable)} disabled={!canCraft || !!isCrafting} className="w-full mt-3 bg-gradient-to-r from-green-600 to-teal-700 hover:from-green-700 hover:to-teal-800 text-white font-bold py-2 rounded-lg disabled:bg-gray-600 disabled:from-gray-600">
                            {isCrafting === craftable.name ? 'Đang Chế Tạo...' : 'Chế Tạo'}
                        </button>
                    </div>
                );
            })}
        </div>
    );
};


// --- MAIN COMPONENT ---

export const ForgeScreen: React.FC = () => {
    const { character, itemInForge, initialForgeTab, handleCloseForge } = useGame();
    const [activeTab, setActiveTab] = useState<ForgeTab>(initialForgeTab);
    const [selectedItem, setSelectedItem] = useState<Item | null>(itemInForge);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [notification]);
    
    useEffect(() => {
        setSelectedItem(itemInForge);
    }, [itemInForge]);


    if (!character) return null;

    const TabButton: React.FC<{ tab: ForgeTab; label: string }> = ({ tab, label }) => (
        <button
            onClick={() => {
                setActiveTab(tab);
                if(tab === 'forge' || tab === 'craft') setSelectedItem(null);
            }}
            className={`flex-1 py-3 text-sm sm:text-base font-semibold transition-colors rounded-t-lg ${activeTab === tab ? 'bg-[var(--color-bg-secondary)] text-[var(--color-primary-light)] border-b-2 border-[var(--color-primary)]' : 'bg-[var(--color-bg-main)]/50 text-gray-400 hover:bg-[var(--color-bg-secondary)]/70'}`}
        >
            {label}
        </button>
    );

    const renderTabContent = () => {
        if (activeTab === 'forge') return <ForgeTab setNotification={setNotification} />;
        if (activeTab === 'craft') return <CraftTab setNotification={setNotification} />;
        
        if (!selectedItem) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <p className="text-3xl mb-4">📜</p>
                    <h3 className="text-xl font-semibold text-gray-300">Chọn một vật phẩm</h3>
                    <p className="text-gray-500">Hãy chọn một vật phẩm từ túi đồ bên trái để bắt đầu.</p>
                </div>
            )
        }
        
        switch (activeTab) {
            case 'upgrade': return <UpgradeTab item={selectedItem} setNotification={setNotification} />;
            case 'enchant': return <EnchantTab item={selectedItem} setNotification={setNotification} />;
            case 'dismantle': return <DismantleTab item={selectedItem} setNotification={setNotification} onComplete={() => setSelectedItem(null)} />;
            default: return null;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border-base)] rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] text-white relative flex flex-col backdrop-blur-md bg-opacity-80">
                <header className="flex items-center justify-between p-4 border-b border-[var(--color-border-base)]">
                    <h2 className="text-3xl font-bold text-[var(--color-primary-light)]">Lò Rèn</h2>
                    <button onClick={handleCloseForge} className="text-gray-400 hover:text-white text-3xl z-10">&times;</button>
                </header>
                
                <div className="flex flex-grow overflow-hidden">
                    {/* Left: Inventory */}
                    <aside className="w-1/3 border-r border-[var(--color-border-base)] p-4 overflow-y-auto">
                        <h3 className="text-lg font-semibold text-cyan-300 mb-3">Túi Đồ</h3>
                        <div className="space-y-2">
                             {character.inventory.map(item => {
                                const rarityInfo = RARITY_DATA[item.rarity];
                                return (
                                    <div key={item.id} onClick={() => setSelectedItem(item)} className={`p-2 rounded-lg cursor-pointer transition-all border ${selectedItem?.id === item.id ? 'bg-purple-900/50 border-purple-500' : 'bg-gray-800/50 border-transparent hover:border-gray-600'}`}>
                                        <p style={{ color: rarityInfo.color }} className={`font-semibold`}>{item.name} {item.upgradeLevel > 0 && `+${item.upgradeLevel}`}</p>
                                        <p className="text-xs text-gray-400">Cấp {item.level} {item.type}</p>
                                    </div>
                                )
                             })}
                             {character.inventory.length === 0 && <p className="text-gray-500 text-center italic mt-4">Túi đồ trống</p>}
                        </div>
                    </aside>

                    {/* Right: Forge Area */}
                    <main className="w-2/3 flex flex-col">
                        <div className="flex-shrink-0 flex border-b border-[var(--color-border-base)]">
                           <TabButton tab="forge" label="Rèn" />
                           <TabButton tab="upgrade" label="Luyện Khí" />
                           <TabButton tab="enchant" label="Khảm Nạm" />
                           <TabButton tab="dismantle" label="Phân Giải" />
                           <TabButton tab="craft" label="Chế Tạo" />
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 relative">
                            {selectedItem && (activeTab !== 'forge' && activeTab !== 'craft') && (
                                <div className="mb-4 max-w-sm mx-auto">
                                    <ItemCard item={selectedItem} />
                                </div>
                            )}
                            {renderTabContent()}
                        </div>
                    </main>
                </div>
                
                {notification && (
                    <div className={`whitespace-pre-wrap absolute bottom-4 left-1/2 -translate-x-1/2 p-3 rounded-lg text-white font-bold animate-fade-in z-30 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                        {notification.message}
                    </div>
                )}
            </div>
        </div>
    );
};