
import React from 'react';
import { Character, Pet } from '../types';
import { useGame } from '../contexts/GameContext';

const StatBar: React.FC<{ current: number, max: number, color: string, label: string }> = ({ current, max, color, label }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className="w-full bg-gray-700 rounded-full h-5 border border-gray-600 relative overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${percentage}%` }}></div>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                <span>{label}: {Math.round(current).toLocaleString()} / {max.toLocaleString()}</span>
            </div>
        </div>
    );
};

const ExpBar: React.FC<{ current: number, max: number }> = ({ current, max }) => {
    const percentage = max > 0 ? (current / max) * 100 : 0;
    return (
        <div className="w-full bg-gray-700 rounded-full h-2 relative overflow-hidden mt-1">
            <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
            <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white/80">
                <span>EXP</span>
            </div>
        </div>
    );
};


const CharacterStatusHeader: React.FC<{ character: Character }> = ({ character }) => {
    const activePet = character.pets.find(p => p.id === character.activePetId);

    return (
        <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700">
            <div className="flex items-center gap-3">
                 {character.imageUrl && <img src={character.imageUrl} alt={character.name} className="w-12 h-12 rounded-full object-cover border-2 border-purple-400" />}
                <div className="flex-grow">
                    <h2 className="text-lg font-bold text-purple-400 truncate">{character.name}</h2>
                    <p className="text-xs text-gray-400">Lv. {character.level} {character.playerClass}</p>
                </div>
            </div>
            <div className="space-y-1 mt-2">
                <StatBar current={character.currentHp} max={character.derivedStats.HP} color="bg-red-500" label="HP" />
                <StatBar current={character.currentMp} max={character.derivedStats.MP} color="bg-blue-500" label="MP" />
                <ExpBar current={character.exp} max={character.expToNextLevel} />
            </div>

            {activePet && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                     <div className="flex items-center gap-2">
                        <div className="flex-shrink-0">
                             <img src={activePet.imageUrl} alt={activePet.name} className="w-8 h-8 rounded-full object-cover border border-green-400" />
                        </div>
                        <div className="flex-grow">
                             <StatBar current={activePet.currentHp} max={activePet.derivedStats.HP} color="bg-green-500" label={activePet.name} />
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};

export default CharacterStatusHeader;