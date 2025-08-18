import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Character, Item, UpgradeMaterial, AttackResult, Skill, SkillType, ActiveEffect, TargetType, Pet, Combatant, UpgradeConsumable, Rarity, CombatLogEntry, MonsterRank, Element, SkillEffectType } from '../types';
import { performAttack, useSkill, generateItem } from '../services/gameLogic';
import ItemCard from './ItemCard';
import { useGame } from '../contexts/GameContext';
import { DIFFICULTY_MODIFIERS, MONSTER_RANK_MODIFIERS, ELEMENT_ICONS } from '../constants';
import StatusEffectDisplay from './StatusEffectDisplay';

const CombatantDisplay: React.FC<{ combatant: Combatant, isPlayerSide: boolean, isActiveTurn: boolean }> = ({ combatant, isPlayerSide, isActiveTurn }) => {
    const hpPercentage = combatant.derivedStats.HP > 0 ? (combatant.currentHp / combatant.derivedStats.HP) * 100 : 0;
    const mpPercentage = 'currentMp' in combatant && combatant.derivedStats.MP > 0 ? (combatant.currentMp / combatant.derivedStats.MP) * 100 : 0;

    const isCharacter = 'playerClass' in combatant;
    const combatantName = combatant.name;
    const isBoss = isCharacter && (combatant as Character).isBoss;
    const elements = 'linhCan' in combatant && combatant.linhCan ? combatant.linhCan.elements : [];


    return (
        <div className={`flex flex-col items-center p-2 sm:p-4 rounded-xl transition-all duration-300 bg-[var(--color-backdrop-bg)] backdrop-blur-md border ${isActiveTurn ? 'border-[var(--color-primary-light)] animate-pulse-border' : 'border-[var(--color-border-base)]'}`}>
            {combatant.imageUrl && (
                 <div className={`w-24 h-24 sm:w-32 sm:h-32 mb-4 rounded-lg overflow-hidden border-2 ${isPlayerSide ? 'border-cyan-500/50' : 'border-red-500/50'} shadow-lg`}>
                    <img src={combatant.imageUrl} alt={combatantName} className="w-full h-full object-cover" />
                </div>
            )}
            <div className="w-full text-center">
                 <div className="flex justify-center items-baseline mb-1 gap-2">
                    {elements.length > 0 && (
                         <div className="relative group flex gap-1">
                            {elements.map(el => <span key={el} style={{color: `var(--element-${el.toLowerCase()}-text)`}} className={`text-lg font-bold`}>{ELEMENT_ICONS[el]}</span>)}
                            <div className="absolute bottom-full mb-2 w-28 text-center left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                Hệ: {elements.join(', ')}
                            </div>
                        </div>
                    )}
                    <span className="font-bold text-md sm:text-lg text-white">{isBoss && '👑 '}{combatantName}</span>
                    <span className="text-xs sm:text-sm text-gray-400">Lv. {combatant.level}</span>
                </div>
                <div className="space-y-2">
                    <div className="w-full bg-black/30 rounded-full h-5 sm:h-6 border border-white/10 relative">
                        <div className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r from-green-400 to-green-600`} style={{ width: `${hpPercentage}%` }}></div>
                        <div className="absolute w-full h-full top-0 left-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                           HP: {Math.round(combatant.currentHp).toLocaleString()} / {combatant.derivedStats.HP.toLocaleString()}
                        </div>
                    </div>
                    {isCharacter && (
                         <div className="w-full bg-black/30 rounded-full h-5 sm:h-6 border border-white/10 relative">
                            <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${mpPercentage}%` }}></div>
                            <div className="absolute w-full h-full top-0 left-0 flex items-center justify-center text-xs font-bold text-white mix-blend-difference">
                               MP: {Math.round((combatant as Character).currentMp).toLocaleString()} / {combatant.derivedStats.MP.toLocaleString()}
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-3 min-h-[32px] flex items-center justify-center">
                    <StatusEffectDisplay effects={combatant.activeEffects} />
                </div>
            </div>
        </div>
    );
};

