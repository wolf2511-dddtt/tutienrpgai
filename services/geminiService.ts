

import { GoogleGenAI, GenerateContentResponse, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
import { Character, DesignedWorld, Faction, QuestType, WorldSummary, Element, Poi, Quest, QuestStatus } from "../types";
import { loadApiKeys } from "./storageService";

let ai: GoogleGenAI | null = null;

const initializeClient = () => {
    // Priority: 1. Environment Variable, 2. Local Storage settings
    let key = process.env.API_KEY;
    
    if (!key || key === 'undefined' || key === '') {
        const storedKeys = loadApiKeys();
        if (storedKeys && storedKeys.length > 0) {
            key = storedKeys[0];
            console.log("Loaded API Key from Local Storage.");
        }
    } else {
        console.log("Loaded API Key from environment variable.");
    }

    if (key && key !== 'undefined' && key !== '') {
        try {
            ai = new GoogleGenAI({ apiKey: key });
        } catch (e) {
            console.error("Failed to initialize AI client:", e);
            ai = null;
        }
    } else {
        console.warn("API Key not found in environment or storage. AI features will be disabled until configured in Settings.");
        ai = null;
    }
};

// Initialize on load
initializeClient();

export const reinitializeAiClient = () => {
    console.log("Re-initializing AI client with updated settings...");
    initializeClient();
};

const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        // Try to initialize again, in case a key was just set.
        initializeClient();
        if (!ai) {
            throw new Error("Chưa cấu hình API Key. Vui lòng vào mục Cài Đặt (Settings) để nhập Google Gemini API Key.");
        }
    }
    return ai;
};

const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

// --- Image Generation & Analysis ---

export const generateImage = async (prompt: string): Promise<{ imageUrl?: string; error?: string }> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `cinematic fantasy art, ${prompt}`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            return { imageUrl: `data:image/jpeg;base64,${base64ImageBytes}` };
        }
        return { error: "Không thể tạo ảnh từ mô tả." };
    } catch (e: any) {
        console.error("Error generating image:", e);
        return { error: e.message || "Lỗi không xác định khi tạo ảnh." };
    }
};

const getBase64FromUrl = async (url: string): Promise<{base64: string, mimeType: string} | {error: string}> => {
    try {
        // Use a proxy to avoid CORS issues if necessary
        const response = await fetch(url);
        if (!response.ok) {
            return { error: `Failed to fetch image: ${response.statusText}`};
        }
        const blob = await response.blob();
        const mimeType = blob.type;
        const reader = new FileReader();
        return new Promise((resolve) => {
            reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolve({ base64, mimeType });
            };
            reader.onerror = () => {
                resolve({error: 'Failed to read image data.'});
            }
            reader.readAsDataURL(blob);
        });
    } catch (e: any) {
         return { error: `Network error fetching image: ${e.message}`};
    }
};


export const generateAIDescriptionForImage = async (imageUrl: string): Promise<{ description?: string; error?: string }> => {
    const imageDataResult = await getBase64FromUrl(imageUrl);
    if ('error' in imageDataResult) {
        return { error: imageDataResult.error };
    }

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest',
            contents: {
                parts: [
                    { text: "Mô tả hình ảnh này một cách ngắn gọn, tập trung vào nhân vật hoặc sinh vật chính, trong bối cảnh tu tiên / huyền huyễn." },
                    { inlineData: { data: imageDataResult.base64, mimeType: imageDataResult.mimeType } }
                ]
            },
        });

        return { description: response.text?.trim() };
    } catch (e: any) {
        console.error("Error generating image description:", e);
        return { error: e.message || "Lỗi không xác định khi tạo mô tả." };
    }
};

