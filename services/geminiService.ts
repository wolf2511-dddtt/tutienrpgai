import { GoogleGenAI, Type, GenerateContentResponse, GenerateImagesResponse } from "@google/genai";
import { Item, PlayerClass, UpgradeAIResult, TerrainType, DialogueTurn, Character, Poi, QuestType, ItemType, SoulEffect, Stat, Difficulty, Rarity, ExplorationEvent, DialogueState, Quest, QuestStatus, Skill, SkillType, SkillEffectType, TargetType, SkillEffect, WorldState, UpgradeMaterial, CultivationTechnique, Faction, FactionType, SectStoreItem, DialogueAIResponse, MonsterTemplate, NpcTemplate, AITactic, Combatant, DungeonState, DungeonFloorType, Pet, BaseStats, ForgeOptions, Element, CultivationTechniqueType } from '../types';
import { generateItem } from "./gameLogic";
import { loadApiKeys } from "./storageService";
import { RARITY_DATA } from "../constants";

let ai: GoogleGenAI | null = null;

// Helper function to handle API calls with retry logic for rate limiting
async function callGeminiWithRetry<T>(apiCall: () => Promise<T>, maxRetries = 3, initialDelay = 5000): Promise<T> {
    let retries = 0;
    while (true) {
        try {
            return await apiCall();
        } catch (error: any) {
            const errorMessage = (error.message || error.toString()).toLowerCase();
            // Check for common rate limit / quota exhaustion messages, now including internal errors
            const isRetryable = errorMessage.includes('429') ||
                              errorMessage.includes('500') ||
                              errorMessage.includes('internal error') ||
                              errorMessage.includes('resource_exhausted') ||
                              errorMessage.includes('rate limit') ||
                              errorMessage.includes('quota');

            if (isRetryable && retries < maxRetries) {
                retries++;
                const delay = initialDelay * Math.pow(2, retries - 1) + Math.random() * 1000; // Add jitter
                console.warn(`API call failed with a retryable error. Retrying in ${Math.round(delay)}ms... (Attempt ${retries}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`API call failed after ${retries} retries or with a non-retryable error.`, error);
                if (isRetryable) {
                    throw new Error("Lỗi giới hạn truy cập API. Vui lòng đợi một lát rồi thử lại.");
                }
                throw error; // Re-throw the original error for other cases
            }
        }
    }
}


// This function will set up the client. It can be called again if the key changes.
export function reinitializeAiClient() {
    const apiKeys = loadApiKeys();
    // Select a random key from the pool to use for this session/initialization
    const activeApiKey = apiKeys.length > 0 ? apiKeys[Math.floor(Math.random() * apiKeys.length)] : null;
    const apiKey = activeApiKey || process.env.API_KEY;

    if (!apiKey) {
        ai = null; // Invalidate client if no key is available
        return;
    }
    
    try {
        ai = new GoogleGenAI({ apiKey });
    } catch (e) {
        console.error("Failed to initialize GoogleGenAI. The API Key might be invalid.", e);
        ai = null; // Invalidate client on bad key
    }
}


function getAiClient(): GoogleGenAI {
    if (!ai) {
        reinitializeAiClient();
    }
    if (!ai) {
        const keyCount = loadApiKeys().length;
        if (keyCount > 0) {
             throw new Error(`Đã có ${keyCount} API Key được lưu, nhưng không thể khởi tạo Google Gemini client. Key có thể không hợp lệ.`);
        }
        // Updated error message to be more helpful
        throw new Error("API Key của Google Gemini chưa được cấu hình. Vui lòng vào mục 'Thiết Lập' để nhập key, hoặc đảm bảo biến môi trường API_KEY đã được thiết lập chính xác.");
    }
    return ai;
}


// Helper for creating flexible stat schemas for the Gemini API
const allStatsProperties = Object.fromEntries(
    Object.values(Stat).map(stat => [stat, { type: Type.NUMBER, nullable: true }])
);

// Reusable schemas for Sect Store generation
const cultivationTechniqueDetailsSchema = {
    type: Type.OBJECT,
    nullable: true,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        type: { type: Type.STRING, enum: Object.values(CultivationTechniqueType) },
        maxLevel: { type: Type.NUMBER },
        bonusesPerLevel: {
             type: Type.ARRAY, items: {
                type: Type.OBJECT,
                properties: {
                    stat: { type: Type.STRING, enum: Object.values(Stat) },
                    value: { type: Type.NUMBER },
                    isPercent: { type: Type.BOOLEAN }
                },
                required: ["stat", "value", "isPercent"]
            }
        },
        bonuses: { type: Type.ARRAY, items: {
            type: Type.OBJECT,
            properties: {
                stat: { type: Type.STRING, enum: Object.values(Stat) },
                value: { type: Type.NUMBER },
                isPercent: { type: Type.BOOLEAN }
            },
            required: ["stat", "value", "isPercent"]
        } }
    },
    required: ["name", "description", "type", "maxLevel", "bonusesPerLevel", "bonuses"]
};

const itemSchemaForStore = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING, nullable: true },
        type: { type: Type.STRING, enum: Object.values(ItemType) },
        level: { type: Type.NUMBER },
        rarity: { type: Type.STRING, enum: Object.values(Rarity) },
        baseStats: { type: Type.OBJECT, properties: allStatsProperties },
        bonusStats: { type: Type.OBJECT, properties: allStatsProperties },
        maxUpgrade: { type: Type.NUMBER },
        cultivationTechniqueDetails: cultivationTechniqueDetailsSchema
    },
    required: ["name", "type", "level", "rarity", "baseStats", "bonusStats", "maxUpgrade"]
};

const storeItemSchema = {
    type: Type.OBJECT,
    properties: {
        item: itemSchemaForStore,
        cost: { type: Type.NUMBER }
    },
    required: ["item", "cost"]
};


// Helper function to fetch an image from a URL and convert it to a GoogleGenerativeAI.Part object.
async function urlToGoogleGenerativeAIPart(url: string): Promise<{ part: any | null, error: string | null }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            return { part: null, error: `Failed to fetch image. Status: ${response.status}` };
        }
        const mimeType = response.headers.get('Content-Type');
        if (!mimeType || !mimeType.startsWith('image/')) {
            return { part: null, error: `URL does not point to a valid image. Mime-type: ${mimeType}` };
        }
        const blob = await response.blob();
        const base64data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        return {
            part: {
                inlineData: {
                    mimeType: mimeType,
                    data: base64data
                }
            },
            error: null
        };
    } catch (e: any) {
        console.error("Error converting URL to Part:", e);
        return { part: null, error: "Không thể lấy ảnh từ URL. Đây có thể là lỗi CORS. Vui lòng sử dụng URL ảnh từ máy chủ cho phép yêu cầu cross-origin." };
    }
}


export const generateItemDetails = async (item: Item): Promise<{name: string, description: string}> => {
    const prompt = `Dựa trên thông tin vật phẩm sau đây trong một game RPG tiên hiệp, hãy tạo ra một cái tên thật "kêu" và một đoạn mô tả ngắn (1-2 câu) về truyền thuyết hoặc sức mạnh của nó.
    - Loại vật phẩm: ${item.type}
    - Độ hiếm: ${item.rarity}
    - Cấp độ: ${item.level}
    - Chỉ số chính: ${Object.keys(item.baseStats)[0]} ${Object.values(item.baseStats)[0]}
    - Chỉ số phụ: ${Object.keys(item.bonusStats).join(', ')}
    
    Chỉ trả về tên và mô tả, không thêm bất kỳ lời dẫn nào. Ví dụ:
    Tên: Long Hồn Kiếm
    Mô tả: Tương truyền được rèn từ vảy của một con rồng cổ đại, mỗi nhát chém đều mang theo long uy.
    `;

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        const text = response.text;
        const nameMatch = text.match(/Tên: (.*)/);
        const descMatch = text.match(/Mô tả: (.*)/);

        const name = nameMatch ? nameMatch[1].trim() : item.name;
        const description = descMatch ? descMatch[1].trim() : "Một vật phẩm đầy bí ẩn.";

        return { name, description };
    } catch (error: any) {
        console.error("Error generating item details:", error);
        return { name: item.name, description: `Một vật phẩm đầy bí ẩn. (Lỗi AI: ${error.message})` };
    }
};

export const generateBonusStatsForItem = async (item: Item, numBonuses: number): Promise<{ [key: string]: number }> => {
    const prompt = `You are an expert RPG game designer. For the given item, generate a set of thematic bonus stats.

    **Item Context:**
    - Name: "${item.name}"
    - Type: ${item.type}
    - Rarity: ${item.rarity}
    - Level: ${item.level}
    - Base Stats: ${JSON.stringify(item.baseStats)}
    - Description: "${item.description || 'Không có mô tả'}"

    **Instructions:**
    1.  **Generate exactly ${numBonuses} bonus stats.**
    2.  The stats MUST be thematically appropriate for the item. For a "Huyết Long Kiếm" (Blood Dragon Sword), stats like "LIFESTEAL" or "STR" are good. For "Thanh Phong Bào" (Azure Wind Robe), stats like "EVASION" or "SPEED" are good.
    3.  The stat keys MUST be chosen from the official list: ${Object.values(Stat).join(', ')}.
    4.  Calculate balanced values for these stats appropriate for the item's level and rarity. Higher rarity means better stats.
    5.  Return ONLY a valid JSON object where keys are the stat names from the list and values are the numbers. The returned object must not be empty or contain null values.

    **Example for a level 10 Epic item needing 3 bonuses:**
    {
      "CRIT_RATE": 5,
      "ATK_SPEED": 3,
      "PENETRATION": 12
    }
    `;

    const schema = {
        type: Type.OBJECT,
        properties: allStatsProperties,
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        }));
        const parsed = JSON.parse(response.text);
        
        const finalStats: { [key: string]: number } = {};
        for (const key in parsed) {
            if (parsed[key] !== null && parsed[key] !== undefined) {
                finalStats[key] = parsed[key];
            }
        }
        
        const entries = Object.entries(finalStats);
        if (entries.length > numBonuses) {
            return Object.fromEntries(entries.slice(0, numBonuses));
        }
        return finalStats;

    } catch (error) {
        console.error("Error generating bonus stats from AI:", error);
        throw new Error("AI failed to generate bonus stats.");
    }
};

export const generateExploreEvent = async (character: Character, worldState: WorldState, terrain: TerrainType, difficulty: Difficulty): Promise<ExplorationEvent> => {
    const prompt = `Bạn là một người dẫn chuyện (Storyteller) tài hoa cho một game RPG tiên hiệp.
**Bối cảnh:**
- **Thế giới:** Tên "${worldState.name}", mô tả "${worldState.description}".
- **Nhân vật:** "${character.name}" (cấp ${character.level}, cảnh giới ${character.realm.name}).
- **Địa điểm:** Địa hình là "${terrain}".
- **Độ khó:** ${difficulty}.

**Yêu cầu:**
1.  **Tạo một đoạn văn kể chuyện (logMessage):** Dựa vào bối cảnh, viết một đoạn mô tả sinh động (3-4 câu) về một sự kiện người chơi gặp phải.
2.  **Quyết định loại sự kiện (eventType):** Quyết định xem đây là "TEXT", "ENEMY", "NPC", hay "BOSS".
    - **BOSS Event (Tỉ lệ 5-10%):** Nếu chọn "BOSS", hãy mô tả một cuộc chạm trán với một kẻ địch cực kỳ mạnh mẽ, nguy hiểm, một "Hùng Chủ" của khu vực.
    - **ENEMY Event (Tỉ lệ 30%):** Một kẻ địch thông thường.
    - **NPC Event (Tỉ lệ 20%):** Một cuộc gặp gỡ với một nhân vật.
    - **TEXT Event (còn lại):** Mô tả không khí hoặc một phát hiện nhỏ.
3.  **Điền vào JSON:** Điền đầy đủ thông tin vào JSON theo schema. Nếu là NPC, hãy tạo chi tiết cho NPC đó.
`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            eventType: { type: Type.STRING, enum: ["TEXT", "ENEMY", "NPC", "BOSS"] },
            logMessage: { type: Type.STRING },
            npcDetails: {
                type: Type.OBJECT,
                nullable: true,
                properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    greeting: { type: Type.STRING },
                    imagePrompt: { type: Type.STRING }
                }
            }
        },
        required: ["eventType", "logMessage"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        }));

        const sources = undefined;
        const result = JSON.parse(response.text);

        switch (result.eventType) {
            case 'NPC':
                if (result.npcDetails) {
                    const dialogue: DialogueState = {
                        npcName: result.npcDetails.name,
                        npcRole: result.npcDetails.role,
                        npcImageUrl: undefined,
                        history: [{ speaker: 'npc', text: result.npcDetails.greeting }],
                        affinity: 0,
                        options: [],
                    };
                    return { type: 'NPC', log: result.logMessage, dialogue, groundingSources: sources };
                }
            case 'BOSS':
                return { type: 'BOSS', log: result.logMessage, groundingSources: sources };
            case 'ENEMY':
                return { type: 'ENEMY', log: result.logMessage, groundingSources: sources };
            case 'TEXT':
            default:
                return { type: 'TEXT', log: result.logMessage, groundingSources: sources };
        }
    } catch (error: any) {
        console.error("Error generating explore event:", error);
        return { type: 'TEXT', log: `Bạn đi một vòng nhưng không có gì đặc biệt xảy ra. (Lỗi AI: ${error.message})` };
    }
};

export const generateContextualActions = async (character: Character, worldState: WorldState, terrain: TerrainType): Promise<string[]> => {
    const activeQuest = character.quests.find(q => q.status === QuestStatus.ACTIVE);
    const lowHealth = (character.currentHp / character.derivedStats.HP) < 0.4; // Below 40% HP

    const prompt = `Bạn là một người quản trò (Game Master) thông minh cho game RPG tiên hiệp. Dựa vào bối cảnh hiện tại của người chơi, hãy đề xuất 3-4 hành động ngắn gọn, hợp lý mà họ có thể thực hiện.

**Bối cảnh:**
- **Nhân vật:** ${character.name}, Cấp ${character.level}, đang ở địa hình ${terrain}.
- **Tình trạng:** ${lowHealth ? "HP thấp, cần cẩn thận." : "Trạng thái tốt."}
- **Nhiệm vụ đang làm:** ${activeQuest ? `"${activeQuest.title}" (Mục tiêu: ${activeQuest.target.targetName})` : "Không có."}
- **Thế giới:** ${worldState.name || 'chưa có tên'} - ${worldState.description || 'chưa có mô tả'}

**Yêu cầu:**
1.  Tạo ra 3-4 hành động **ngắn gọn** (2-4 từ mỗi hành động).
2.  Hành động phải phù hợp với bối cảnh. Ví dụ:
    - Ở rừng: "Dò xét xung quanh", "Tìm kiếm thảo dược", "Luyện tập kiếm pháp".
    - HP thấp: "Tìm nơi nghỉ ngơi", "Sử dụng đan dược".
    - Có nhiệm vụ săn quái: "Truy lùng ${activeQuest?.target.targetName}".
3.  **KHÔNG** thêm lời dẫn hay giải thích.
4.  Trả về dưới dạng một mảng JSON các chuỗi (string array).

**Ví dụ output:**
[
  "Dò xét xung quanh",
  "Tìm kiếm Linh Thảo",
  "Tiến về phía ngọn núi"
]
`;

    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.STRING
        }
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        }));
        return JSON.parse(response.text);
    } catch (error: any) {
        console.error("Error generating contextual actions:", error);
        // Fallback actions
        return ["Dò xét xung quanh", "Thiền định tại chỗ", "Kiểm tra trang bị"];
    }
};


export const processPlayerAction = async (character: Character, terrain: TerrainType, action: string, difficulty: Difficulty): Promise<string> => {
    const prompt = `Bạn là một người quản trò (Game Master) cho một game RPG tiên hiệp. Người chơi đang điều khiển nhân vật của họ và muốn thực hiện một hành động. Dựa vào bối cảnh, hãy mô tả kết quả của hành động đó một cách hợp lý và thú vị.

**Bối cảnh:**
- **Nhân vật:** "${character.name}", một ${character.playerClass} cấp ${character.level}, đang ở cảnh giới ${character.realm.name}.
- **Địa điểm:** Một khu vực có địa hình là "${terrain}".
- **Độ khó thế giới:** ${difficulty}. Kết quả nên phản ánh độ khó này. Độ khó cao có thể dẫn đến kết quả tệ hơn hoặc phần thưởng lớn hơn.
- **Hành động của người chơi:** "${action}"

**Yêu cầu:**
1. Phân tích hành động của người chơi trong bối cảnh đã cho.
2. Viết một đoạn văn ngắn (2-4 câu) mô tả kết quả. Kết quả có thể là:
    - Tìm thấy một vật phẩm nhỏ (nếu hợp lý).
    - Không tìm thấy gì đặc biệt.
    - Gặp một tình huống, có thể là cơ hội hoặc nguy hiểm. Nếu là nguy hiểm, hãy dùng các từ khóa như "kẻ địch", "quái vật", "chạm trán", "sát khí".
3. Giọng văn phải phù hợp với thể loại tiên hiệp.

**Ví dụ:**
- **Hành động:** "Tìm kiếm thảo dược quý hiếm"
- **Kết quả (thành công):** "Với kinh nghiệm của mình, ${character.name} cẩn thận dò xét từng bụi cây ngọn cỏ. Sau một hồi, bạn tìm thấy một cây Linh Chi Thảo nhỏ, tỏa ra linh khí nhẹ."
- **Kết quả (thất bại):** "Bạn bỏ ra cả buổi để tìm kiếm nhưng khu vực này dường như đã bị người khác thu hoạch hết, không còn lại gì giá trị."
- **Kết quả (nguy hiểm):** "Khi bạn đang chăm chú tìm kiếm, một luồng sát khí lạnh lẽo đột nhiên ập tới. Một con Yêu Lang với đôi mắt đỏ ngầu đang rình rập bạn từ trong bụi rậm!"

Bây giờ, hãy tạo kết quả cho hành động của người chơi.
`;
    
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        return response.text;
    } catch (error: any) {
        console.error("Error processing player action:", error);
        return `Hành động của bạn không gây ra kết quả gì đặc biệt. (Lỗi AI: ${error.message})`;
    }
};


export const generateUpgradeResult = async (item: Item, newItemLevel: number): Promise<UpgradeAIResult> => {
    const prompt = `You are an expert game designer for an epic fantasy RPG. An item has been successfully upgraded. Your task is to determine the new stats and provide a flavorful success message.

**Item Information:**
- Name: "${item.name}"
- Type: ${item.type}
- Rarity: ${item.rarity}
- Current Upgrade Level: ${item.upgradeLevel}
- New Upgrade Level: ${newItemLevel}
- Current Base Stats: ${JSON.stringify(item.baseStats)}
- Current Bonus Stats: ${JSON.stringify(item.bonusStats)}

**Instructions:**
- Calculate a new 'newBaseStatValue'. The increase should be rewarding, between 10-25% of the current value. Rarer items and higher levels get better boosts.
- Decide if a bonus stat is added or improved (more likely for rarer items or milestones like +5, +10). If so, populate 'bonusStatChange', otherwise set it to null.
- Write a short, exciting Vietnamese 'successMessage'.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            newBaseStatValue: { type: Type.NUMBER, description: "Giá trị mới của chỉ số cơ bản." },
            bonusStatChange: {
                type: Type.OBJECT,
                nullable: true,
                description: "Sự thay đổi của chỉ số phụ. Null nếu không có gì thay đổi.",
                properties: {
                    statKey: { type: Type.STRING, description: "Khóa của chỉ số phụ (vd: 'crit_rate')." },
                    statName: { type: Type.STRING, description: "Tên tiếng Việt của chỉ số phụ (vd: 'Tỉ lệ chí mạng')." },
                    increase: { type: Type.NUMBER, description: "Lượng tăng thêm." },
                    isNew: { type: Type.BOOLEAN, description: "True nếu đây là chỉ số mới." }
                }
            },
            successMessage: { type: Type.STRING, description: "Thông báo thành công bằng tiếng Việt." }
        },
        required: ["newBaseStatValue", "successMessage"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating upgrade result:", error);
        const baseStatKey = Object.keys(item.baseStats)[0];
        const currentBaseStat = baseStatKey ? item.baseStats[baseStatKey] : 10;
        const fallbackResult: UpgradeAIResult = {
            newBaseStatValue: Math.floor(currentBaseStat * 1.15),
            bonusStatChange: null,
            successMessage: "Cường Hóa Thành Công!",
        };
        return fallbackResult;
    }
};

export const generateImage = async (prompt: string, isScenery: boolean = false): Promise<{ imageUrl?: string, error?: string }> => {
    const finalPrompt = `cinematic, fantasy art, highly detailed, sharp focus, ${prompt}`;
    try {
        const aiClient = getAiClient();
        const response: GenerateImagesResponse = await callGeminiWithRetry(() => aiClient.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: finalPrompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: isScenery ? "16:9" : "1:1",
            }
        }));
        
        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
        }
        return { error: "Không thể tạo ảnh từ AI." };
    } catch (error: any) {
        console.error("Error generating image:", error);
        const errorMessage = (error.message || '').toLowerCase();
        if (errorMessage.includes('billed user') || errorMessage.includes('billing')) {
            return { error: `Lỗi tạo ảnh: API tạo ảnh (Imagen) chỉ dành cho các tài khoản Google Gemini đã kích hoạt thanh toán. Vui lòng kiểm tra tài khoản của bạn.` };
        }
        return { error: `Lỗi tạo ảnh: ${error.message}` };
    }
};

