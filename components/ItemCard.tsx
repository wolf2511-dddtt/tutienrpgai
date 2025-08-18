
import React from 'react';
import { Item, Rarity, SkillType, Element, ItemType } from '../types';
import { RARITY_DATA, ELEMENT_ICONS } from '../constants';

interface ItemCardProps {
  item: Item;
  onPrimaryAction?: () => void;
  isEquipped?: boolean;
}

const StatDisplay: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex justify-between text-sm">
        <span className="text-gray-400">{label}:</span>
        <span className="font-semibold text-white">{value}</span>
    </div>
);

const ItemCard: React.FC<ItemCardProps> = ({ item, onPrimaryAction, isEquipped }) => {
  const rarityInfo = RARITY_DATA[item.rarity];

  const renderActionButton = () => {
    if (!onPrimaryAction) {
        return null;
    }

    let text: string;
    let style: string;

    switch (item.type) {
        case ItemType.CULTIVATION_MANUAL:
            text = 'Lĩnh Hội';
            style = 'bg-purple-600 hover:bg-purple-700';
            break;
        case ItemType.SKILL_BOOK:
            text = 'Học Kỹ Năng';
            style = 'bg-cyan-600 hover:bg-cyan-700';
            break;
        default: // Equipment
            if (isEquipped) {
                text = 'Gỡ Trang Bị';
                style = 'bg-red-600 hover:bg-red-700';
            } else {
                text = 'Trang Bị';
                style = 'bg-green-600 hover:bg-green-700';
            }
            break;
    }

    return (
        <button
            onClick={onPrimaryAction}
            className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-lg transition duration-200 ${style}`}
        >
            {text}
        </button>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 border shadow-lg flex flex-col h-full" style={{ borderColor: rarityInfo.borderColor }}>
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold" style={{ color: rarityInfo.color }}>{item.name} {item.upgradeLevel > 0 && `+${item.upgradeLevel}`}</h3>
        {item.element && item.element !== Element.VO && (
            <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ color: `var(--element-${item.element.toLowerCase()}-text)` }} title={`Hệ: ${item.element}`}>
                {ELEMENT_ICONS[item.element]} {item.element}
            </span>
        )}
      </div>
      {item.setName && (
        <p className="text-sm text-green-400 font-semibold mb-1">Bộ: {item.setName}</p>
      )}
      <p className="text-sm text-gray-500 mb-2">Cấp {item.level} {item.type}</p>
      
      {item.description && <p className="text-xs text-gray-400 italic mb-3">"{item.description}"</p>}

      <div className="space-y-1 mb-3 flex-grow">
        {Object.entries(item.baseStats).filter(([, value]) => value).map(([stat, value]) => (
          <StatDisplay key={stat} label={stat.toUpperCase()} value={value} />
        ))}
        {Object.entries(item.bonusStats).filter(([, value]) => value).map(([stat, value]) => (
          <StatDisplay key={stat} label={stat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={`+${value}`} />
        ))}
      </div>
      
       {item.cultivationTechniqueDetails && (
        <div className="my-2 py-2 border-t border-b border-purple-500/30">
            <h4 className="text-purple-300 font-semibold text-sm">Công Pháp Lĩnh Ngộ</h4>
            {item.cultivationTechniqueDetails.bonuses.map((bonus, index) => (
                <p key={index} className="text-xs text-gray-300">
                    <span className="font-bold">+{bonus.value}{bonus.isPercent ? '%' : ''}</span> {bonus.stat}
                </p>
            ))}
        </div>
      )}

      {item.skillDetails && (
        <div className="my-2 py-2 border-t border-b border-cyan-500/30">
            <h4 className={`font-semibold text-base ${item.skillDetails.type === SkillType.ACTIVE ? 'text-cyan-300' : 'text-green-300'}`}>
                Kỹ Năng: {item.skillDetails.name} ({item.skillDetails.type})
            </h4>
            <p className="text-sm text-gray-400 italic my-2">"{item.skillDetails.description}"</p>
            <div className="mt-1 text-sm space-y-1">
                {item.skillDetails.effects.map((effect, index) => (
                    <div key={index} className="flex items-start text-gray-300">
                        <span className="text-gray-500 font-bold mr-2">|</span>
                        <p className="flex-1">
                            {effect.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      )}


      {item.affix && (
        <div className="my-3 py-2 border-t border-b border-yellow-500/30">
            <h4 className="text-yellow-400 font-semibold text-sm">Hiệu ứng đặc biệt</h4>
            <p className="text-xs text-gray-300">
                <span className="font-bold">🌟 {item.affix.name}:</span> {item.affix.description}
            </p>
        </div>
      )}

      {item.soulEffect && (
        <div className="my-3 py-2 border-t border-b border-cyan-500/30">
            <h4 className="text-cyan-400 font-semibold text-sm">Linh Hồn Hiệu Ứng</h4>
            <p className="text-xs text-gray-300">
                <span className="font-bold">🌀 {item.soulEffect.name}:</span> {item.soulEffect.description}
            </p>
        </div>
      )}

      {item.type !== 'Sách Kỹ Năng' && item.type !== 'Công Pháp' && (
        <div className="text-xs text-gray-500 mt-2">Nâng cấp: {item.upgradeLevel}/{item.maxUpgrade}</div>
      )}
      
      {renderActionButton()}
    </div>
  );
};

export default ItemCard;