export const generateAITagsForImage = async (imageUrl: string, description: string): Promise<{ tags?: string[]; error?: string }> => {
     const imageDataResult = await getBase64FromUrl(imageUrl);
    if ('error' in imageDataResult) {
        return { error: imageDataResult.error };
    }
    
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest',
            contents: {
                parts: [
                    { text: `Dựa trên mô tả "${description}" và hình ảnh này, hãy tạo ra 5-7 thẻ (tags) bằng tiếng Việt, phân cách bởi dấu chấm phẩy, ví dụ: "nữ; tóc trắng; kiếm sĩ; lạnh lùng". Chỉ trả về chuỗi các thẻ.` },
                    { inlineData: { data: imageDataResult.base64, mimeType: imageDataResult.mimeType } }
                ]
            },
        });

        const tags = response.text?.split(';').map(t => t.trim()).filter(Boolean);
        return { tags };
    } catch (e: any) {
        console.error("Error generating image tags:", e);
        return { error: e.message || "Lỗi không xác định khi tạo thẻ." };
    }
};

// --- World Generation ---
export const generateWorldDesignerContent = async (prompt: string, useJson: boolean, schema?: any): Promise<any> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: useJson ? "application/json" : "text/plain",
                responseSchema: useJson ? schema : undefined,
                thinkingConfig: { thinkingBudget: 2048 },
            },
        });

        return JSON.parse(response.text || '{}');

    } catch (e: any) {
        console.error("Error generating world content:", e);
        throw new Error(e.message || "Lỗi không xác định khi tạo thế giới.");
    }
};

export const summarizeDesignedWorld = async (worldData: DesignedWorld, mode: 'create' | 'analyze', subject: string): Promise<WorldSummary> => {
    const prompt = `Tóm tắt thế giới sau đây thành 2 yếu tố: một 'prompt' (1 câu, tối đa 200 ký tự) và một danh sách 'keywords' (3-5 từ khóa chính).
    - Prompt: Phải thật hấp dẫn, nêu bật được đặc điểm cốt lõi nhất của thế giới.
    - Keywords: Là những từ khóa giúp xác định bối cảnh độc đáo của thế giới này.
    
    Dữ liệu thế giới: ${JSON.stringify(worldData)}`;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        prompt: { type: Type.STRING },
                        keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["prompt", "keywords"],
                },
            },
        });
        return JSON.parse(response.text || '{}');

    } catch (e: any) {
        console.error("Error summarizing world:", e);
        throw new Error(e.message || "Lỗi tóm tắt thế giới.");
    }
};


