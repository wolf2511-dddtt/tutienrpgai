
import { GoogleGenAI, GenerateContentResponse, Type, HarmCategory, HarmBlockThreshold, Modality } from "@google/genai";
// Fix: Corrected import path for types.
import { Character, DesignedWorld, Faction, FactionType, ImageLibraryItem, LogType, Quest, QuestStatus, QuestType, StoryInfo, TerrainType, WorldSummary, Element } from "../types";

let ai: GoogleGenAI;

const initializeClient = () => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set.");
    }
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Initialize on load
initializeClient();

export const reinitializeAiClient = () => {
    // Per guidelines, API key is from env vars, so re-initializing is straightforward
    console.log("Re-initializing AI client...");
    initializeClient();
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
        const response = await ai.models.generateImages({
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
        // Use a proxy to avoid CORS issues
        const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
        const response = await fetch(proxyUrl);
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: "Mô tả hình ảnh này một cách ngắn gọn, tập trung vào nhân vật hoặc sinh vật chính, trong bối cảnh tu tiên / huyền huyễn." },
                    { inlineData: { data: imageDataResult.base64, mimeType: imageDataResult.mimeType } }
                ]
            },
        });

        return { description: response.text.trim() };
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { text: `Dựa trên mô tả "${description}" và hình ảnh này, hãy tạo ra 5-7 thẻ (tags) bằng tiếng Việt, phân cách bởi dấu chấm phẩy, ví dụ: "nữ; tóc trắng; kiếm sĩ; lạnh lùng". Chỉ trả về chuỗi các thẻ.` },
                    { inlineData: { data: imageDataResult.base64, mimeType: imageDataResult.mimeType } }
                ]
            },
        });

        const tags = response.text.split(';').map(t => t.trim()).filter(Boolean);
        return { tags };
    } catch (e: any) {
        console.error("Error generating image tags:", e);
        return { error: e.message || "Lỗi không xác định khi tạo thẻ." };
    }
};

