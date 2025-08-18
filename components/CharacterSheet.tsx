




import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Character, Stat, Skill, SkillType, DerivedStats, BaseStats, SkillEffectType, TargetType, Element } from '../types';
import { getActiveSetBonuses, calculateBonusStatsFromEquipment, calculateBaseStatBonusesFromEquipment } from '../services/gameLogic';
import { ELEMENT_ICONS, ELEMENT_COLORS } from '../constants';
import { useGame } from '../contexts/GameContext';

interface CharacterSheetProps {
  character: Character;
}

const StatItem: React.FC<{ label: string; value: number; bonus: number; icon: React.ReactNode; onAllocate?: () => void; canAllocate: boolean; }> = ({ label, value, bonus, icon, onAllocate, canAllocate }) => (
    <div className="flex items-center justify-between bg-gray-800/50 p-2 rounded-md">
        <div className="flex items-center space-x-2">
            <span className="text-purple-400">{icon}</span>
            <span className="text-gray-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="font-semibold text-white text-right">
                <span>{value}</span>
                {bonus > 0 && <span className="text-green-400 ml-2">(+{bonus})</span>}
            </div>
            {canAllocate && (
                <button onClick={onAllocate} className="bg-green-600 hover:bg-green-500 rounded-full w-6 h-6 flex items-center justify-center font-bold text-lg transition-transform transform hover:scale-110 active:scale-95 text-white">+</button>
            )}
        </div>
    </div>
);


