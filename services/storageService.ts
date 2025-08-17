import { AppSettings, SaveFile, SaveSlot } from '../types';
import { NUM_SAVE_SLOTS, LOCAL_STORAGE_KEY_SETTINGS, LOCAL_STORAGE_KEY_SAVE_GAME, LOCAL_STORAGE_KEY_API_KEY, DEFAULT_SETTINGS } from '../constants';

// --- Settings Management ---

export const saveSettings = (settings: AppSettings): void => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
        console.error("Failed to save settings:", e);
    }
};

export const loadSettings = (): AppSettings => {
    try {
        const settingsJson = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
        if (settingsJson) {
            return { ...DEFAULT_SETTINGS, ...JSON.parse(settingsJson) };
        }
    } catch (e) {
        console.error("Failed to load settings:", e);
    }
    return DEFAULT_SETTINGS;
};

// --- API Key Management ---

export const saveApiKey = (apiKey: string): void => {
    try {
        if(apiKey && apiKey.trim()) {
            localStorage.setItem(LOCAL_STORAGE_KEY_API_KEY, apiKey.trim());
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY);
        }
    } catch (e) {
        console.error("Failed to save API key:", e);
    }
};

export const loadApiKey = (): string | null => {
    try {
        return localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY);
    } catch (e) {
        console.error("Failed to load API key:", e);
        return null;
    }
};


// --- Game Save/Load Management ---

export const saveGame = (slotId: number, saveFile: SaveFile): void => {
    try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_SAVE_GAME}${slotId}`, JSON.stringify(saveFile));
    } catch (e) {
        console.error(`Failed to save game in slot ${slotId}:`, e);
    }
};

export const loadGame = (slotId: number): SaveFile | null => {
    try {
        const saveJson = localStorage.getItem(`${LOCAL_STORAGE_KEY_SAVE_GAME}${slotId}`);
        if (saveJson) {
            return JSON.parse(saveJson) as SaveFile;
        }
    } catch (e) {
        console.error(`Failed to load game from slot ${slotId}:`, e);
    }
    return null;
};

export const deleteSave = (slotId: number): void => {
    try {
        localStorage.removeItem(`${LOCAL_STORAGE_KEY_SAVE_GAME}${slotId}`);
    } catch (e) {
        console.error(`Failed to delete save in slot ${slotId}:`, e);
    }
};

export const loadAllSaveSlots = (): SaveSlot[] => {
    const slots: SaveSlot[] = [];
    for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
        const file = loadGame(i);
        if (file && file.character) {
            slots.push({
                slotId: i,
                characterName: file.character.name,
                level: file.character.level,
                realm: file.character.realm.name,
                saveDate: file.saveDate || "Không rõ"
            });
        } else {
            slots.push({
                slotId: i,
                characterName: '',
                level: 0,
                realm: '',
                saveDate: ''
            });
        }
    }
    return slots;
};

export const deleteAllData = (): void => {
    try {
        // Delete api key
        localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY);
        // Delete settings
        localStorage.removeItem(LOCAL_STORAGE_KEY_SETTINGS);
        // Delete all save slots
        for (let i = 0; i < NUM_SAVE_SLOTS; i++) {
            deleteSave(i);
        }
        console.log("All application data deleted.");
    } catch(e) {
        console.error("Error deleting all data:", e);
    }
}