export const generateAIDescriptionForImage = async (imageUrl: string): Promise<{ description?: string, error?: string }> => {
    const imagePartData = await urlToGoogleGenerativeAIPart(imageUrl);
    if (imagePartData.error) {
        return { error: imagePartData.error };
    }
    const textPart = { text: "Mô tả ngắn gọn (5-10 từ) về nhân vật hoặc cảnh vật trong ảnh này, theo phong cách tiên hiệp. Ví dụ: 'một nữ tu mặc áo trắng đứng trên đỉnh núi tuyết'." };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePartData.part, textPart] }
        }));
        return { description: response.text };
    } catch (error: any) {
        console.error("Error generating AI description:", error);
        return { error: `Lỗi tạo mô tả: ${error.message}` };
    }
};

export const generateAITagsForImage = async (imageUrl: string, description: string): Promise<{ tags?: string[], error?: string }> => {
    const imagePartData = await urlToGoogleGenerativeAIPart(imageUrl);
    if (imagePartData.error) {
        return { error: imagePartData.error };
    }
    const prompt = `Dựa vào ảnh và mô tả "${description}", hãy tạo 3-5 thẻ (tags) bằng tiếng Việt không dấu, viết thường, phân cách bởi dấu ';'. Ví dụ: 'nu tu; ao trang; nui tuyet'`;
    const textPart = { text: prompt };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [imagePartData.part, textPart] }
        }));
        const tags = response.text.split(';').map(t => t.trim()).filter(Boolean);
        return { tags };
    } catch (error: any) {
        console.error("Error generating AI tags:", error);
        return { error: `Lỗi tạo thẻ: ${error.message}` };
    }
};