const SkillItem: React.FC<{ skill: Skill }> = ({ skill }) => (
    <div className="bg-gray-800/50 p-3 rounded-md border-l-4 border-transparent hover:border-cyan-400 transition-all">
        <div className="flex justify-between items-start">
            <div>
                <h4 className={`font-bold ${skill.type === SkillType.ACTIVE ? 'text-cyan-300' : 'text-green-300'}`}>{skill.name}</h4>
                <div className="text-xs text-gray-400">
                    {skill.levelRequired > 1 && `Cấp ${skill.levelRequired}`}
                    {skill.realmRequired && <span className="ml-2 text-yellow-400">Cảnh giới: {skill.realmRequired}</span>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                 {skill.element && skill.element !== Element.VO && (
                    <span className={`text-xs font-bold ${ELEMENT_COLORS[skill.element]}`} title={`Hệ: ${skill.element}`}>
                        {ELEMENT_ICONS[skill.element]}
                    </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${skill.type === SkillType.ACTIVE ? 'bg-cyan-900 text-cyan-300' : 'bg-green-900 text-green-300'}`}>
                    {skill.type}
                </span>
            </div>
        </div>
        <p className="text-sm text-gray-300 mt-2 italic">"{skill.description}"</p>
        <div className="mt-2 text-xs space-y-1">
            {skill.effects.map((effect, index) => (
                 <p key={index} className="text-gray-400 pl-2 border-l-2 border-gray-600">
                    <span className="font-semibold text-gray-200">Hiệu ứng:</span> {effect.description}
                 </p>
            ))}
        </div>
        {skill.mpCost && <p className="text-xs text-blue-400 mt-2 font-bold">Tiêu hao: {skill.mpCost} MP</p>}
    </div>
);

const DerivedStatRow: React.FC<{ label: string; value: string | number; change?: 'increase' | 'decrease'; labelColor?: string }> = 
({ label, value, change, labelColor = "text-gray-300" }) => {
    const changeClass = useMemo(() => {
        if (!change) return '';
        return change === 'increase' ? 'bg-green-500/20' : 'bg-red-500/20';
    }, [change]);

    return (
        <div className={`flex justify-between p-1 rounded transition-colors duration-1000 ${changeClass}`}>
            <span className={`${labelColor} font-semibold`}>{label}:</span>
            <span className="font-mono text-white">{value}</span>
        </div>
    );
};


const CharacterSheet: React.FC<CharacterSheetProps> = ({ character }) => {
    const { handleAllocateStatPoint } = useGame();
    const { name, playerClass, level, exp, expToNextLevel, realm, baseStats, derivedStats, backstory, equipment, skills, linhCan, unallocatedStatPoints, classDefinition } = character;
    const expPercentage = (exp / expToNextLevel) * 100;
    const activeSetBonuses = getActiveSetBonuses(equipment);

    const bonusEquipmentStats = useMemo(() => calculateBonusStatsFromEquipment(equipment), [equipment]);
    const equipmentBaseStatBonuses = useMemo(() => calculateBaseStatBonusesFromEquipment(equipment), [equipment]);


    const [statChanges, setStatChanges] = useState<{ [key: string]: 'increase' | 'decrease' }>({});
    const prevStatsRef = useRef<DerivedStats | null>(null);
    
    const isCustomClass = !!classDefinition;
    const canAllocate = isCustomClass && (unallocatedStatPoints || 0) > 0;


    useEffect(() => {
        if (prevStatsRef.current) {
            const changes: { [key: string]: 'increase' | 'decrease' } = {};
            // Check for changes
            for (const key in character.derivedStats) {
                const statKey = key as keyof DerivedStats;
                const prevValue = prevStatsRef.current[statKey];
                const currentValue = character.derivedStats[statKey];
                if (prevValue < currentValue) {
                    changes[statKey] = 'increase';
                } else if (prevValue > currentValue) {
                    changes[statKey] = 'decrease';
                }
            }
            
            if (Object.keys(changes).length > 0) {
                setStatChanges(changes);
                // The flash effect is temporary, remove the classes after a delay
                const timer = setTimeout(() => {
                    setStatChanges({});
                }, 1000); // match this to transition duration
                return () => clearTimeout(timer);
            }
        }
        // Store current stats for next comparison
        prevStatsRef.current = character.derivedStats;
    }, [character.derivedStats]);

    const statIcons = {
        STR: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.5 9.5A2.5 2.5 0 016 7h8a2.5 2.5 0 010 5H6a2.5 2.5 0 01-2.5-2.5z" clipRule="evenodd" /><path d="M13 9.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" /></svg>,
        AGI: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V4.28L6.22 7.22a.75.75 0 01-1.06-1.06l4-4a.75.75 0 011.06 0l4 4a.75.75 0 11-1.06 1.06L10.75 4.28v4.47a.75.75 0 01-1.5 0v-5.5a.75.75 0 01.75-.75zM3.5 12a.5.5 0 01.5-.5h12a.5.5 0 010 1H4a.5.5 0 01-.5-.5zM10 15.5a.75.75 0 01.75.75v.22l2.5-2.5a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 011.06-1.06l2.5 2.5v-.22a.75.75 0 01.75-.75z" /></svg>,
        INT: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.25 2.5a.75.75 0 00-1.5 0v.085a8.01 8.01 0 00-3.351.624.75.75 0 00.5 1.413A6.51 6.51 0 0110 4.05v-1.55zM4.02 4.492A.75.75 0 003.06 5.5a8.01 8.01 0 00-.624 3.351.75.75 0 001.413.5A6.51 6.51 0 014.05 9h-1.55zM4.02 11.508A.75.75 0 004.52 10.094a6.51 6.51 0 01-1.186 2.56.75.75 0 101.3.75 8.006 8.006 0 00-.623-3.315zM8.75 16.5a.75.75 0 001.5 0v-.085a8.01 8.01 0 003.351-.624.75.75 0 00-.5-1.413A6.51 6.51 0 0110 15.95v-1.55zM15.98 15.508a.75.75 0 00.96-.957 8.006 8.006 0 00-.624-3.351.75.75 0 00-1.413.5 6.51 6.51 0 011.186 2.56.75.75 0 10-1.3.75c.744.97 1.085 2.1 1.201 3.257a.75.75 0 00.936.643zM11.25 3.5a.75.75 0 00-1.5 0v1.55a6.51 6.51 0 012.56 1.186.75.75 0 10.75-1.3 8.006 8.006 0 00-3.315-.623V3.5zM16.5 8.75a.75.75 0 000-1.5h-.085a8.01 8.01 0 00-.624-3.351.75.75 0 00-1.413.5A6.51 6.51 0 0115.95 9h-1.55z" /></svg>,
        SPI: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>,
        CON: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.25 5.25a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" clipRule="evenodd" /></svg>,
        DEX: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M15.5 10a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 11a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>,
    };

return (
    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-4xl mx-auto space-y-6">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-purple-400">{name}</h2>
            <p className="text-lg text-gray-400">{playerClass} - Cấp {level}</p>
            <p className="text-xl font-semibold text-yellow-400 mt-1">Cảnh giới: {realm.name}</p>
        </div>
        
        {backstory && <p className="text-center text-gray-300 italic bg-black/20 p-4 rounded-lg">"{backstory}"</p>}

        <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>Kinh nghiệm (EXP)</span>
                <span>{exp.toLocaleString()} / {expToNextLevel.toLocaleString()}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-purple-600 h-2.5 rounded-full" style={{ width: `${expPercentage}%` }}></div>
            </div>
        </div>
        
        {canAllocate && (
            <div className="text-center bg-yellow-900/50 border-2 border-yellow-500 text-yellow-300 p-3 rounded-lg animate-pulse">
                <h3 className="font-bold">Bạn có {unallocatedStatPoints} điểm tiềm năng chưa phân bổ!</h3>
                <p className="text-sm">Hãy nhấn dấu `+` bên cạnh các chỉ số gốc để tăng sức mạnh.</p>
            </div>
        )}

        {linhCan && (
            <div className={`p-4 rounded-lg border-2 bg-gray-800/50 border-yellow-500/50`}>
                <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                    <div className="flex text-5xl sm:text-6xl gap-2">
                         {linhCan.elements.map(el => <span key={el} className={ELEMENT_COLORS[el]}>{ELEMENT_ICONS[el]}</span>)}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-yellow-300">Thiên Phú: {linhCan.quality} {linhCan.elements.join(' ')} Linh Căn</h3>
                        <p className="text-sm text-gray-300 italic">"{linhCan.description}"</p>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Chỉ số Gốc</h3>
                <div className="space-y-2">
                    <StatItem label="Sức Mạnh (STR)" value={baseStats.STR} bonus={equipmentBaseStatBonuses.STR || 0} icon={statIcons.STR} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.STR)} />
                    <StatItem label="Nhanh Nhẹn (AGI)" value={baseStats.AGI} bonus={equipmentBaseStatBonuses.AGI || 0} icon={statIcons.AGI} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.AGI)} />
                    <StatItem label="Trí Tuệ (INT)" value={baseStats.INT} bonus={equipmentBaseStatBonuses.INT || 0} icon={statIcons.INT} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.INT)} />
                    <StatItem label="Tinh Thần (SPI)" value={baseStats.SPI} bonus={equipmentBaseStatBonuses.SPI || 0} icon={statIcons.SPI} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.SPI)} />
                    <StatItem label="Thể Chất (CON)" value={baseStats.CON} bonus={equipmentBaseStatBonuses.CON || 0} icon={statIcons.CON} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.CON)} />
                    <StatItem label="Khéo Léo (DEX)" value={baseStats.DEX} bonus={equipmentBaseStatBonuses.DEX || 0} icon={statIcons.DEX} canAllocate={canAllocate} onAllocate={() => handleAllocateStatPoint(Stat.DEX)} />
                </div>
            </div>
            <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Thuộc tính Mở rộng</h3>
                <div className="space-y-1 text-sm">
                    <DerivedStatRow label="HP" value={derivedStats.HP.toLocaleString()} change={statChanges[Stat.HP]} labelColor="text-red-400" />
                    <DerivedStatRow label="MP" value={derivedStats.MP.toLocaleString()} change={statChanges[Stat.MP]} labelColor="text-blue-400" />
                    <DerivedStatRow label="Tấn công" value={derivedStats.ATK} change={statChanges[Stat.ATK]} />
                    <DerivedStatRow label="Công phép" value={derivedStats.MATK} change={statChanges[Stat.MATK]} />
                    <DerivedStatRow label="Phòng thủ" value={derivedStats.DEF.toFixed(2)} change={statChanges[Stat.DEF]} />
                    <DerivedStatRow label="Tốc độ" value={derivedStats.Speed.toFixed(1)} change={statChanges[Stat.SPEED]} />
                    <DerivedStatRow label="Xuyên giáp" value={derivedStats[Stat.PENETRATION].toFixed(2)} change={statChanges[Stat.PENETRATION]} />
                    <DerivedStatRow label="Né tránh" value={`${derivedStats[Stat.EVASION].toFixed(2)}%`} change={statChanges[Stat.EVASION]} />
                    <DerivedStatRow label="Chí mạng" value={`${derivedStats[Stat.CRIT_RATE].toFixed(2)}%`} change={statChanges[Stat.CRIT_RATE]} />
                    <DerivedStatRow label="Chính xác" value={`${derivedStats[Stat.ACCURACY].toFixed(2)}%`} change={statChanges[Stat.ACCURACY]} />
                    <DerivedStatRow label="Hút Máu" value={`${derivedStats[Stat.LIFESTEAL].toFixed(2)}%`} change={statChanges[Stat.LIFESTEAL]} />
                    <DerivedStatRow label="Tốc Độ Đánh" value={derivedStats[Stat.ATK_SPEED].toFixed(2)} change={statChanges[Stat.ATK_SPEED]} />
                </div>
            </div>
        </div>

        {Object.keys(bonusEquipmentStats).length > 0 && (
            <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Chỉ Số Cộng Thêm (Trang Bị & Kỹ năng)</h3>
                <div className="space-y-1 text-sm bg-gray-800/50 p-4 rounded-lg columns-1 sm:columns-2 gap-4">
                    {Object.entries(bonusEquipmentStats).map(([stat, value]) => {
                        if (value === 0 || stat in equipmentBaseStatBonuses) return null;
                        const isPercent = stat === Stat.CRIT_RATE || stat === Stat.LIFESTEAL || stat === Stat.EVASION;
                        return <DerivedStatRow key={stat} label={stat} value={isPercent ? `${value.toFixed(2)}%` : value.toFixed(0)} />;
                    })}
                </div>
            </div>
        )}
        
        {skills?.length > 0 && (
             <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Kỹ Năng Đã Học</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {skills.map(skill => <SkillItem key={skill.id} skill={skill} />)}
                </div>
            </div>
        )}

        {activeSetBonuses.length > 0 && (
            <div>
                <h3 className="text-xl font-semibold mb-3 text-gray-200 border-b border-gray-700 pb-2">Kích hoạt Bộ Trang Bị</h3>
                <div className="space-y-4">
                    {activeSetBonuses.map(set => (
                        <div key={set.setName} className="bg-gray-800/50 p-3 rounded-md">
                            <h4 className="text-green-400 font-bold">{set.setName} ({set.pieceCount}/{set.totalPieces})</h4>
                            <ul className="list-disc list-inside ml-2 text-sm space-y-1 mt-1">
                                {set.bonuses.map(({ bonus, active }) => (
                                    <li key={bonus.pieces} className={active ? 'text-green-300' : 'text-gray-500'}>
                                        <span className="font-semibold">({bonus.pieces})</span>: {bonus.description}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
);
};

export default CharacterSheet;