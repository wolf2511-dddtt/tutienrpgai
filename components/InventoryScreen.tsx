import React, { useState } from 'react';
import { Character, Item, ItemType, Rarity } from '../types';
import ItemCard from './ItemCard';
import { useGame } from '../contexts/GameContext';
import { RARITY_DATA } from '../constants';

const InventoryScreen: React.FC = () => {
    const { character, handleOpenForge, handleLearnCultivationTechnique, handleUseSkillBook, handleEquipItem, handleUnequipItem } = useGame();
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    
    if (!character) return null;

    const { equipment, inventory } = character;

    const handlePrimaryAction = () => {
        if (!selectedItem) return;

        switch(selectedItem.type) {
            case ItemType.CULTIVATION_MANUAL:
                handleLearnCultivationTechnique(selectedItem);
                break;
            case ItemType.SKILL_BOOK:
                handleUseSkillBook(selectedItem);
                break;
            default: // Equipment
                // This logic handles equipping an item from the inventory list.
                // Unequipping is handled by clicking the equipped item slots directly.
                handleEquipItem(selectedItem);
                break;
        }
        setSelectedItem(null); // Clear selection after action
    }

    const InventoryItemTile: React.FC<{ item: Item, isSelected: boolean, onSelect: () => void }> = ({ item, isSelected, onSelect }) => {
        const rarityInfo = RARITY_DATA[item.rarity];
        const isEquipped = Object.values(character.equipment).some(eq => eq?.id === item.id);

        return (
            <div 
                onClick={onSelect}
                className={`relative aspect-square p-2 rounded-md cursor-pointer flex flex-col justify-between transition-all border-2 ${isSelected ? 'border-yellow-400 bg-yellow-900/50' : `${rarityInfo.borderColor} bg-gray-800/50 hover:bg-gray-700/50`}`}
                title={item.name}
            >
                {isEquipped && (
                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] font-bold px-1 rounded z-10" title="Đang trang bị">E</div>
                )}
                <p className={`text-xs font-semibold truncate ${rarityInfo.color}`}>{item.name}</p>
                <div className="flex justify-between items-end">
                    <p className="text-xs text-gray-400">Cấp {item.level}</p>
                    {item.upgradeLevel > 0 && <p className="text-xs font-bold text-white">+{item.upgradeLevel}</p>}
                </div>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Column 1: Equipment */}
            <div className="lg:col-span-4">
                <h4 className="text-xl font-semibold mb-3 text-cyan-300">Trang Bị</h4>
                <div className="grid grid-cols-2 gap-4">
                    {Object.values(ItemType).filter(t => t !== ItemType.CULTIVATION_MANUAL && t !== ItemType.SKILL_BOOK).map(type => {
                        const equippedItem = equipment[type];
                        const isSetItem = !!equippedItem?.setId;
                        return (
                            <div 
                                key={type} 
                                className={`bg-gray-700/50 p-3 rounded-lg min-h-[100px] flex flex-col justify-between transition-all duration-300 border border-gray-600 ${isSetItem ? 'shadow-[0_0_15px_#22c55e]' : ''}`}
                            >
                                <p className="text-gray-400 text-sm font-bold">{type}</p>
                                {equippedItem ? (
                                    <div className="text-center cursor-pointer group" onClick={() => handleUnequipItem(type)}>
                                        <p className="font-semibold text-white group-hover:text-red-400 transition-colors">{equippedItem.name} +{equippedItem.upgradeLevel}</p>
                                        <p className="text-xs text-red-400 opacity-75 group-hover:opacity-100">(Gỡ)</p>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 text-center text-sm self-center">Trống</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Column 2: Inventory Grid */}
            <div className="lg:col-span-4">
                <h4 className="text-xl font-semibold mb-3 text-cyan-300">Túi Đồ ({inventory.length})</h4>
                {inventory.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pr-2 bg-black/20 p-2 rounded-lg">
                        {inventory.map(item => (
                            <InventoryItemTile 
                                key={item.id} 
                                item={item} 
                                isSelected={selectedItem?.id === item.id}
                                onSelect={() => setSelectedItem(item)} 
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 p-8 bg-gray-700/50 rounded-lg h-full flex items-center justify-center">Túi đồ trống.</div>
                )}
            </div>
            
            {/* Column 3: Item Details */}
            <div className="lg:col-span-4">
                 <h4 className="text-xl font-semibold mb-3 text-cyan-300">Chi Tiết</h4>
                 <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {selectedItem ? (
                        <div>
                            <ItemCard
                                item={selectedItem}
                                onPrimaryAction={handlePrimaryAction}
                                isEquipped={false} // An item selected from the inventory list is never equipped
                            />
                             {/* Secondary Actions */}
                             {selectedItem.type !== ItemType.CULTIVATION_MANUAL && selectedItem.type !== ItemType.SKILL_BOOK && (
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => handleOpenForge(selectedItem, 'upgrade')} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-2 rounded-lg text-sm">Cường hóa</button>
                                    <button onClick={() => { handleOpenForge(selectedItem, 'dismantle'); setSelectedItem(null); }} className="flex-1 bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-2 rounded-lg text-sm">Phân Hủy</button>
                                </div>
                             )}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 p-8 bg-gray-700/50 rounded-lg h-full flex flex-col items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <span>Chọn một vật phẩm từ túi đồ để xem chi tiết.</span>
                        </div>
                    )}
                 </div>
            </div>
        </div>
    );
};

export default InventoryScreen;