export const generateQuickPlaySettings = async (): Promise<{
    name: string;
    playerClass: string;
    classDefinition?: BaseStats;
    characterContext: string;
    worldPrompt: string;
    worldKeywords: string;
    difficulty: Difficulty;
}> => {
    const prompt = `Tạo một bộ thiết lập ngẫu nhiên để chơi nhanh game RPG tiên hiệp. Bao gồm:
- Tên nhân vật (name)
- Tên lớp nhân vật (playerClass)
- Bối cảnh nhân vật (characterContext, 2-3 câu)
- Bối cảnh thế giới (worldPrompt, 2-3 câu)
- Từ khóa thế giới (worldKeywords, 3-4 từ)
- Độ khó (difficulty, chọn từ Dễ, Thường, Khó, Địa Ngục)
Chỉ trả về JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            playerClass: { type: Type.STRING },
            characterContext: { type: Type.STRING },
            worldPrompt: { type: Type.STRING },
            worldKeywords: { type: Type.STRING },
            difficulty: { type: Type.STRING, enum: Object.values(Difficulty) }
        },
        required: ["name", "playerClass", "characterContext", "worldPrompt", "worldKeywords", "difficulty"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating quick play settings:", error);
        throw error;
    }
};

export const generateMonsterName = async (imageDescription: string, level: number): Promise<string> => {
    const prompt = `Dựa vào mô tả hình ảnh: "${imageDescription}", và cấp độ ${level}, hãy tạo một cái tên yêu thú tiên hiệp thật "kêu" (2-4 từ). Chỉ trả về tên, không thêm gì khác.`;
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        return response.text.trim();
    } catch (error) {
        console.error("Error generating monster name:", error);
        return `Yêu Thú cấp ${level}`;
    }
};

export const generatePoiDetails = async (type: string, region: string, factions: Faction[]): Promise<{ name: string, description: string, imagePrompt: string, factionName: string | null }> => {
    const prompt = `Trong một thế giới tiên hiệp, hãy tạo chi tiết cho một Địa Điểm Đặc Biệt (POI).
- Loại: ${type}
- Vùng: ${region}
- Các phe phái trong thế giới: ${factions.map(f => f.name).join(', ')}

Hãy tạo ra:
1.  **name:** Một cái tên tiên hiệp phù hợp.
2.  **description:** Một mô tả ngắn gọn (2-3 câu).
3.  **imagePrompt:** Một chuỗi mô tả để AI tạo ảnh (VD: "a grand ancient library carved into a mountain").
4.  **factionName:** Tên của một phe phái liên quan từ danh sách trên, hoặc null nếu không có.

Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
            factionName: { type: Type.STRING, nullable: true }
        },
        required: ["name", "description", "imagePrompt", "factionName"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating POI details:", error);
        throw error;
    }
};