const TurnOrderDisplay: React.FC<{ participants: Combatant[]; currentIndex: number }> = ({ participants, currentIndex }) => {
    return (
        <div className="flex justify-center items-end gap-2 sm:gap-4 my-4 p-2 bg-black/40 rounded-lg h-20">
            <span className="text-sm font-bold text-gray-300 self-center px-2">THỨ TỰ</span>
            {participants.map((p, index) => (
                <div key={p.id} className="relative group flex flex-col items-center">
                    <div 
                        className={`absolute -top-6 text-yellow-400 text-2xl transition-opacity duration-300 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                    >
                        ▼
                    </div>
                    <img 
                        src={p.imageUrl || 'https://via.placeholder.com/40'} 
                        alt={p.name} 
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-4 transition-all duration-300 ${
                            index === currentIndex 
                            ? 'border-yellow-400 scale-110' 
                            : 'border-gray-500 opacity-70'
                        }`}
                    />
                    <div className="absolute top-full mt-2 w-max bg-black/80 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                        {p.name}
                    </div>
                </div>
            ))}
        </div>
    );
};


export const CombatScreen: React.FC = () => {
  const { character: player, enemy: initialEnemy, handleCombatEnd, appSettings, handleCatchPet, handleEnslaveTarget } = useGame();
  
  if (!player || !initialEnemy) return null; 

  const [participants, setParticipants] = useState<Combatant[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);

  const [combatLog, setCombatLog] = useState<CombatLogEntry[]>([]);
  const [isCombatOver, setIsCombatOver] = useState(false);
  const [rewards, setRewards] = useState<{exp: number, items: Item[], materials: { [key in UpgradeMaterial]?: number }, consumables: { [key in UpgradeConsumable]?: number }}|null>(null);
  const [showSkillList, setShowSkillList] = useState(false);
  
  const [floatingTexts, setFloatingTexts] = useState<{id: string, text: string, type: 'damage' | 'heal' | 'lifesteal' | 'dot' | 'strong' | 'weak' | 'proficient', side: 'player' | 'enemy' | 'pet'}[]>([]);
  const [shake, setShake] = useState(false);

  const combatEndedRef = useRef(false);
  const participantsRef = useRef(participants);
  useEffect(() => {
      participantsRef.current = participants;
  }, [participants]);


  const addToLog = useCallback((messages: string | string[], type: CombatLogEntry['type'] = 'action') => {
      const msgs = Array.isArray(messages) ? messages : [messages];
      const newEntries: CombatLogEntry[] = msgs.map(m => ({ id: crypto.randomUUID(), text: m, type }));
      setCombatLog(prev => [...newEntries.reverse(), ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    combatEndedRef.current = false;
    setIsCombatOver(false);

    const activePet = player.activePetId ? player.pets.find(p => p.id === player.activePetId) : null;
    const activeRetainer = player.activeRetainerId ? player.retainers.find(r => r.id === player.activeRetainerId) : null;
    
    const initialParticipants: Combatant[] = [player, initialEnemy];
    if (activePet) initialParticipants.push(activePet);
    if (activeRetainer) initialParticipants.push(activeRetainer);

    initialParticipants.sort((a, b) => b.derivedStats.Speed - a.derivedStats.Speed);
    
    setParticipants(initialParticipants);
    setTurnIndex(0);
    setCombatLog([{ id: crypto.randomUUID(), text: 'Trận chiến bắt đầu!', type: 'system' }]);
  }, [player, initialEnemy]);
  

  const playerInCombat = useMemo(() => participants.find(p => p.id === player.id) as Character | undefined, [participants, player.id]);
  const enemyInCombat = useMemo(() => participants.find(p => p.id === initialEnemy.id) as Character | undefined, [participants, initialEnemy.id]);
  const petInCombat = useMemo(() => {
      if (!player.activePetId) return null;
      return participants.find(p => p.id === player.activePetId) as Pet | undefined;
  }, [participants, player.activePetId]);
  const retainerInCombat = useMemo(() => {
      if (!player.activeRetainerId) return null;
      return participants.find(p => p.id === player.activeRetainerId) as Character | undefined;
  }, [participants, player.activeRetainerId]);


  const isPlayerTurn = useMemo(() => participants[turnIndex]?.id === player.id, [participants, turnIndex, player.id]);

  const addFloatingText = useCallback((text: string, type: 'damage' | 'heal' | 'lifesteal' | 'dot' | 'strong' | 'weak' | 'proficient', side: 'player' | 'enemy' | 'pet') => {
      const newText = { id: crypto.randomUUID(), text, type, side };
      setFloatingTexts(prev => [...prev, newText]);
      setTimeout(() => {
          setFloatingTexts(current => current.filter(t => t.id !== newText.id));
      }, 1900);
  }, []);
  
  const updateMultipleParticipantsState = useCallback((updatedCombatants: Combatant[]) => {
      setParticipants(prev => {
        const updatedMap = new Map(updatedCombatants.map(u => [u.id, u]));
        return prev.map(p => updatedMap.get(p.id) || p);
      });
  }, []);

  const endCombat = useCallback(async (playerWon: boolean) => {
    if (combatEndedRef.current) return;
    combatEndedRef.current = true;
    setIsCombatOver(true);
    
    const finalPlayer = participantsRef.current.find(p => p.id === player.id) as Character;
    const finalPet = participantsRef.current.find(p => p.id === player.activePetId) as Pet | undefined;

    if (playerWon && finalPlayer) {
        const difficultyMods = DIFFICULTY_MODIFIERS[appSettings.difficulty];
        const enemyRank = initialEnemy.rank || MonsterRank.Thường;
        const rankMods = MONSTER_RANK_MODIFIERS[enemyRank];
        const lootMultiplier = rankMods.lootMultiplier;
        
        let baseExpGained = Math.floor(10 * (initialEnemy.level * 0.5));
        if (initialEnemy.isBoss) {
            baseExpGained *= 3;
        }
        const expGained = Math.floor(baseExpGained * difficultyMods.expRate * lootMultiplier);

        const itemsDropped: Item[] = [];
        const finalLootRate = difficultyMods.lootRate * lootMultiplier;

        if (initialEnemy.isBoss) {
            itemsDropped.push(await generateItem(initialEnemy.level, finalPlayer, Rarity.EPIC));
            if(Math.random() < 0.5 * finalLootRate) itemsDropped.push(await generateItem(initialEnemy.level, finalPlayer, Rarity.RARE));
        } else {
             if (Math.random() < 0.7 * finalLootRate) itemsDropped.push(await generateItem(initialEnemy.level, finalPlayer));
             if (Math.random() < 0.2 * finalLootRate) itemsDropped.push(await generateItem(initialEnemy.level, finalPlayer));
        }
        
        const materialsDropped: { [key in UpgradeMaterial]?: number } = {};
        const materialAmount = Math.floor((Math.random() * 2 + 1) * lootMultiplier);
        if(initialEnemy.level < 20) materialsDropped[UpgradeMaterial.TINH_THACH_HA_PHAM] = materialAmount;
        else if (initialEnemy.level < 50) materialsDropped[UpgradeMaterial.TINH_THACH_TRUNG_PHAM] = materialAmount;
        else materialsDropped[UpgradeMaterial.TINH_THACH_CAO_PHAM] = materialAmount;
        if (Math.random() < 0.1 * finalLootRate) materialsDropped[UpgradeMaterial.LINH_HON_THACH] = (materialsDropped[UpgradeMaterial.LINH_HON_THACH] || 0) + 1;
        if(initialEnemy.isBoss) materialsDropped[UpgradeMaterial.LINH_HON_THACH] = (materialsDropped[UpgradeMaterial.LINH_HON_THACH] || 0) + 1;

        const consumablesDropped: { [key in UpgradeConsumable]?: number } = {};
        if (Math.random() < 0.20 * finalLootRate) {
            const amount = 1 + (enemyRank === MonsterRank.TinhAnh ? 1 : 0) + (enemyRank === MonsterRank.ThủLĩnh ? 2 : 0);
            consumablesDropped[UpgradeConsumable.LINH_THU_THUC] = (consumablesDropped[UpgradeConsumable.LINH_THU_THUC] || 0) + amount;
        }
        if (initialEnemy.isBoss) {
            const amount = Math.floor(Math.random() * 3) + 3;
            consumablesDropped[UpgradeConsumable.LINH_THU_THUC] = (consumablesDropped[UpgradeConsumable.LINH_THU_THUC] || 0) + amount;
        }

        setRewards({exp: expGained, items: itemsDropped, materials: materialsDropped, consumables: consumablesDropped});
        addToLog([`Bạn đã chiến thắng! Nhận được ${expGained} EXP.`], 'info');
    } else {
        addToLog('Bạn đã bị đánh bại!', 'error');
    }
  }, [initialEnemy, appSettings.difficulty, addToLog, player]);

    const nextTurn = useCallback(() => {
        if (combatEndedRef.current) return;
    
        const currentParticipants = participantsRef.current;
        let participantsWithUpdates = JSON.parse(JSON.stringify(currentParticipants));
        const actorOfPreviousTurn = currentParticipants[turnIndex];
        
        // 1. Apply end-of-turn effects for the actor who just finished
        if (actorOfPreviousTurn && actorOfPreviousTurn.currentHp > 0) {
            let actorState = participantsWithUpdates.find((p: Combatant) => p.id === actorOfPreviousTurn.id)!;
            let wasModified = false;
            
            const dotHotEffects = actorState.activeEffects.filter((e: ActiveEffect) => e.effect.type === SkillEffectType.DOT || e.effect.type === SkillEffectType.HOT);
            if (dotHotEffects.length > 0) {
                wasModified = true;
                dotHotEffects.forEach((activeEffect: ActiveEffect) => {
                    const { effect } = activeEffect;
                    const baseValue = 'playerClass' in actorState ? actorState.derivedStats.MATK : (actorState as Pet).derivedStats.MATK;
                    const value = Math.floor(baseValue * (effect.powerMultiplier || 0));
                    const side = actorState.id === player.id ? 'player' : (actorState.id === player.activePetId ? 'pet' : 'enemy');
    
                    if (effect.type === SkillEffectType.DOT && value > 0) {
                        actorState.currentHp = Math.max(0, actorState.currentHp - value);
                        addToLog(`${actorState.name} chịu ${value} sát thương từ ${activeEffect.sourceSkillName}.`);
                        addFloatingText(value.toString(), 'dot', side);
                    } else if (effect.type === SkillEffectType.HOT && value > 0) {
                        actorState.currentHp = Math.min(actorState.derivedStats.HP, actorState.currentHp + value);
                        addToLog(`${actorState.name} được hồi ${value} HP từ ${activeEffect.sourceSkillName}.`);
                        addFloatingText(value.toString(), 'heal', side);
                    }
                });
            }
            
            if (actorState.activeEffects.length > 0) {
                actorState.activeEffects = actorState.activeEffects
                    .map((e: ActiveEffect) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
                    .filter((e: ActiveEffect) => e.remainingTurns > 0);
                wasModified = true;
            }
            
            if (wasModified) {
                participantsWithUpdates = participantsWithUpdates.map((p: Combatant) => p.id === actorState.id ? actorState : p);
            }
            
            if (actorState.currentHp <= 0) {
                addToLog(`${actorState.name} đã gục ngã vì hiệu ứng!`, 'system');
                const playerTeamAlive = participantsWithUpdates.filter((p: Combatant) => (p.id === player.id || p.id === player.activePetId || p.id === player.activeRetainerId) && p.currentHp > 0).length > 0;
                const enemyTeamAlive = participantsWithUpdates.filter((p: Combatant) => !(p.id === player.id || p.id === player.activePetId || p.id === player.activeRetainerId) && p.currentHp > 0).length > 0;

                if (!playerTeamAlive) { endCombat(false); return; }
                if (!enemyTeamAlive) { endCombat(true); return; }
            }
        }
    
        // 2. Find next valid actor
        let nextIndex = (turnIndex + 1) % participantsWithUpdates.length;
        let attempts = 0;
        while (attempts < participantsWithUpdates.length) {
            const nextCombatant = participantsWithUpdates[nextIndex];
    
            if (nextCombatant.currentHp <= 0) {
                nextIndex = (nextIndex + 1) % participantsWithUpdates.length;
                attempts++;
                continue;
            }
            
            const isStunned = nextCombatant.activeEffects.some((e: ActiveEffect) => e.effect.type === SkillEffectType.STUN);
            if (isStunned) {
                addToLog(`🌀 ${nextCombatant.name} bị choáng và mất lượt!`, 'info');
                
                let stunnedCombatant = participantsWithUpdates.find((p: Combatant) => p.id === nextCombatant.id)!;
                stunnedCombatant.activeEffects = stunnedCombatant.activeEffects
                    .map((e: ActiveEffect) => ({ ...e, remainingTurns: e.remainingTurns - 1 }))
                    .filter((e: ActiveEffect) => e.remainingTurns > 0);
                
                nextIndex = (nextIndex + 1) % participantsWithUpdates.length;
                attempts++;
                continue;
            }
    
            break; // Found valid actor
        }
    
        // 3. Commit state changes
        setParticipants(participantsWithUpdates);
        setTurnIndex(nextIndex);
    
    }, [turnIndex, addToLog, addFloatingText, player, endCombat]);

  const processAction = useCallback(async (result: AttackResult, attacker: Combatant, defender: Combatant, skill?: Skill) => {
    addToLog(result.messages);
    let newAttackerState = { ...attacker };
    let newDefenderState = { ...defender };

    const isPlayerSideDefender = newDefenderState.id === player.id || newDefenderState.id === player.activePetId || newDefenderState.id === player.activeRetainerId;

    if (result.damage > 0) {
        newDefenderState.currentHp = Math.max(0, newDefenderState.currentHp - result.damage);
        const defenderSide = newDefenderState.id === player.id ? 'player' : (newDefenderState.id === player.activePetId ? 'pet' : 'enemy');
        addFloatingText(result.damage.toString(), 'damage', defenderSide);
        if (attacker.id === player.id || attacker.id === player.activePetId) {
            setShake(true);
            setTimeout(() => setShake(false), 300);
        }
    } else if (result.damage < 0) { // Healing
        const healAmount = Math.abs(result.damage);
        newDefenderState.currentHp = Math.min(newDefenderState.derivedStats.HP, newDefenderState.currentHp + healAmount);
        const defenderSide = newDefenderState.id === player.id ? 'player' : (newDefenderState.id === player.activePetId ? 'pet' : 'enemy');
        addFloatingText(healAmount.toString(), 'heal', defenderSide);
    }
    
    if(result.lifestealAmount > 0) {
        newAttackerState.currentHp = Math.min(newAttackerState.derivedStats.HP, newAttackerState.currentHp + result.lifestealAmount);
        const attackerSide = newAttackerState.id === player.id ? 'player' : (newAttackerState.id === player.activePetId ? 'pet' : 'enemy');
        addFloatingText(result.lifestealAmount.toString(), 'lifesteal', attackerSide);
    }

    if(result.elementalEffect) {
        const side = isPlayerSideDefender ? (newDefenderState.id === player.id ? 'player' : 'pet') : 'enemy';
        addFloatingText(result.elementalEffect, result.elementalEffect, side);
    }

    if (result.appliedEffects.length > 0) {
        newDefenderState.activeEffects = [...newDefenderState.activeEffects, ...result.appliedEffects];
    }

    updateMultipleParticipantsState([newAttackerState, newDefenderState]);

    if (newDefenderState.currentHp <= 0) {
        addToLog(`${newDefenderState.name} đã bị đánh bại!`, 'system');
        setTimeout(() => endCombat(!isPlayerSideDefender), 500);
    }
  }, [addToLog, endCombat, addFloatingText, updateMultipleParticipantsState, player.id, player.activePetId, player.activeRetainerId]);


useEffect(() => {
    if (isCombatOver || combatEndedRef.current || participants.length === 0 || isPlayerTurn) {
        return; 
    }

    const actionDelay = 1000;

    const performAIAction = async () => {
        if (combatEndedRef.current) return;

        const currentParticipants = participantsRef.current;
        const attacker = currentParticipants.find(p => p.id === participants[turnIndex]?.id);

        if (!attacker || attacker.currentHp <= 0) {
            nextTurn();
            return;
        }

        const isPlayerSideAttacker = attacker.id === player.activePetId || attacker.id === player.activeRetainerId;
        let potentialTargets = currentParticipants.filter(p => p.currentHp > 0);
        
        if (isPlayerSideAttacker) {
            potentialTargets = potentialTargets.filter(p => p.id !== player.id && p.id !== player.activePetId && p.id !== player.activeRetainerId);
        } else {
            potentialTargets = potentialTargets.filter(p => p.id === player.id || p.id === player.activePetId || p.id === player.activeRetainerId);
        }

        if (potentialTargets.length === 0) {
            nextTurn();
            return;
        }

        const target = potentialTargets.sort((a, b) => a.currentHp - b.currentHp)[0];
        
        let skillToUse: Skill | undefined = undefined;
        let attackerAfterAction = { ...attacker };

        const usableSkills = attacker.skills.filter(s => s.type === SkillType.ACTIVE && (!s.mpCost || ('currentMp' in attacker && attacker.currentMp >= s.mpCost)));
        if (usableSkills.length > 0 && Math.random() < 0.6) {
            skillToUse = usableSkills[Math.floor(Math.random() * usableSkills.length)];
            if (skillToUse.mpCost && 'currentMp' in attackerAfterAction) {
                attackerAfterAction.currentMp -= skillToUse.mpCost;
            }
        }

        const finalTarget = currentParticipants.find(p => p.id === target.id);
        if (!finalTarget || finalTarget.currentHp <= 0) { // Re-validate target
             nextTurn();
             return;
        }

        const result = skillToUse 
            ? useSkill(attackerAfterAction, finalTarget, skillToUse)
            : performAttack(attackerAfterAction, finalTarget);

        await processAction(result, attackerAfterAction, finalTarget, skillToUse);

        if (!combatEndedRef.current) setTimeout(nextTurn, 500);
    };

    setTimeout(performAIAction, actionDelay);
    
}, [turnIndex, participants, isCombatOver, isPlayerTurn]);

  const handleAttack = () => {
      if (!playerInCombat || !enemyInCombat) return;
      const result = performAttack(playerInCombat, enemyInCombat);
      processAction(result, playerInCombat, enemyInCombat);
      if (!combatEndedRef.current) setTimeout(nextTurn, 500);
  };

  const handleUseSkill = (skill: Skill) => {
      if (!playerInCombat || !enemyInCombat) return;
      const newPlayer = {...playerInCombat};
      if (skill.mpCost && newPlayer.currentMp < skill.mpCost) {
          addToLog("Không đủ MP!", 'error');
          return;
      }
      if (skill.mpCost) {
          newPlayer.currentMp -= skill.mpCost;
      }
      
      const result = useSkill(newPlayer, enemyInCombat, skill);
      processAction(result, newPlayer, enemyInCombat, skill);
      setShowSkillList(false);
      if (!combatEndedRef.current) setTimeout(nextTurn, 500);
  };

  const canCatchPet = useMemo(() => {
    if (!playerInCombat || !enemyInCombat) return false;
    if (enemyInCombat.isBoss || enemyInCombat.isHumanoid) return false;
    return (playerInCombat.consumables[UpgradeConsumable.LINH_THU_PHU] || 0) > 0;
  }, [playerInCombat, enemyInCombat]);

  const canEnslave = useMemo(() => {
    if (!playerInCombat || !enemyInCombat) return false;
    const hpPercent = enemyInCombat.currentHp / enemyInCombat.derivedStats.HP;
    return enemyInCombat.isHumanoid && hpPercent < 0.2 && (playerInCombat.consumables[UpgradeConsumable.HON_AN_PHU] || 0) > 0;
  }, [playerInCombat, enemyInCombat]);

  const linhThuPhuCount = playerInCombat?.consumables[UpgradeConsumable.LINH_THU_PHU] || 0;
  const honAnPhuCount = playerInCombat?.consumables[UpgradeConsumable.HON_AN_PHU] || 0;

  const handleCatchAttempt = async () => {
    if (!canCatchPet) return;
    const result = await handleCatchPet();
    addToLog(result.message, result.success ? 'info' : 'action');
    if (!result.success) {
        if (!combatEndedRef.current) setTimeout(nextTurn, 500);
    }
  };

  const handleEnslaveAttempt = async () => {
      if (!canEnslave) return;
      const result = await handleEnslaveTarget();
      addToLog(result.message, result.success ? 'info' : 'action');
      if (!result.success) {
          if (!combatEndedRef.current) setTimeout(nextTurn, 500);
      }
  };

  if (participants.length === 0) {
    const activePet = player.pets.find(p => p.id === player.activePetId);
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 animate-fade-in"
             style={{ backgroundImage: `url('https://i.pinimg.com/originals/a3/52/65/a35265a7593a1136293521d74a0063c8.gif')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
            <div className="relative z-10 w-full max-w-4xl text-center">
                <div className="grid grid-cols-3 items-center gap-4">
                    <div className="flex flex-col items-center gap-4 animate-fade-in-left" style={{ animationDelay: '0.2s' }}>
                        <img src={player.imageUrl || 'https://via.placeholder.com/150'} alt={player.name} className="w-40 h-40 rounded-full border-4 border-cyan-500 shadow-lg object-cover" />
                        <h2 className="text-2xl font-bold text-cyan-300">{player.name}</h2>
                        {activePet && (
                            <div className="flex items-center gap-2 mt-2 opacity-80">
                                <img src={activePet.imageUrl || 'https://via.placeholder.com/50'} alt={activePet.name} className="w-12 h-12 rounded-full border-2 border-green-500 object-cover" />
                                <span className="text-lg font-semibold text-green-300">{activePet.name}</span>
                            </div>
                        )}
                    </div>
                    <div className="text-6xl font-extrabold text-red-500 animate-pulse drop-shadow-[0_0_15px_#ef4444]">VS</div>
                    <div className="flex flex-col items-center gap-4 animate-fade-in-right" style={{ animationDelay: '0.2s' }}>
                         <img src={initialEnemy.imageUrl || 'https://via.placeholder.com/150'} alt={initialEnemy.name} className="w-40 h-40 rounded-full border-4 border-red-500 shadow-lg object-cover" />
                        <h2 className="text-2xl font-bold text-red-300">{initialEnemy.name}</h2>
                    </div>
                </div>
                <div className="mt-12 flex items-center justify-center gap-3 text-xl text-gray-300 animate-pulse">
                     <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     <span>Chuẩn bị chiến đấu...</span>
                </div>
            </div>
        </div>
    );
  }

  const handleContinueAfterCombat = () => {
    const finalPlayer = participantsRef.current.find(p => p.id === player.id) as Character;
    const finalPet = participantsRef.current.find(p => p.id === player.activePetId) as Pet | undefined;
    handleCombatEnd(!!rewards, finalPlayer, finalPet || null, rewards?.exp || 0, rewards?.items || [], rewards?.materials || {}, rewards?.consumables || {});
  }
  
  return (
    <div className={`min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-2 sm:p-4 transition-transform duration-500 ${shake ? 'animate-screen-shake' : ''}`}
         style={{ backgroundImage: `url('https://i.pinimg.com/originals/a3/52/65/a35265a7593a1136293521d74a0063c8.gif')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
        {/* Floating text container */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 z-20">
            {/* Player/Pet Side */}
            <div className="relative">
                 {floatingTexts.filter(t => t.side === 'player' || t.side === 'pet').map(t => (
                    <span key={t.id} className={`absolute top-1/3 left-1/3 animate-float-up font-bold text-2xl ${t.type === 'damage' || t.type === 'dot' ? 'text-red-500' : 'text-green-400'} drop-shadow-lg`}>{t.text}</span>
                 ))}
            </div>
            <div />
            {/* Enemy Side */}
            <div className="relative">
                 {floatingTexts.filter(t => t.side === 'enemy').map(t => (
                    <span key={t.id} className={`absolute top-1/3 left-1/3 animate-float-up font-bold text-2xl ${t.type === 'damage' || t.type === 'dot' ? 'text-red-500' : 'text-green-400'} drop-shadow-lg`}>{t.text}</span>
                 ))}
            </div>
        </div>

        <div className="relative z-10 w-full max-w-7xl h-[calc(100vh-2rem)] flex flex-col">
            {/* Top Row: Combatants Display */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-2">
                {playerInCombat ? <CombatantDisplay combatant={playerInCombat} isPlayerSide={true} isActiveTurn={participants[turnIndex]?.id === playerInCombat.id} /> : <div/>}
                {petInCombat ? <CombatantDisplay combatant={petInCombat} isPlayerSide={true} isActiveTurn={participants[turnIndex]?.id === petInCombat.id} /> : (retainerInCombat ? <CombatantDisplay combatant={retainerInCombat} isPlayerSide={true} isActiveTurn={participants[turnIndex]?.id === retainerInCombat.id} /> : <div/>)}
                {enemyInCombat ? <CombatantDisplay combatant={enemyInCombat} isPlayerSide={false} isActiveTurn={participants[turnIndex]?.id === enemyInCombat.id} />: <div/>}
            </div>

            {/* Middle Row: Turn Order */}
            <TurnOrderDisplay participants={participants} currentIndex={turnIndex} />

            {/* Bottom Row: Log and Actions */}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden h-48 sm:h-auto">
                {/* Combat Log */}
                <div className="md:col-span-2 bg-[var(--color-backdrop-bg)] backdrop-blur-md border border-[var(--color-border-base)] p-2 sm:p-4 rounded-lg flex flex-col h-full overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-300 mb-2 flex-shrink-0">Nhật Ký Chiến Đấu</h3>
                    <div className="flex-grow overflow-y-auto space-y-2 flex flex-col-reverse pr-2">
                        {combatLog.map(log => (
                             <p key={log.id} className={`text-sm animate-fade-in ${log.type === 'error' ? 'text-red-400' : (log.type === 'info' ? 'text-yellow-300' : (log.type === 'narration' ? 'text-purple-300 italic' : 'text-gray-300'))}`}>{log.text}</p>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="relative bg-[var(--color-backdrop-bg)] backdrop-blur-md border border-[var(--color-border-base)] p-2 sm:p-4 rounded-lg flex flex-col justify-center">
                     {isPlayerTurn && !isCombatOver && (
                        <div className="space-y-2 animate-fade-in">
                            <h3 className="text-lg font-bold text-purple-300 text-center mb-2">Đến lượt bạn!</h3>
                            <button onClick={handleAttack} className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 font-bold p-3 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg">Tấn Công</button>
                            <button onClick={() => setShowSkillList(true)} className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 font-bold p-3 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg">Kỹ Năng</button>
                            {canCatchPet && <button onClick={handleCatchAttempt} className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 font-bold p-2 rounded-lg text-sm transition-transform transform hover:scale-105 shadow-md">Thu Phục ({linhThuPhuCount})</button>}
                            {canEnslave && <button onClick={handleEnslaveAttempt} className="w-full bg-gradient-to-r from-purple-700 to-purple-900 hover:from-purple-600 hover:to-purple-800 font-bold p-2 rounded-lg text-sm transition-transform transform hover:scale-105 shadow-md">Nô Dịch ({honAnPhuCount})</button>}
                        </div>
                    )}
                    {!isPlayerTurn && !isCombatOver && (
                         <div className="text-center text-gray-400 animate-pulse">
                            Đối phương đang hành động...
                         </div>
                    )}
                     {isCombatOver && (
                        <div className="text-center animate-fade-in">
                            <h3 className={`text-3xl font-bold ${rewards ? 'text-yellow-400' : 'text-red-500'}`}>{rewards ? "Chiến Thắng!" : "Thất Bại"}</h3>
                            {rewards && (
                                <div className="mt-4 p-4 bg-black/30 rounded-lg max-h-48 overflow-y-auto text-left text-sm">
                                    <h4 className="font-bold text-lg text-green-300 mb-2">Phần thưởng:</h4>
                                    <p>EXP: <span className="font-semibold text-white">{rewards.exp.toLocaleString()}</span></p>
                                    {rewards.items.map(item => <p key={item.id} className="text-green-400">Vật phẩm: {item.name}</p>)}
                                    {Object.entries(rewards.materials).map(([mat, count]) => <p key={mat} className="text-cyan-400">Nguyên liệu: {count}x {mat}</p>)}
                                    {Object.entries(rewards.consumables).map(([con, count]) => <p key={con} className="text-yellow-400">Vật phẩm: {count}x {con}</p>)}
                                </div>
                            )}
                            <button onClick={handleContinueAfterCombat} className="mt-4 w-full bg-gray-600 hover:bg-gray-500 font-bold p-3 rounded-lg">
                                Tiếp Tục
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Skill List Modal */}
        {showSkillList && playerInCombat && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30 animate-fade-in" onClick={() => setShowSkillList(false)}>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <h3 className="text-2xl font-bold text-blue-400 mb-4">Chọn Kỹ Năng</h3>
                    <div className="space-y-3">
                         {playerInCombat.skills.filter(s => s.type === SkillType.ACTIVE).map(skill => (
                            <div key={skill.id} onClick={() => playerInCombat.currentMp >= (skill.mpCost || 0) && handleUseSkill(skill)}
                                 className={`p-3 rounded-lg transition-colors ${playerInCombat.currentMp < (skill.mpCost || 0) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900/50 hover:bg-gray-700 cursor-pointer'}`}>
                                <div className="flex justify-between font-bold">
                                    <span>{skill.name}</span>
                                    <span className="text-blue-400">{skill.mpCost || 0} MP</span>
                                </div>
                                <p className="text-sm text-gray-400 mt-1 italic">"{skill.description}"</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
export default CombatScreen;