// --- Character Generation ---
export const generateCharacterDetails = async (
    name: string,
    playerClass: string,
    characterContext: string,
    worldLore: string
): Promise<{ backstory: string; linhCan: { elements: Element[], quality: string, description:string } }> => {
    const prompt = `
    Bối cảnh: Game RPG tu tiên trong một thế giới có lore sau: "${worldLore}".
    
    Hãy tạo ra thông tin chi tiết cho một nhân vật mới:
    - Tên: ${name}
    - Class: ${playerClass}
    - Bối cảnh do người chơi cung cấp: "${characterContext || 'Không có'}"

    Dựa vào thông tin trên, hãy tạo ra:
    1.  **backstory**: Một cốt truyện nền (khoảng 2-3 câu) hấp dẫn, tích hợp bối cảnh của người chơi vào thế giới. Nếu không có bối cảnh, hãy tự sáng tạo.
    2.  **linhCan**: Một hệ thống "Linh Căn" (tư chất tu luyện).
        -   **elements**: Một mảng chứa từ 1 đến 3 thuộc tính từ danh sách [Kim, Mộc, Thủy, Hỏa, Thổ]. Ví dụ: ["Hỏa", "Mộc"].
        -   **quality**: Một phẩm chất mô tả độ hiếm/mạnh của linh căn (ví dụ: Phàm phẩm, Thiên phẩm, Hỗn Độn).
        -   **description**: Một câu mô tả ngắn gọn về linh căn này và tiềm năng của nó.

    Trả về một đối tượng JSON duy nhất.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            backstory: { type: Type.STRING },
            linhCan: {
                type: Type.OBJECT,
                properties: {
                    elements: { type: Type.ARRAY, items: { type: Type.STRING, enum: Object.values(Element).filter(e => e !== Element.VO) } },
                    quality: { type: Type.STRING },
                    description: { type: Type.STRING },
                },
                required: ["elements", "quality", "description"]
            }
        },
        required: ["backstory", "linhCan"]
    };

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.85,
            },
            safetySettings,
        });
        return JSON.parse(response.text || '{}');
    } catch (e: any) {
        console.error("Error generating character details:", e);
        // Fallback in case of API error
        return {
            backstory: "Sinh ra trong một ngôi làng hẻo lánh, bạn luôn khao khát khám phá thế giới rộng lớn và con đường tu tiên đầy bí ẩn.",
            linhCan: {
                elements: [Element.MOC],
                quality: 'Phàm phẩm',
                description: 'Linh căn phổ biến, con đường tu luyện sẽ đầy chông gai nhưng không phải là không có cơ hội.'
            }
        };
    }
};


// --- Player Action Processing ---

export const processPlayerAction = async (character: Character, terrain: string, action: string, difficulty: string): Promise<string> => {
    const prompt = `
    Bối cảnh: Game RPG tu tiên.
    Nhân vật: ${character.name}, Cấp ${character.level}, Class ${character.playerClass}.
    Vị trí: ${terrain}.
    Độ khó: ${difficulty}.
    Hành động của người chơi: "${action}"

    Hãy đóng vai trò là người dẫn truyện (Game Master), mô tả kết quả hành động của người chơi một cách sáng tạo và hợp lý.
    - Phân tích ý định của người chơi và các hệ quả logic.
    - Nếu hành động có khả năng dẫn đến chiến đấu, hãy kết thúc bằng một câu gợi ý nguy hiểm rõ ràng (vd: "Một tiếng gầm gừ vang lên từ trong bóng tối...", "Sát khí lạnh lẽo ập tới!").
    - Giữ cho câu trả lời trong khoảng 2-4 câu văn.
    - Không được tự ý cho vật phẩm hoặc phần thưởng. Chỉ mô tả sự kiện.
    `;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                temperature: 0.8,
                thinkingConfig: { thinkingBudget: 1024 },
            },
        });

        return response.text?.trim() || "Không có phản hồi từ thế giới.";
    } catch (e: any) {
        console.error("Error processing player action:", e);
        return "Thế giới dường như không phản hồi lại hành động của bạn. Có lẽ một sức mạnh vô hình nào đó đang cản trở. (Lỗi kết nối AI)";
    }
};

export const generateContextualActions = async (character: Character, terrain: string, recentLogs: string[]): Promise<string[]> => {
    const prompt = `
    Bối cảnh: Game RPG tu tiên.
    Nhân vật: ${character.name}, Cấp ${character.level}, Class ${character.playerClass}.
    Vị trí: ${terrain}.
    Sự kiện gần đây: ${recentLogs.slice(0, 3).join("; ")}.

    Hãy đề xuất 3-4 hành động ngắn gọn (tối đa 4 từ mỗi hành động) mà người chơi có thể thực hiện tiếp theo.
    Ví dụ: "Thám thính xung quanh", "Thiền định hồi phục", "Tìm kiếm thảo dược".
    Chỉ trả về danh sách các hành động, phân cách bởi dấu chấm phẩy.
    `;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        
        const text = response.text || "";
        return text.split(/[;,]/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 30).slice(0, 4);
    } catch (e) {
        console.error("Error generating actions", e);
        return ["Quan sát", "Tiến về phía trước", "Tìm nơi nghỉ ngơi"];
    }
};

export const generateStrategicAdvice = async (character: Character, terrain: string, recentLogs: string[]): Promise<string> => {
    const hpPercent = (character.currentHp / character.derivedStats.HP) * 100;
    const mpPercent = (character.currentMp / character.derivedStats.MP) * 100;
    const expPercent = (character.exp / character.expToNextLevel) * 100;
    const unallocatedPoints = character.unallocatedStatPoints || 0;
    const activeQuest = character.quests.find(q => q.status === QuestStatus.ACTIVE);

    const prompt = `
    Đóng vai một "Hộ Pháp Sư" (AI Advisor) trong game Tiên Hiệp.
    Phân tích dữ liệu nhân vật để đưa ra **MỘT** lời khuyên chiến thuật cụ thể, hữu ích nhất.

    Dữ liệu:
    - Tên: ${character.name} (${character.realm.name} - Lv${character.level})
    - HP: ${Math.round(hpPercent)}% | MP: ${Math.round(mpPercent)}%
    - EXP: ${Math.round(expPercent)}% ${expPercent >= 100 ? '(Đủ thăng cấp)' : ''}
    - Điểm tiềm năng chưa cộng: ${unallocatedPoints}
    - Nhiệm vụ hiện tại: ${activeQuest ? `${activeQuest.title} (${activeQuest.target.current}/${activeQuest.target.count} ${activeQuest.target.targetName})` : 'Không có'}
    - Tình hình: Đang ở ${terrain}. Sự kiện gần đây: ${recentLogs.join('; ')}

    QUY TẮC ƯU TIÊN:
    1.  **SINH TỒN**: Nếu HP dưới 30%, phải cảnh báo và khuyên dùng vật phẩm hồi phục hoặc nghỉ ngơi.
    2.  **ĐỘT PHÁ**: Nếu EXP đủ để thăng cấp hoặc có điểm tiềm năng chưa cộng, hãy nhắc nhở người chơi.
    3.  **NHIỆM VỤ**: Nếu có nhiệm vụ, hãy gợi ý bước tiếp theo (tiếp tục săn quái, quay về trả nhiệm vụ...).
    4.  **KHÁM PHÁ**: Nếu mọi thứ ổn, hãy gợi ý khám phá hoặc chuẩn bị cho thử thách tiếp theo.

    CHỈ trả về một câu lời khuyên duy nhất, ngắn gọn.
    `;
    
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest', 
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return response.text?.trim() || "Hãy cẩn trọng.";
    } catch (e) {
        console.error("Error generating advice", e);
        return "Tâm trí ta đang hỗn loạn, không thể đưa ra lời khuyên lúc này.";
    }
};

// --- Search Grounding ---

export const searchCultivationKnowledge = async (query: string): Promise<{ text: string, sources?: {uri: string, title: string}[] }> => {
    const prompt = `
    Bạn là một cuốn bách khoa toàn thư về thế giới Tiên Hiệp, Thần Thoại Trung Hoa và Đạo Giáo.
    Người dùng đang hỏi: "${query}"
    Hãy sử dụng Google Search để tìm và tổng hợp câu trả lời chính xác, sau đó trình bày lại theo văn phong của một học giả uyên bác.
    - Luôn trích dẫn nguồn nếu có thể.
    - Giữ câu trả lời trong khoảng 3-5 đoạn văn.
    `;

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-flash-latest', // Changed from 2.5-flash to flash-latest
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
            .filter(Boolean);

        return {
            text: response.text?.trim() || "Không tìm thấy thông tin.",
            sources: sources as {uri: string, title: string}[]
        };
    } catch (e: any) {
        console.error("Error searching knowledge:", e);
        return { text: "Tàng Thư Các hiện đang đóng cửa để bảo trì trận pháp. Vui lòng quay lại sau." };
    }
}

// --- Dynamic Quest Generation ---

export const generateSectMission = async (faction: Faction, characterRank: string): Promise<any> => {
    const prompt = `
    Hãy thiết kế một nhiệm vụ tông môn cho một đệ tử cấp bậc "${characterRank}" thuộc môn phái "${faction.name}" (${faction.type}).
    Nhiệm vụ phải phù hợp với bản chất của phe phái (ví dụ: Chính Phái thì diệt ma, Ma Đạo thì thu thập linh hồn).
    
    YÊU CẦU: Trả về JSON với các trường sau:
    - title: Tên nhiệm vụ (VD: "Diệt Trừ Yêu Lang").
    - description: Mô tả ngắn gọn (1-2 câu).
    - targetName: Tên mục tiêu cần săn/thu thập (VD: "Dạ Lang").
    - count: Số lượng cần thiết (từ 3 đến 10).
    - expReward: Lượng kinh nghiệm thưởng.
    - contributionReward: Điểm cống hiến thưởng.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            targetName: { type: Type.STRING },
            count: { type: Type.NUMBER },
            expReward: { type: Type.NUMBER },
            contributionReward: { type: Type.NUMBER },
        },
        required: ["title", "description", "targetName", "count", "expReward", "contributionReward"]
    };

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.9,
            },
        });
        return JSON.parse(response.text || '{}');
    } catch (e: any) {
        console.error("Error generating sect mission:", e);
        throw new Error("Không thể tạo nhiệm vụ lúc này.");
    }
}