export const generateNpcDetails = async (poi: Poi, faction: Faction | undefined, worldState: WorldState): Promise<{ name: string, role: string }> => {
    // Check if a notable NPC is already assigned to this faction
    if (faction) {
        const notableNpc = worldState.notableNpcs.find(npc => npc.factionId === faction.id);
        if (notableNpc) {
            return { name: notableNpc.name, role: notableNpc.role };
        }
    }

    const prompt = `Tạo một NPC cho địa điểm "${poi.name}" (${poi.type}) ${faction ? `thuộc phe ${faction.name}` : ''}.
Hãy tạo:
1.  **name:** Tên NPC.
2.  **role:** Chức vụ/vai trò của họ (VD: "Trưởng lão", "Đệ tử gác cổng", "Chủ tiệm").
Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            role: { type: Type.STRING }
        },
        required: ["name", "role"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating NPC details:", error);
        throw error;
    }
};

export const continueDialogue = async (character: Character, dialogueState: DialogueState, worldState: WorldState, difficulty: Difficulty, activeQuest?: Quest): Promise<DialogueAIResponse> => {
    const playerSect = character.sectId ? worldState.factions.find(f => f.id === character.sectId) : null;

    const prompt = `Bạn là một NPC trong game RPG tiên hiệp. Hãy phản hồi lại người chơi một cách hợp vai và sâu sắc.

**Bối cảnh Thế giới:**
- Tên: ${worldState.name}
- Mô tả: ${worldState.description}

**Thông tin về bạn (NPC):**
- Tên: ${dialogueState.npcName} (${dialogueState.npcRole})
- Phe phái: ${dialogueState.factionName || 'Không có'}
- Mối quan hệ với người chơi (Affinity): ${dialogueState.affinity} (càng cao càng thân thiện, dưới 0 là ghét bỏ)

**Thông tin về người chơi:**
- Tên: ${character.name}, Cấp ${character.level}
- Bối cảnh: ${character.backstory || 'Không có'}
- Phe phái: ${playerSect ? playerSect.name : 'Chưa gia nhập'}
- Danh vọng với phe của bạn: ${dialogueState.factionId ? (character.reputation[dialogueState.factionId] || 0) : 'Không có'}

**Lịch sử hội thoại (lượt cuối là của người chơi):**
${dialogueState.history.map(t => `${t.speaker === 'player' ? character.name : dialogueState.npcName}: ${t.text}`).join('\n')}

**Nhiệm vụ người chơi đang làm cho bạn (nếu có):**
${activeQuest ? `"${activeQuest.title}" (Trạng thái: ${activeQuest.status})` : 'Không có'}

**Yêu cầu:**
1.  **responseText:** Viết một câu trả lời hợp vai, có tính cách. Cân nhắc tất cả thông tin bối cảnh để tạo ra phản hồi độc đáo. Ví dụ, nếu người chơi thuộc phe đối địch, hãy tỏ ra cảnh giác. Nếu họ có danh vọng cao, hãy tỏ ra tôn trọng.
2.  **affinityChange:** Quyết định thay đổi Affinity (từ -10 đến 10), dựa trên lời nói của người chơi.
3.  **giveQuest:** Quyết định có giao nhiệm vụ không (true/false). Chỉ giao khi hợp lý và người chơi chưa có nhiệm vụ nào từ bạn.
4.  **options:** Đề xuất 2-3 câu trả lời ngắn gọn, đa dạng (ví dụ: một câu đồng ý, một câu hỏi thêm, một câu từ chối/mỉa mai) để người chơi có thể chọn.

Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            responseText: { type: Type.STRING },
            affinityChange: { type: Type.NUMBER },
            giveQuest: { type: Type.BOOLEAN },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
        },
        required: ["responseText", "affinityChange", "giveQuest"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error continuing dialogue:", error);
        throw error;
    }
};

export const continueTransientDialogue = async (character: Character, dialogueState: DialogueState, difficulty: Difficulty): Promise<DialogueAIResponse> => {
    const prompt = `Bạn là một NPC ngẫu nhiên trong game RPG tiên hiệp. Hãy phản hồi lại người chơi.

**Thông tin về bạn (NPC):**
- Tên: ${dialogueState.npcName} (${dialogueState.npcRole})
- Tính cách: Hãy tự tạo một tính cách ngẫu nhiên (ví dụ: vội vã, tò mò, cộc cằn, thân thiện).

**Thông tin về người chơi:**
- Tên: ${character.name}, Cấp ${character.level}
- Bối cảnh: ${character.backstory || 'Không có'}

**Lịch sử hội thoại (lượt cuối là của người chơi):**
${dialogueState.history.map(t => `${t.speaker === 'player' ? character.name : dialogueState.npcName}: ${t.text}`).join('\n')}

**Yêu cầu:**
1.  **responseText:** Dựa vào tính cách bạn tự tạo, viết một câu trả lời ngắn gọn, hợp vai.
2.  **affinityChange:** Quyết định thay đổi Affinity (từ -5 đến 5).
3.  **options:** Đề xuất 2-3 câu trả lời ngắn gọn, đa dạng mà người chơi có thể chọn.

Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            responseText: { type: Type.STRING },
            affinityChange: { type: Type.NUMBER },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, nullable: true }
        },
        required: ["responseText"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error continuing transient dialogue:", error);
        throw error;
    }
};


export const generateQuestDetails = async (character: Character, poi: Poi, difficulty: Difficulty, worldState: WorldState): Promise<Omit<Quest, 'id' | 'status' | 'giverPoiId' | 'target' | 'rewards'> & { targetName: string, targetCount: number, rewardExp: number, reputationChange?: { factionName: string, amount: number }[] }> => {
    const prompt = `Tạo một nhiệm vụ cho người chơi ${character.name} (Cấp ${character.level}) tại ${poi.name}.
- Loại nhiệm vụ (type): HUNT hoặc GATHER.
- Tên nhiệm vụ (title).
- Mô tả (description).
- Tên mục tiêu (targetName), ví dụ: "Yêu Lang", "Linh Thảo".
- Số lượng mục tiêu (targetCount), dựa vào độ khó ${difficulty}.
- Lượng EXP thưởng (rewardExp), dựa vào độ khó ${difficulty}.
Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: [QuestType.HUNT, QuestType.GATHER] },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            targetName: { type: Type.STRING },
            targetCount: { type: Type.NUMBER },
            rewardExp: { type: Type.NUMBER }
        },
        required: ["type", "title", "description", "targetName", "targetCount", "rewardExp"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        const data = JSON.parse(response.text);
        const faction = worldState.factions.find(f => f.id === poi.factionId);
        if (faction) {
            data.reputationChange = [{ factionName: faction.name, amount: 10 }];
        }
        return data;
    } catch (error) {
        console.error("Error generating quest details:", error);
        throw error;
    }
};

