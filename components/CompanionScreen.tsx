
import React from 'react';
// Fix: Corrected import path for types.
import { useGame } from '../contexts/GameContext';
import { ServantTask, Servant } from '../types';

const ServantCard: React.FC<{ servant: Servant }> = ({ servant }) => {
    const { handleAssignServantTask } = useGame();
    return (
        <div className="bg-gray-800/60 p-4 rounded-lg border border-purple-500/30 flex items-center gap-4">
            <img src={servant.imageUrl || 'https://via.placeholder.com/150'} alt={servant.name} className="w-16 h-16 rounded-full border-2 border-purple-400 object-cover" />
            <div className="flex-grow">
                <h4 className="text-lg font-bold text-purple-300">{servant.name}</h4>
                <p className="text-sm text-gray-400">Cấp {servant.level} {servant.characterClass}</p>
                <div className="mt-2 flex items-center gap-2">
                    <label htmlFor={`task-${servant.id}`} className="text-xs text-gray-300">Nhiệm vụ:</label>
                    <select
                        id={`task-${servant.id}`}
                        value={servant.task}
                        onChange={(e) => handleAssignServantTask(servant.id, e.target.value as ServantTask)}
                        className="bg-gray-700 text-white text-xs p-1 rounded"
                    >
                        {Object.values(ServantTask).map((task: ServantTask) => (
                            <option key={task} value={task}>{task}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};


const CompanionScreen: React.FC = () => {
    const { character } = useGame();

    if (!character) return null;

    const { retainers, servants, activeRetainerId } = character;

    return (
        <div className="max-h-[70vh] overflow-y-auto pr-3 space-y-6">
            <div>
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Thị Vệ</h3>
                <div className="text-center text-gray-500 p-8 bg-gray-700/50 rounded-lg">
                    <p>Chưa có thị vệ nào.</p>
                </div>
            </div>
             <div>
                <h3 className="text-xl font-bold text-cyan-300 mb-3">Nô Bộc ({servants.length})</h3>
                {servants.length > 0 ? (
                    <div className="space-y-4">
                        {servants.map(servant => <ServantCard key={servant.id} servant={servant} />)}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 p-8 bg-gray-700/50 rounded-lg">
                        <p>Chưa có nô bộc nào.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CompanionScreen;