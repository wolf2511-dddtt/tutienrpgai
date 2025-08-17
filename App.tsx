import React, { useEffect } from 'react';
import { GameScreen, FontSize, ColorTheme } from './types';
import MainMenu from './components/MainMenu';
import CharacterCreator from './components/CharacterCreator';
import WorldScreen from './components/WorldScreen';
import { CombatScreen } from './components/CombatScreen';
import { ForgeScreen } from './components/ForgeScreen';
import ImageLibrary from './components/ImageLibrary';
import Settings from './components/Settings';
import SaveManagement from './components/SaveManagement';
import { GameProvider, useGame } from './contexts/GameContext';
import DialogueModal from './components/DialogueModal';
import DungeonScreen from './components/DungeonScreen';
import WorldDesigner from './components/WorldDesigner';
import LevelUpModal from './components/LevelUpModal';

const AppContent: React.FC = () => {
  const { 
    screen, character, enemy, appSettings,
    handleOpenMenu, handleBackToMenu
  } = useGame();

  // Effect to refresh save slots when navigating to relevant screens
  const { refreshSaveSlots, levelUpInfo } = useGame();
  useEffect(() => {
    if (screen === GameScreen.MENU || screen === GameScreen.SAVE_MANAGEMENT) {
        refreshSaveSlots();
    }
  }, [screen, refreshSaveSlots]);

  useEffect(() => {
    const root = document.documentElement;
    // Font size
    Object.values(FontSize).forEach(size => root.classList.remove(`font-size-${size}`));
    root.classList.add(`font-size-${appSettings.fontSize}`);

    // Color theme
    Object.values(ColorTheme).forEach(theme => root.classList.remove(`theme-${theme}`));
    root.classList.add(`theme-${appSettings.colorTheme}`);
  }, [appSettings.fontSize, appSettings.colorTheme]);


  const renderScreen = () => {
    switch (screen) {
      case GameScreen.MENU:
        return <MainMenu />;
      case GameScreen.CREATOR:
        return <CharacterCreator />;
      case GameScreen.WORLD_DESIGNER:
        return <WorldDesigner />;
      case GameScreen.WORLD:
        return character && <WorldScreen />;
      case GameScreen.COMBAT:
        return character && enemy && <CombatScreen />;
      case GameScreen.FORGE:
        return character && <ForgeScreen />;
      case GameScreen.IMAGE_LIBRARY:
        return <ImageLibrary />;
      case GameScreen.SETTINGS:
        return <Settings onClose={character ? () => handleOpenMenu(GameScreen.WORLD) : handleBackToMenu} />;
      case GameScreen.SAVE_MANAGEMENT:
        return <SaveManagement onClose={character ? () => handleOpenMenu(GameScreen.WORLD) : handleBackToMenu} />;
      case GameScreen.DIALOGUE:
        return <DialogueModal />;
      case GameScreen.DUNGEON:
        return character && <DungeonScreen />;
      default:
        return <MainMenu />;
    }
  };

  return (
    <div className="bg-gray-900">
      {renderScreen()}
      {levelUpInfo && <LevelUpModal />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;