export const generateQuestCompletionText = async (character: Character, quest: Quest): Promise<string> => {
    const prompt = `Người chơi ${character.name} vừa hoàn thành mục tiêu của nhiệm vụ "${quest.title}". Viết một đoạn văn ngắn (1-2 câu) mô tả cảm xúc hoặc suy nghĩ của nhân vật khi hoàn thành.`;
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        return response.text;
    } catch (error) {
        return "Bạn đã hoàn thành mục tiêu. Hãy quay lại báo cáo.";
    }
};

export const generateSoulEffect = async (item: Item, character: Character): Promise<SoulEffect> => {
    const prompt = `Tạo một hiệu ứng linh hồn (Soul Effect) cho vật phẩm "${item.name}" (${item.type}) trong game tiên hiệp.
Hiệu ứng cần có:
1.  **name**: Tên hiệu ứng (VD: "Linh Hồn Bão Tố").
2.  **description**: Mô tả ngắn gọn.
3.  **bonus**: Một chỉ số cộng thêm. Chọn stat từ danh sách: ${Object.values(Stat).join(', ')}.
Chỉ trả về JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            bonus: {
                type: Type.OBJECT,
                properties: {
                    stat: { type: Type.STRING, enum: Object.values(Stat) },
                    value: { type: Type.NUMBER },
                    isPercent: { type: Type.BOOLEAN }
                },
                required: ["stat", "value", "isPercent"]
            }
        },
        required: ["name", "description", "bonus"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating soul effect:", error);
        throw error;
    }
};

// ... existing code ...

export const generateSkill = async (
    characterClass: string,
    characterLevel: number,
    characterRealm: string,
    skillType: SkillType,
    isRealmSkill: boolean,
    difficulty: Difficulty
): Promise<Skill> => {
    const prompt = `You are a creative RPG skill designer. Create a new, unique, and thematically appropriate skill for a character in a cultivation-themed RPG.

**Character Context:**
-   **Class:** ${characterClass}
-   **Level:** ${characterLevel}
-   **Realm:** ${characterRealm}
-   **Skill Type Requested:** ${skillType}
-   **Is this a special realm breakthrough skill?** ${isRealmSkill ? "Yes, this skill should be powerful and reflect a major breakthrough." : "No, this is a standard skill learned through practice."}
-   **Game Difficulty:** ${difficulty} (Skills can be slightly more powerful on higher difficulties).

**Instructions:**
1.  **Invent a skill:** Create a unique skill name and description.
2.  **Define effects:** Create 1 to 2 balanced effects for this skill.
3.  **Effect properties:**
    *   \`type\`: Must be one of: ${Object.values(SkillEffectType).join(', ')}.
    *   \`target\`: Must be one of: ${Object.values(TargetType).join(', ')}.
    *   \`powerMultiplier\`: For DAMAGE/HEAL/DOT/HOT, a number (e.g., 1.5 for 150%).
    *   \`duration\`: For effects over time, the number of turns.
    *   \`chance\`: For probabilistic effects, a number from 0 to 100.
    *   \`description\`: A short text explaining what the effect does in Vietnamese.
4.  **Balance:** The skill's power and MP cost should be appropriate for the character's level and realm.
5.  **Return ONLY a valid JSON object.**
`;

    const skillEffectSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: Object.values(SkillEffectType) },
            target: { type: Type.STRING, enum: Object.values(TargetType) },
            stat: { type: Type.STRING, enum: Object.values(Stat), nullable: true },
            powerMultiplier: { type: Type.NUMBER, nullable: true },
            value: { type: Type.NUMBER, nullable: true },
            isPercent: { type: Type.BOOLEAN, nullable: true },
            duration: { type: Type.NUMBER, nullable: true },
            description: { type: Type.STRING },
            chance: { type: Type.NUMBER, nullable: true }
        },
        required: ["type", "target", "description"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            mpCost: { type: Type.NUMBER, nullable: true },
            effects: { type: Type.ARRAY, items: skillEffectSchema }
        },
        required: ["name", "description", "effects"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        }));
        const generatedSkill = JSON.parse(response.text);

        return {
            ...generatedSkill,
            id: crypto.randomUUID(),
            type: skillType,
            levelRequired: characterLevel,
            realmRequired: isRealmSkill ? characterRealm : undefined,
            class: characterClass
        };

    } catch (error) {
        console.error("Error generating skill:", error);
        throw error;
    }
};


export const generateCultivationTechniqueDetails = async (character: Character): Promise<Omit<CultivationTechnique, 'id' | 'level'> & { level: number }> => {
    const prompt = `Bạn là một đại sư sáng tạo công pháp. Hãy tạo một bộ Công Pháp (Cultivation Technique) độc nhất vô nhị cho nhân vật game tiên hiệp.
-   **Nhân vật:** ${character.name}, Cấp ${character.level}, Cảnh giới ${character.realm.name}, Class ${character.playerClass}
-   **Yêu cầu:** Tạo ra một công pháp độc đáo, phù hợp với bối cảnh nhân vật. Công pháp này nên có hiệu ứng đặc biệt hoặc tương hỗ mạnh mẽ với lớp nhân vật của họ, không chỉ là cộng chỉ số đơn thuần.
    1.  **name:** Tên công pháp (VD: "Thái Cổ Long Thần Quyết").
    2.  **description:** Mô tả ngắn (2-3 câu).
    3.  **type:** Loại công pháp, chọn từ: ${Object.values(CultivationTechniqueType).join(', ')}.
    4.  **maxLevel:** Cấp tối đa (từ 5 đến 9).
    5.  **bonusesPerLevel:** Các chỉ số tăng thêm MỖI KHI LÊN CẤP.
    6.  **bonuses:** Các chỉ số ở CẤP 1.
-   **Lưu ý:** \`bonuses\` phải giống hệt \`bonusesPerLevel\` cho cấp 1.
Chỉ trả về JSON.`;

    const bonusSchema = {
        type: Type.OBJECT,
        properties: {
            stat: { type: Type.STRING, enum: Object.values(Stat) },
            value: { type: Type.NUMBER },
            isPercent: { type: Type.BOOLEAN }
        },
        required: ["stat", "value", "isPercent"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(CultivationTechniqueType) },
            maxLevel: { type: Type.NUMBER },
            bonusesPerLevel: { type: Type.ARRAY, items: bonusSchema },
            bonuses: { type: Type.ARRAY, items: bonusSchema }
        },
        required: ["name", "description", "type", "maxLevel", "bonusesPerLevel", "bonuses"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return { ...JSON.parse(response.text), level: 1 };
    } catch (error) {
        console.error("Error generating cultivation technique:", error);
        // Fallback
        return {
            name: "Luyện Khí Quyết",
            description: "Công pháp cơ bản nhất để dẫn khí vào cơ thể.",
            type: CultivationTechniqueType.TAM_PHAP,
            maxLevel: 5,
            level: 1,
            bonuses: [{ stat: Stat.HP, value: 10, isPercent: false }],
            bonusesPerLevel: [{ stat: Stat.HP, value: 10, isPercent: false }]
        };
    }
};