// --- World Generation ---
export const generateWorldDesignerContent = async (prompt: string, useJson: boolean, schema?: any): Promise<any> => {
    try {
        // Updated to gemini-3-pro-preview for complex creative tasks
        // Added thinkingConfig for deeper world logic coherence
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: useJson ? "application/json" : "text/plain",
                responseSchema: useJson ? schema : undefined,
                thinkingConfig: { thinkingBudget: 2048 },
            },
        });

        return JSON.parse(response.text);

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
        // Updated to gemini-3-pro-preview for better comprehension of complex JSON structures
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
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
        return JSON.parse(response.text);

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
        // Updated to gemini-3-pro-preview for richer storytelling
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.85,
            },
            safetySettings,
        });
        return JSON.parse(response.text);
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
    // Enable Thinking Config for deeper analysis of player intent and more coherent storytelling.
    // Using gemini-2.5-flash which supports thinkingConfig.
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.8,
                // Thinking budget allows the model to reason about the implications of the action before generating the text.
                thinkingConfig: { thinkingBudget: 1024 },
            },
        });

        return response.text.trim();
    } catch (e: any) {
        console.error("Error processing player action:", e);
        return "Thế giới dường như không phản hồi lại hành động của bạn. Có lẽ một sức mạnh vô hình nào đó đang cản trở.";
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
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        
        const text = response.text;
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
    
    const activeQuests = character.quests.filter(q => q.status === QuestStatus.ACTIVE);
    const questInfo = activeQuests.length > 0 
        ? activeQuests.map(q => `${q.title} (${q.target.current}/${q.target.count} ${q.target.targetName})`).join(', ') 
        : "Không có";

    // Detect debuffs (Assuming simple string check for now to avoid extra imports if possible, or update imports)
    const debuffs = character.activeEffects
        .filter(e => ['DEBUFF', 'DOT', 'STUN', 'DISABLE_SKILL'].includes(e.effect.type))
        .map(e => e.effect.description)
        .join(', ');

    const prompt = `
    Đóng vai một "Hộ Pháp Sư" (AI Advisor) trong game Tiên Hiệp.
    Phân tích dữ liệu nhân vật để đưa ra **MỘT** lời khuyên chiến thuật cụ thể, hữu ích nhất.

    Dữ liệu:
    - Tên: ${character.name} (${character.realm.name} - Lv${character.level})
    - HP: ${Math.round(hpPercent)}% | MP: ${Math.round(mpPercent)}%
    - EXP: ${Math.round(expPercent)}% ${expPercent >= 100 ? '(Đủ thăng cấp)' : ''}
    - Điểm tiềm năng chưa cộng: ${unallocatedPoints}
    - Hiệu ứng xấu: ${debuffs || 'Không'}
    - Vị trí: ${terrain}
    - Nhiệm vụ: ${questInfo}
    - Sự kiện gần đây: ${recentLogs.slice(0, 2).join('; ')}

    Thứ tự ưu tiên (Logic):
    1. **Nguy kịch (HP < 30% hoặc dính Debuff nặng)**: Cảnh báo rút lui, hồi phục gấp.
    2. **Phát triển (Có điểm tiềm năng hoặc đủ EXP)**: Nhắc nhở cộng điểm hoặc tìm nơi an toàn để đột phá.
    3. **Nhiệm vụ (HP > 50%)**: Hướng dẫn hoàn thành mục tiêu nhiệm vụ.
    4. **Khám phá**: Khuyến khích thám hiểm nếu trạng thái tốt.

    Yêu cầu:
    - Ngắn gọn (tối đa 2 câu).
    - Giọng văn: Cổ trang, như sư phụ nhắc nhở đệ tử.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview', 
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return response.text.trim();
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
    
    Hãy sử dụng Google Search để tìm kiếm thông tin chính xác và cập nhật nhất.
    Trả lời ngắn gọn, súc tích, mang phong cách cổ trang.
    Nếu câu hỏi không liên quan đến chủ đề game/tiên hiệp, hãy tìm cách lái về bối cảnh game hoặc trả lời một cách hài hước theo phong cách tu tiên.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map((chunk: any) => chunk.web ? { uri: chunk.web.uri, title: chunk.web.title } : null)
            .filter(Boolean);

        return {
            text: response.text.trim(),
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
    Mô tả môn phái: "${faction.description}".
    
    Yêu cầu nhiệm vụ:
    - Tiêu đề hấp dẫn, mang màu sắc tu tiên.
    - Mô tả nhiệm vụ ngắn gọn, nêu rõ lý do tại sao tông môn cần thực hiện việc này.
    - Mục tiêu phải là tiêu diệt quái vật (Hunt) hoặc thu thập vật phẩm (Gather).
    - Tên mục tiêu phải phù hợp với bối cảnh (ví dụ: Yêu Thú, Thảo Dược).
    
    Trả về định dạng JSON.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            type: { type: Type.STRING, enum: [QuestType.HUNT, QuestType.GATHER] },
            targetName: { type: Type.STRING },
            count: { type: Type.INTEGER },
            expReward: { type: Type.INTEGER },
            contributionReward: { type: Type.INTEGER },
        },
        required: ["title", "description", "type", "targetName", "count", "expReward", "contributionReward"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.9,
            },
        });
        return JSON.parse(response.text);
    } catch (e: any) {
        console.error("Error generating sect mission:", e);
        throw new Error("Không thể tạo nhiệm vụ lúc này.");
    }
}

// --- Dialogue Generation ---

export const generateDialogueResponse = async (
    npcName: string,
    npcRole: string,
    npcPersonality: string,
    npcAffinity: number,
    playerMessage: string,
    history: { speaker: string, text: string }[]
): Promise<{ text: string, options: string[], newAffinity: number }> => {
    
    const context = history.map(h => `${h.speaker === 'player' ? 'Người chơi' : npcName}: ${h.text}`).join('\n');
    
    const prompt = `
    Bạn đang đóng vai NPC trong game tu tiên.
    Tên NPC: ${npcName}
    Vai trò: ${npcRole}
    Tính cách: ${npcPersonality}
    Độ thiện cảm hiện tại (thang -100 đến 100): ${npcAffinity}
    
    Lịch sử trò chuyện:
    ${context}
    
    Người chơi vừa nói: "${playerMessage}"
    
    Nhiệm vụ:
    1. Phản hồi lại người chơi dựa trên tính cách và độ thiện cảm.
    2. Đưa ra 3 lựa chọn phản hồi tiếp theo cho người chơi (Ngắn gọn, đa dạng thái độ: Thân thiện, Hỏi thăm, Khiêu khích/Thờ ơ).
    3. Đánh giá xem câu nói vừa rồi của người chơi ảnh hưởng thế nào đến độ thiện cảm (cộng hoặc trừ điểm, tối đa +/- 10).
    
    Trả về JSON.
    `;

    const schema = {
        type: Type.OBJECT,
        properties: {
            text: { type: Type.STRING, description: "Câu trả lời của NPC." },
            options: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING }, 
                description: "3 lựa chọn trả lời cho người chơi." 
            },
            affinityChange: { type: Type.INTEGER, description: "Số điểm thiện cảm thay đổi (ví dụ: 5, -2, 0)." }
        },
        required: ["text", "options", "affinityChange"]
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-pro-preview",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.8,
            },
        });
        const result = JSON.parse(response.text);
        return {
            text: result.text,
            options: result.options,
            newAffinity: Math.max(-100, Math.min(100, npcAffinity + result.affinityChange))
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
        const response = await ai.models.generateContent({
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
