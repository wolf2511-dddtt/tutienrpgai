import { AppSettings, SaveFile, SaveSlot } from '../types';
import { NUM_SAVE_SLOTS, LOCAL_STORAGE_KEY_SETTINGS, LOCAL_STORAGE_KEY_SAVE_GAME, LOCAL_STORAGE_KEY_API_KEYS, LOCAL_STORAGE_KEY_API_KEY_OLD, DEFAULT_SETTINGS } from '../constants';

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

export const saveApiKeys = (apiKeys: string[]): void => {
    try {
        // Filter out any empty/whitespace keys before saving
        const validKeys = apiKeys.map(k => k.trim()).filter(Boolean);
        if (validKeys.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEY_API_KEYS, JSON.stringify(validKeys));
        } else {
            localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEYS);
        }
        // Once new keys are saved, we can remove the old single key if it exists
        if (localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY_OLD)) {
            localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY_OLD);
        }
    } catch (e) {
        console.error("Failed to save API keys:", e);
    }
};

export const loadApiKeys = (): string[] => {
    try {
        const keysJson = localStorage.getItem(LOCAL_STORAGE_KEY_API_KEYS);
        if (keysJson) {
            const keys = JSON.parse(keysJson);
            if (Array.isArray(keys) && keys.every(k => typeof k === 'string')) {
                return keys.map(k => k.trim()).filter(Boolean);
            }
        }

        // Migration logic: if new key list doesn't exist, check for the old single key
        const oldKey = localStorage.getItem(LOCAL_STORAGE_KEY_API_KEY_OLD);
        if (oldKey) {
            const migratedKeys = [oldKey.trim()].filter(Boolean);
            if (migratedKeys.length > 0) {
                 // Save in the new format and remove the old one
                saveApiKeys(migratedKeys);
                return migratedKeys;
            }
        }

    } catch (e) {
        console.error("Failed to load API keys:", e);
    }
    return [];
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
        // Delete api keys (both new and old formats)
        localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEYS);
        localStorage.removeItem(LOCAL_STORAGE_KEY_API_KEY_OLD);
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