export const generateSkillForSkillBook = async (character: Character): Promise<Omit<Skill, 'id' | 'class'>> => {
     const prompt = `Bạn là một nhà thiết kế game RPG bậc thầy. Hãy tạo một Kỹ Năng (Skill) hiếm và mạnh mẽ cho nhân vật học từ một cuốn sách cổ.
-   **Nhân vật:** ${character.name}, Cấp ${character.level}, Cảnh giới ${character.realm.name}, Class ${character.playerClass}
-   **Yêu cầu:** Tạo ra một kỹ năng độc đáo, phù hợp với bối cảnh nhân vật, mang lại một lợi thế đáng kể. Kỹ năng này nên phản ánh rõ nét lớp nhân vật và có thể là Chủ động (ACTIVE) hoặc Bị động (PASSIVE).
Chỉ trả về JSON.`;

     const skillEffectSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: Object.values(SkillEffectType) },
            target: { type: Type.STRING, enum: Object.values(TargetType) },
            stat: { type: Type.STRING, enum: Object.values(Stat), nullable: true },
            powerMultiplier: { type: Type.NUMBER, nullable: true },
            value: { type: Type.NUMBER, nullable: true },
            isPercent: { type: Type.BOOLEAN, nullable: true },
            duration: { type: Type.NUMBER, nullable: true },
            description: { type: Type.STRING },
            chance: { type: Type.NUMBER, nullable: true }
        },
        required: ["type", "target", "description"]
    };

    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(SkillType) },
            levelRequired: { type: Type.NUMBER },
            mpCost: { type: Type.NUMBER, nullable: true },
            effects: { type: Type.ARRAY, items: skillEffectSchema }
        },
        required: ["name", "description", "type", "levelRequired", "effects"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating skill for book:", error);
        throw error;
    }
};

export const generateSectJoiningQuest = async (character: Character, faction: Faction, worldState: WorldState): Promise<Omit<Quest, 'id'|'status'|'giverPoiId'|'rewards'> & { targetName: string, targetCount: number }> => {
    const prompt = `Tạo một nhiệm vụ khảo hạch để người chơi ${character.name} (Cấp ${character.level}) gia nhập vào ${faction.name}.
- **Yêu cầu:** Tạo một nhiệm vụ phù hợp với tính chất của phe phái (${faction.type}, ${faction.description}).
    - **title:** Tên nhiệm vụ.
    - **description:** Mô tả nhiệm vụ.
    - **targetName:** Tên mục tiêu (VD: "Huyết Lang", "Ma Tu", "Linh Thảo").
    - **targetCount:** Số lượng (từ 3-10).
Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: [QuestType.HUNT, QuestType.GATHER] },
            targetName: { type: Type.STRING },
            targetCount: { type: Type.NUMBER },
        },
        required: ["title", "description", "type", "targetName", "targetCount"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        const questData = JSON.parse(response.text);
        return {
            ...questData,
            target: { targetName: questData.targetName, count: questData.targetCount, current: 0 }
        };
    } catch (error) {
        console.error("Error generating sect joining quest:", error);
        throw error;
    }
};

// ... More service functions ...

export const generateSectMission = async (character: Character, faction: Faction): Promise<Omit<Quest, 'id'|'status'|'giverPoiId'>> => {
    const prompt = `Tạo một nhiệm vụ tông môn ngẫu nhiên cho ${character.name} (Cấp ${character.level}, đang là ${character.sectRank} của ${faction.name}).
- **Yêu cầu:** Nhiệm vụ phải phù hợp với phe phái.
- Trả về JSON theo schema.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: [QuestType.HUNT, QuestType.GATHER] },
            target: { type: Type.OBJECT, properties: { targetName: {type: Type.STRING}, count: {type: Type.NUMBER}, current: {type: Type.NUMBER} } },
            rewards: { type: Type.OBJECT, properties: { exp: {type: Type.NUMBER}, contributionPoints: {type: Type.NUMBER} } }
        },
        required: ["title", "description", "type", "target", "rewards"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating sect mission:", error);
        throw error;
    }
};


export const evaluateItemContribution = async (item: Item, faction: Faction): Promise<{points: number}> => {
     const prompt = `Người chơi cống hiến vật phẩm "${item.name}" (Độ hiếm: ${item.rarity}, Cấp: ${item.level}) cho phe ${faction.name}.
Dựa vào độ hiếm, cấp độ và tính phù hợp, hãy quyết định xem vật phẩm này đáng giá bao nhiêu điểm cống hiến (từ 1 đến 100).
Chỉ trả về một số.`;
     try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        }));
        const points = parseInt(response.text.replace(/\D/g, ''), 10);
        return { points: isNaN(points) ? 5 : points };
    } catch (error) {
        console.error("Error evaluating item contribution:", error);
        return { points: 5 };
    }
};

export const generateAllSectStoreStocks = async (joinableFactions: Faction[]): Promise<{factionName: string, storeItems: SectStoreItem[]}[]> => {
    const prompt = `You are an expert RPG game designer. For each of the following cultivation sects, generate a thematic list of 5 store items available for purchase with contribution points.

**Sects:**
${joinableFactions.map(f => `- ${f.name}: ${f.description}`).join('\n')}

**Instructions:**
- For each sect, create a list of 5 items.
- Items must be thematically appropriate for the sect.
- A "Thiên Kiếm Tông" (Heavenly Sword Sect) should sell swords and manuals about swordplay.
- A "Vạn Pháp Các" (Myriad Dharma Pavilion) should sell magical items and spellbooks.
- Generate a balanced cost in contribution points (between 50 and 1000).
- Return a JSON array. Each object in the array should contain 'factionName' and a 'storeItems' array.
`;

    const allStoresSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                factionName: { type: Type.STRING },
                storeItems: { type: Type.ARRAY, items: storeItemSchema }
            },
            required: ["factionName", "storeItems"]
        }
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: allStoresSchema
            }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating all sect store stocks:", error);
        throw error;
    }
};


