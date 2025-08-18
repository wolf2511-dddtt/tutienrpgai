import React, { useState, useEffect } from 'react';
import { GameScreen } from '../types';
import { useGame } from '../contexts/GameContext';
import { MENU_BACKGROUND_IMAGES } from '../data/menuBackgrounds';
import ChangelogModal from './ChangelogModal';

const MainMenu: React.FC = () => {
    const { handleOpenImageLibrary, isFullscreen, handleToggleFullscreen, handleOpenMenu, saveSlots, handleStartNewGame, handleQuickPlay, isQuickPlayLoading, handleDevQuickStart } = useGame();
    const activeSaveCount = saveSlots.filter(s => s.characterName).length;
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [version, setVersion] = useState('');
    const [isChangelogVisible, setIsChangelogVisible] = useState(false);

    useEffect(() => {
        // Fetch and parse version from metadata.json
        fetch('/metadata.json')
            .then(res => res.json())
            .then(data => {
                const name = data.name || '';
                const versionMatch = name.match(/(\d+\.\d+\.\d+)/);
                if (versionMatch) {
                    setVersion(versionMatch[1]);
                } else {
                    setVersion('N/A');
                }
            })
            .catch(err => {
                console.error("Could not load version from metadata", err);
                setVersion('N/A');
            });
        
        const preloadImages = () => {
            MENU_BACKGROUND_IMAGES.forEach(src => {
                new Image().src = src;
            });
        };
        preloadImages();

        const intervalId = setInterval(() => {
            setCurrentImageIndex(prevIndex => (prevIndex + 1) % MENU_BACKGROUND_IMAGES.length);
        }, 15000); // 15 seconds

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
                style={{ backgroundImage: `url(${MENU_BACKGROUND_IMAGES[currentImageIndex]})`}}
                key={currentImageIndex} // force re-render for css transition
            />
            {/* Black overlay for readability */}
            <div className="absolute inset-0 bg-black/50 z-0" />

            <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-orange-400 mb-8 drop-shadow-[0_0_15px_#f97316]">
                    RPG Tiên Hiệp Designer
                </h1>
                <div className="space-y-4 w-64">
                    <button
                        onClick={handleStartNewGame}
                        disabled={isQuickPlayLoading}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-all duration-300 ease-in-out animate-pulse-glow disabled:animate-none disabled:bg-gray-600"
                    >
                        Bắt đầu mới
                    </button>
                    <button
                        onClick={handleQuickPlay}
                        disabled={isQuickPlayLoading}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg text-lg transition-all duration-300 ease-in-out disabled:bg-gray-600 flex items-center justify-center"
                    >
                        {isQuickPlayLoading && (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {isQuickPlayLoading ? 'Đang tạo...' : 'Chơi Nhanh (AI)'}
                    </button>
                </div>
            </div>
            <footer className="relative z-10 text-center text-gray-300 text-sm pb-4">
                <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mb-2">
                    <button onClick={() => handleOpenMenu(GameScreen.SAVE_MANAGEMENT)} className="hover:text-white transition-colors">Quản lý Lưu trữ ({activeSaveCount})</button>
                    <button onClick={() => handleOpenMenu(GameScreen.SETTINGS)} className="hover:text-white transition-colors">Thiết Lập</button>
                    <button onClick={handleToggleFullscreen} className="hover:text-white transition-colors">
                        {isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình'}
                    </button>
                    <button onClick={handleOpenImageLibrary} className="hover:text-white transition-colors">Thư Viện Ảnh</button>
                    <button onClick={handleDevQuickStart} className="text-yellow-400 hover:text-yellow-300 transition-colors">Vào Nhanh (Dev)</button>
                </div>
                <button onClick={() => setIsChangelogVisible(true)} className="hover:text-white transition-colors">
                    Phiên bản {version}
                </button>
            </footer>
            {isChangelogVisible && <ChangelogModal onClose={() => setIsChangelogVisible(false)} />}
        </div>
    );
};

export default MainMenu;