// --- Dialogue Generation ---

export const generateDialogueResponse = async (
    npcName: string,
    npcRole: string,
    npcMood: string,
    npcAffinity: number,
    playerMessage: string,
    history: any[]
): Promise<{ text: string, options: string[], newAffinity: number, questOffer?: Omit<Quest, 'id' | 'status'> }> => {
    const prompt = `
    Bạn đang đóng vai NPC trong game tu tiên.
    
    Thông tin NPC:
    - Tên: ${npcName}
    - Vai trò: ${npcRole}
    - Tâm trạng hiện tại: ${npcMood}
    - Độ thân thiết với người chơi: ${npcAffinity} (Thang điểm -100 đến 100)

    Lịch sử trò chuyện gần đây (nếu có):
    ${history.slice(-4).map((turn: any) => `${turn.speaker === 'player' ? 'Người chơi' : npcName}: ${turn.text}`).join('\n')}

    Hành động của người chơi:
    Người chơi nói: "${playerMessage}"

    YÊU CẦU:
    Dựa vào vai trò, tâm trạng và độ thân thiết, hãy tạo ra phản hồi của NPC.
    1.  **text**: Câu trả lời của NPC (1-2 câu).
    2.  **options**: 2-3 lựa chọn trả lời tiếp theo cho người chơi.
    3.  **affinityChange**: Một con số thể hiện sự thay đổi độ thân thiết (từ -10 đến +10).
    4.  **questOffer (TÙY CHỌN)**: Nếu hợp lý (dựa trên vai trò và độ thân thiết > 20), hãy đề xuất một nhiệm vụ. Cấu trúc gồm: title, description, type (HUNT hoặc GATHER), target (targetName, count), rewards (exp).

    Trả về một đối tượng JSON duy nhất.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: "Câu trả lời của NPC." },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Các lựa chọn cho người chơi." },
            affinityChange: { type: Type.NUMBER, description: "Sự thay đổi độ thân thiết." },
            questOffer: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    type: { type: Type.STRING, enum: [QuestType.HUNT, QuestType.GATHER] },
                    target: { 
                        type: Type.OBJECT,
                        properties: {
                            targetName: { type: Type.STRING },
                            count: { type: Type.NUMBER },
                        },
                        required: ["targetName", "count"]
                    },
                    rewards: {
                        type: Type.OBJECT,
                        properties: {
                            exp: { type: Type.NUMBER }
                        },
                        required: ["exp"]
                    },
                }
            }
        },
        required: ["text", "options", "affinityChange"]
    };

    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.8,
            },
        });
        const result = JSON.parse(response.text || '{}');
        return {
            text: result.text || "...",
            options: result.options || ["Kết thúc"],
            newAffinity: Math.max(-100, Math.min(100, npcAffinity + (result.affinityChange || 0))),
            questOffer: result.questOffer
        };
    } catch (e: any) {
        console.error("Error generating dialogue:", e);
        return {
            text: "...",
            options: ["Chào tạm biệt"],
            newAffinity: npcAffinity
        };
    }
}


// --- TTS ---

export const generateSpeech = async (text: string, voice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr' = 'Kore'): Promise<string | undefined> => {
    try {
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: { parts: [{ text }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e: any) {
        console.error("Error generating speech:", e);
        return undefined;
    }
};