export const generateCombatTactic = async (participants: Combatant[], currentTurnActor: Combatant): Promise<AITactic> => {
     const prompt = `You are a strategic combat AI for an RPG. Analyze the current combat situation and decide the best action.
**Participants:**
${participants.map(p => `- ${p.name} (ID: ${p.id}, HP: ${p.currentHp}/${p.derivedStats.HP}, Is Player Side: ${'playerClass' in p || 'monsterClass' in p})`).join('\n')}

**Your Turn:** ${currentTurnActor.name} (ID: ${currentTurnActor.id})
**Your Skills:**
${currentTurnActor.skills.map(s => `- ID: ${s.id}, Name: ${s.name}, MP Cost: ${s.mpCost || 0}, Description: ${s.description}`).join('\n')}

**Task:** Choose an action ('ATTACK' or 'SKILL'), a target ID, and provide a short rationale.
- Prioritize low HP enemies.
- Use skills if they provide an advantage (e.g., stunning a strong enemy, healing a weak ally).
- If you are a pet, do not target the player.
- If you are an enemy, prioritize targeting the player or their active pet.

Return only a valid JSON object.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            action: { type: Type.STRING, enum: ['ATTACK', 'SKILL'] },
            skillId: { type: Type.STRING, nullable: true },
            targetId: { type: Type.STRING },
            rationale: { type: Type.STRING }
        },
        required: ["action", "targetId", "rationale"]
    };
     try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating combat tactic:", error);
        const enemyTargets = participants.filter(p => 'playerClass' in p);
        const target = enemyTargets[Math.floor(Math.random() * enemyTargets.length)];
        return { action: 'ATTACK', targetId: target.id, rationale: "AI fallback: Basic attack on a random player-side target." };
    }
};

export const generateCombatNarration = async (attacker: Combatant, defender: Combatant, result: any, skill?: Skill): Promise<string> => {
    const prompt = `Bạn là một người dẫn truyện tài hoa, hãy viết một đoạn tường thuật ngắn (1-2 câu) cho hành động chiến đấu sau:
- **Người Tấn Công:** ${attacker.name}
- **Mục Tiêu:** ${defender.name}
- **Hành Động:** ${skill ? `Dùng chiêu [${skill.name}]` : 'Tấn công thường'}
- **Kết Quả:** ${result.crit ? 'Chí mạng, ' : ''}Gây ${result.damage} sát thương.

Tả lại hành động một cách sống động.`;
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        return response.text;
    } catch (error) {
        return `${attacker.name} tấn công ${defender.name}, gây ${result.damage} sát thương.`;
    }
};

export const generateDungeonDetails = async (character: Character, theme: string): Promise<Omit<DungeonState, 'id' | 'currentFloorIndex' | 'isCleared'>> => {
    const prompt = `Tạo một Bí Cảnh (Dungeon) cho người chơi ${character.name} (Cấp ${character.level}).
-   **Chủ đề:** ${theme}
-   **Yêu cầu:** Tạo ra một dungeon có 5 tầng, với các loại phòng ngẫu nhiên (COMBAT, ELITE_COMBAT, TREASURE, EMPTY, BOSS). Tầng cuối cùng PHẢI là BOSS.
    -   **name:** Tên của Bí Cảnh.
    -   **description:** Mô tả ngắn về Bí Cảnh.
    -   **level:** Cấp độ của Bí Cảnh (gần bằng cấp người chơi).
    -   **floors:** Một mảng gồm 5 tầng, mỗi tầng có 'type' và 'description'.
Chỉ trả về JSON.`;
    const floorSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: Object.values(DungeonFloorType) },
            description: { type: Type.STRING },
            isCompleted: { type: Type.BOOLEAN },
        },
        required: ["type", "description", "isCompleted"]
    };
    const schema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            theme: { type: Type.STRING },
            level: { type: Type.NUMBER },
            floors: { type: Type.ARRAY, items: floorSchema, minItems: 5, maxItems: 5 }
        },
        required: ["name", "description", "theme", "level", "floors"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating dungeon details:", error);
        throw error;
    }
};

export const generatePetEvolutionDetails = async (pet: Pet): Promise<{ newName: string, newImagePrompt: string, statBoosts: Partial<BaseStats>, newPassiveSkill: Omit<Skill, 'id' | 'class'> }> => {
    const prompt = `Thú cưng "${pet.name}" (${pet.monsterClass}) đã đạt đủ điều kiện để tiến hóa. Hãy tạo ra các chi tiết cho hình thái tiến hóa của nó.
-   **Yêu cầu:**
    1.  **newName:** Một cái tên mới, ngầu hơn.
    2.  **newImagePrompt:** Một mô tả để AI tạo ảnh cho hình thái mới.
    3.  **statBoosts:** Một lượng nhỏ chỉ số gốc được cộng thêm (tổng cộng khoảng 10-20 điểm).
    4.  **newPassiveSkill:** Một kỹ năng bị động (PASSIVE) mới mà nó học được.
Chỉ trả về JSON.`;
    const skillEffectSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: Object.values(SkillEffectType) },
            target: { type: Type.STRING, enum: Object.values(TargetType) },
            stat: { type: Type.STRING, enum: Object.values(Stat), nullable: true },
            powerMultiplier: { type: Type.NUMBER, nullable: true },
            value: { type: Type.NUMBER, nullable: true },
            isPercent: { type: Type.BOOLEAN, nullable: true },
            duration: { type: Type.NUMBER, nullable: true },
            description: { type: Type.STRING },
            chance: { type: Type.NUMBER, nullable: true }
        },
        required: ["type", "target", "description"]
    };
    const schema = {
        type: Type.OBJECT,
        properties: {
            newName: { type: Type.STRING },
            newImagePrompt: { type: Type.STRING },
            statBoosts: { type: Type.OBJECT, properties: { STR: { type: Type.NUMBER, nullable: true }, AGI: { type: Type.NUMBER, nullable: true }, INT: { type: Type.NUMBER, nullable: true }, SPI: { type: Type.NUMBER, nullable: true }, CON: { type: Type.NUMBER, nullable: true }, DEX: { type: Type.NUMBER, nullable: true } } },
            newPassiveSkill: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: [SkillType.PASSIVE] },
                    levelRequired: { type: Type.NUMBER },
                    effects: { type: Type.ARRAY, items: skillEffectSchema }
                },
                required: ["name", "description", "type", "levelRequired", "effects"]
            }
        },
        required: ["newName", "newImagePrompt", "statBoosts", "newPassiveSkill"]
    };
     try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating pet evolution:", error);
        throw error;
    }
};

export const generateLoyaltyDescription = async (petName: string, loyalty: number, petClass: string): Promise<{ description: string, oneWordStatus: string }> => {
    const prompt = `Thú cưng "${petName}" (${petClass}) có độ trung thành là ${loyalty}/100.
Hãy tạo:
1.  **description:** Một mô tả ngắn (1-2 câu) về hành vi của nó đối với chủ nhân.
2.  **oneWordStatus:** Một từ mô tả trạng thái (VD: "Trung thành", "Cảnh giác", "Sợ hãi").
Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            oneWordStatus: { type: Type.STRING }
        },
        required: ["description", "oneWordStatus"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        return { description: "Nó nhìn bạn với ánh mắt khó hiểu.", oneWordStatus: "Bình thường" };
    }
};


export const generateForgeResult = async (character: Character, options: ForgeOptions): Promise<{ forgedItem: Omit<Item, 'id' | 'history' | 'evolved'>, forgeExp: number, charExp: number }> => {
    const prompt = `Tạo kết quả cho việc rèn đồ trong game tiên hiệp.
- **Nhân vật:** Cấp ${character.level}, Lò Rèn cấp ${character.forgingProficiency.level}.
- **Phương pháp:** ${options.method === 'mp' ? `Dùng ${options.mpUsed} MP` : `Dùng vật phẩm phụ trợ`}.
- **Loại vật phẩm:** ${options.itemType || 'Ngẫu nhiên'}.
- **Yêu cầu:** Tạo ra một vật phẩm (forgedItem), lượng kinh nghiệm rèn (forgeExp, 10-50), và kinh nghiệm nhân vật (charExp, 5-20).
Chỉ trả về JSON.`;
    const schema = {
        type: Type.OBJECT,
        properties: {
            forgedItem: itemSchemaForStore,
            forgeExp: { type: Type.NUMBER },
            charExp: { type: Type.NUMBER }
        },
        required: ["forgedItem", "forgeExp", "charExp"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating forge result:", error);
        throw error;
    }
};

export const generateBackstory = async (name: string, playerClass: string, context: string): Promise<string> => {
    const prompt = `Tạo một đoạn bối cảnh ngắn (3-4 câu) cho nhân vật tên "${name}", lớp nhân vật "${playerClass}" trong một thế giới tiên hiệp.
    Bối cảnh cung cấp: ${context}
    
    Chỉ trả về đoạn văn bối cảnh, không thêm lời dẫn.`;
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        }));
        return response.text.trim();
    } catch (error) {
        console.error("Error generating backstory:", error);
        return `Một người tu hành bình thường với quá khứ bí ẩn.`;
    }
};

export const generateDynamicEntities = async (
    worldInfo: { name: string, description: string, factions: Faction[] },
    storyInfo?: { title: string, author: string }
): Promise<{ npcs: (Omit<NpcTemplate, 'factionId'> & { factionName: string | null })[] }> => {
    const prompt = `Dựa trên bối cảnh thế giới và thông tin truyện (nếu có), hãy tạo ra 5-7 NPC nổi bật (notable NPCs).
    **Thế giới:** ${worldInfo.name} - ${worldInfo.description}
    **Các phe phái:** ${worldInfo.factions.map(f => f.name).join(', ')}
    ${storyInfo ? `**Dựa trên truyện:** "${storyInfo.title}" của ${storyInfo.author}` : ''}
    
    Với mỗi NPC, cung cấp:
    - name: Tên
    - role: Vai trò (ví dụ: "Trưởng lão tông môn", "Tán tu bí ẩn", "Yêu vương")
    - backstory: Bối cảnh ngắn gọn
    - factionName: Tên phe phái họ thuộc về (phải có trong danh sách trên), hoặc null.
    
    Chỉ trả về một đối tượng JSON có key là "npcs" và value là một mảng các đối tượng NPC.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            npcs: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        role: { type: Type.STRING },
                        backstory: { type: Type.STRING },
                        factionName: { type: Type.STRING, nullable: true }
                    },
                    required: ["name", "role", "backstory", "factionName"]
                }
            }
        },
        required: ["npcs"]
    };

    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error generating dynamic entities:", error);
        return { npcs: [] };
    }
};

export const generateStartingGear = async (worldName: string, worldDesc: string, character: Character, difficulty: Difficulty): Promise<{ gear: Item[], message: string }> => {
    const skillEffectSchema = {
        type: Type.OBJECT,
        properties: {
            type: { type: Type.STRING, enum: Object.values(SkillEffectType) },
            target: { type: Type.STRING, enum: Object.values(TargetType) },
            stat: { type: Type.STRING, enum: Object.values(Stat), nullable: true },
            powerMultiplier: { type: Type.NUMBER, nullable: true },
            value: { type: Type.NUMBER, nullable: true },
            isPercent: { type: Type.BOOLEAN, nullable: true },
            duration: { type: Type.NUMBER, nullable: true },
            description: { type: Type.STRING },
            chance: { type: Type.NUMBER, nullable: true }
        },
        required: ["type", "target", "description"]
    };

    const skillDetailsSchema = {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(SkillType) },
            levelRequired: { type: Type.NUMBER },
            mpCost: { type: Type.NUMBER, nullable: true },
            effects: { type: Type.ARRAY, items: skillEffectSchema }
        },
        required: ["name", "description", "type", "levelRequired", "effects"]
    };

    const bonusSchema = {
        type: Type.OBJECT,
        properties: {
            stat: { type: Type.STRING, enum: Object.values(Stat) },
            value: { type: Type.NUMBER },
            isPercent: { type: Type.BOOLEAN }
        },
        required: ["stat", "value", "isPercent"]
    };
    
    const cultivationTechniqueDetailsSchema = {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(CultivationTechniqueType) },
            maxLevel: { type: Type.NUMBER },
            bonusesPerLevel: { type: Type.ARRAY, items: bonusSchema },
            bonuses: { type: Type.ARRAY, items: bonusSchema }
        },
        required: ["name", "description", "type", "maxLevel", "bonusesPerLevel", "bonuses"]
    };

    const prompt = `Dựa trên bối cảnh thế giới và nhân vật, hãy tạo ra 1-2 vật phẩm khởi đầu và một thông điệp ngắn.
    **Thế giới:** ${worldName} - ${worldDesc}
    **Nhân vật:** ${character.name}, ${character.playerClass}, cấp ${character.level}
    **Độ khó:** ${difficulty}
    
    Yêu cầu:
    - gear: Một mảng JSON chứa 1-2 vật phẩm.
    - message: Một thông điệp ngắn (1-2 câu) giải thích tại sao nhân vật có những vật phẩm này.
    - **QUAN TRỌNG:** Nếu vật phẩm có \`type\` là 'Sách Kỹ Năng' (SKILL_BOOK), bạn BẮT BUỘC phải tạo và điền đầy đủ đối tượng \`skillDetails\`. Nếu là 'Công Pháp' (CULTIVATION_MANUAL), bạn BẮT BUỘC phải tạo và điền đầy đủ đối tượng \`cultivationTechniqueDetails\`. Với các loại trang bị khác, các trường này phải là \`null\`.
    
    Chỉ trả về JSON.`;
    
    const itemSchema = {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            type: { type: Type.STRING, enum: Object.values(ItemType) },
            rarity: { type: Type.STRING, enum: Object.values(Rarity) },
            level: { type: Type.NUMBER },
            baseStats: { type: Type.OBJECT, properties: allStatsProperties },
            bonusStats: { type: Type.OBJECT, properties: allStatsProperties },
            skillDetails: skillDetailsSchema,
            cultivationTechniqueDetails: cultivationTechniqueDetailsSchema,
        },
        required: ["name", "type", "rarity", "level", "baseStats", "bonusStats"]
    };
    
    const schema = {
        type: Type.OBJECT,
        properties: {
            gear: { type: Type.ARRAY, items: itemSchema },
            message: { type: Type.STRING }
        },
        required: ["gear", "message"]
    };
    try {
        const aiClient = getAiClient();
        const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: schema }
        }));
        const result = JSON.parse(response.text);
        const gearWithIds: Item[] = result.gear.map((item: any) => ({
            ...item,
            id: crypto.randomUUID(),
            upgradeLevel: 0,
            maxUpgrade: RARITY_DATA[item.rarity as Rarity]?.maxUpgrade || 5,
            history: [],
            evolved: false,
            cultivationTechniqueDetails: item.cultivationTechniqueDetails 
                ? { ...item.cultivationTechniqueDetails, level: 1 } 
                : undefined,
        }));
        return { gear: gearWithIds, message: result.message };
    } catch (error) {
        console.error("Error generating starting gear:", error);
        return { gear: [], message: "Bạn bắt đầu với hai bàn tay trắng." };
    }
};

export const generateWorldDesignerContent = async (prompt: string, isStructured: boolean, schema: any): Promise<any> => {
    const aiClient = getAiClient();
    const config: any = {};
    if (isStructured) {
        config.responseMimeType = "application/json";
        config.responseSchema = schema;
    }

    const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: config
    }));

    if (isStructured) {
        try {
            return JSON.parse(response.text);
        } catch (e) {
            console.error("Failed to parse structured JSON response:", response.text, e);
            throw new Error("AI returned invalid JSON.");
        }
    }
    return response.text.trim();
};

export const summarizeDesignedWorld = async (
    analysisResults: any,
    mode: 'create' | 'analyze',
    subject: string
): Promise<{ prompt: string; keywords: string; }> => {
    const context = `
    Tên Thế Giới: ${analysisResults.worldName}
    Mô tả chung: ${analysisResults.worldLore}
    Xung đột chính: ${analysisResults.mainConflict}
    Chủng tộc nổi bật: ${analysisResults.uniqueRaces.map((r: any) => r.name).join(', ')}
    Phe phái chính: ${analysisResults.majorFactions.map((f: any) => f.name).join(', ')}
    Hệ thống tu luyện: ${analysisResults.magicSystem}
    `;

    const prompt = `Dựa trên phân tích chi tiết về thế giới đã được tạo, hãy tạo một bản tóm tắt ngắn gọn.
    **Bối cảnh:** ${context}
    **Chủ đề gốc:** ${mode === 'create' ? `Thể loại '${subject}'` : `Truyện '${subject}'`}
    
    Yêu cầu:
    1.  **prompt:** Một đoạn mô tả thế giới ngắn gọn (2-3 câu) để người chơi đọc trước khi tạo nhân vật.
    2.  **keywords:** 3-5 từ khóa chính mô tả thế giới (ví dụ: "cổ đại, ma thuật, xung đột phe phái").
    
    Chỉ trả về JSON.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
            prompt: { type: Type.STRING },
            keywords: { type: Type.STRING }
        },
        required: ["prompt", "keywords"]
    };

    const aiClient = getAiClient();
    const response: GenerateContentResponse = await callGeminiWithRetry(() => aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: schema }
    }));
    return JSON.parse(response.text);
};