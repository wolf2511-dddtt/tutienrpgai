
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { ImageLibraryItem } from '../types';
import { generateAIDescriptionForImage, generateAITagsForImage, generateImage } from '../services/geminiService';
import { useGame } from '../contexts/GameContext';

const AILoadingIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin ${className || 'h-5 w-5'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const ImageLibrary: React.FC = () => {
    const { imageLibrary: library, handleUpdateImageLibrary: onUpdateLibrary, handleBackToMenu: onClose } = useGame();
    const [url, setUrl] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState('');
    const [isMonster, setIsMonster] = useState(false);
    const [filter, setFilter] = useState('');
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isAIDescLoading, setIsAIDescLoading] = useState(false);
    const [isAITagsLoading, setIsAITagsLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isImportingFromWeb, setIsImportingFromWeb] = useState(false);


    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const resetForm = () => {
        setUrl('');
        setDescription('');
        setTags('');
        setIsMonster(false);
        setError('');
    };

    const handleAddImage = (e: React.FormEvent) => {
        e.preventDefault();
        setNotification('');
        setError('');
        if (!url.trim()) {
            setError('URL Ảnh không được để trống.');
            return;
        }
        setIsAdding(true);
        const newImage: ImageLibraryItem = {
            id: crypto.randomUUID(),
            url,
            description,
            tags: tags.split(';').map(t => t.trim()).filter(Boolean),
            isMonster,
        };
        onUpdateLibrary([newImage, ...library]);
        setNotification(`Đã thêm ảnh thành công.`);
        resetForm();
        setIsAdding(false);
    };
    
    const handleGenerateDesc = async () => {
        if (!url.trim()) {
            setError('Vui lòng nhập URL ảnh trước khi dùng AI.');
            return;
        }
        setIsAIDescLoading(true);
        setError('');
        setNotification('');
        const result = await generateAIDescriptionForImage(url);
        if (result.description) {
            setDescription(result.description);
        } else {
            setError(result.error || 'Đã có lỗi xảy ra.');
        }
        setIsAIDescLoading(false);
    };

    const handleGenerateTags = async () => {
        if (!url.trim()) {
            setError('Vui lòng nhập URL ảnh trước khi dùng AI.');
            return;
        }
        setIsAITagsLoading(true);
        setError('');
        setNotification('');
        const result = await generateAITagsForImage(url, description);
        if (result.tags) {
            setTags(result.tags.join('; '));
        } else {
            setError(result.error || 'Đã có lỗi xảy ra.');
        }
        setIsAITagsLoading(false);
    };

    const handleGenerateImage = async () => {
        if (!aiPrompt.trim()) {
            setError('Vui lòng nhập mô tả để tạo ảnh.');
            return;
        }
        setIsGeneratingImage(true);
        setError('');
        setNotification('');
        const result = await generateImage(aiPrompt);
        if (result.imageUrl) {
            const newImage: ImageLibraryItem = {
                id: crypto.randomUUID(),
                url: result.imageUrl,
                description: aiPrompt, // Use prompt as initial description
                tags: ['ai-generated'],
                isMonster: false,
            };
            onUpdateLibrary([newImage, ...library]);
            setNotification('Tạo ảnh thành công! Ảnh đã được thêm vào đầu thư viện.');
            // Populate form for easy saving
            setUrl(result.imageUrl);
            setDescription(aiPrompt);
            setTags('ai-generated');
            setAiPrompt('');
        } else {
            setError(result.error || 'Lỗi không xác định khi tạo ảnh.');
        }
        setIsGeneratingImage(false);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Bạn có chắc muốn xóa ảnh này khỏi thư viện?')) {
            onUpdateLibrary(library.filter(item => item.id !== id));
            setNotification('Đã xóa ảnh khỏi thư viện.');
            setError('');
        }
    };

    const handleExport = () => {
        setNotification('');
        setError('');
        if (library.length === 0) {
            setError("Thư viện đang trống. Không có gì để xuất ra file.");
            return;
        }
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(library, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "image_library.json";
        link.click();
        setNotification(`Đã xuất thành công ${library.length} ảnh ra file 'image_library.json'.`);
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNotification('');
            setError('');
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const importedData = JSON.parse(event.target?.result as string);
                    if (!Array.isArray(importedData) || !importedData.every(item => 'id' in item && 'url' in item && 'description' in item)) {
                        setError("File JSON không hợp lệ hoặc không đúng định dạng. Mỗi ảnh phải có 'id', 'url', và 'description'.");
                        return;
                    }
                    
                    if (library.length > 0 && window.confirm("Bạn có muốn GỘP thư viện hiện tại với file đã nhập không?\n\n- OK: Gộp (thêm ảnh mới, bỏ qua ảnh trùng lặp ID)\n- Cancel: THAY THẾ toàn bộ thư viện hiện tại.")) {
                        const existingIds = new Set(library.map(item => item.id));
                        const newItems = importedData.filter((item: ImageLibraryItem) => !existingIds.has(item.id));
                        onUpdateLibrary([...library, ...newItems]);
                        setNotification(`Đã gộp thành công, thêm ${newItems.length} ảnh mới vào thư viện.`);
                    } else {
                        onUpdateLibrary(importedData);
                        setNotification(`Đã thay thế thư viện thành công, nhập ${importedData.length} ảnh.`);
                    }
                } catch (err) {
                    setError("Lỗi khi đọc file JSON. Vui lòng kiểm tra lại cấu trúc file.");
                }
            };
            reader.readAsText(file);
        }
        e.target.value = ''; // Allow re-uploading the same file
    };

    const handleImportFromWeb = async () => {
        setIsImportingFromWeb(true);
        setError('');
        setNotification('');
        
        try {
            const response = await fetch('https://raw.githubusercontent.com/x-ia/the-valkyries/main/src/assets/avatar-tutien/manifest.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch manifest: ${response.statusText}`);
            }
            const imagePaths = await response.json();
    
            if (!Array.isArray(imagePaths)) {
                throw new Error('Manifest is not a valid array.');
            }
    
            const existingUrls = new Set(library.map(item => item.url));
            const newImages: ImageLibraryItem[] = [];
    
            for (const path of imagePaths) {
                const url = `https://avatatutien.pages.dev${path}`;
                if (!existingUrls.has(url)) {
                    const filename = path.split('/').pop() || '';
                    const baseName = filename.split('.')[0] || '';
                    const tags = ['tư-tiên'];
                    if (baseName.startsWith('nu')) tags.push('nữ');
                    if (baseName.startsWith('nam')) tags.push('nam');
    
                    newImages.push({
                        id: crypto.randomUUID(),
                        url: url,
                        description: `Ảnh từ AvatarTuTien: ${filename}`,
                        tags: tags,
                        isMonster: false,
                    });
                }
            }
            
            if (newImages.length > 0) {
                onUpdateLibrary([...newImages, ...library]);
                setNotification(`Đã nhập thành công ${newImages.length} ảnh mới từ AvatarTuTien.`);
            } else {
                setNotification('Thư viện ảnh đã được cập nhật. Không có ảnh mới nào được tìm thấy.');
            }
    
        } catch (err: any) {
            setError(`Lỗi khi nhập từ web: ${err.message}`);
        } finally {
            setIsImportingFromWeb(false);
        }
    };

    const filteredLibrary = useMemo(() => {
        if (!filter) return library;
        const lowercasedFilter = filter.toLowerCase();
        return library.filter(item =>
            item.description.toLowerCase().includes(lowercasedFilter) ||
            item.tags.some(tag => tag.toLowerCase().includes(lowercasedFilter))
        );
    }, [library, filter]);


    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-3xl z-10">&times;</button>
                <div className="bg-gray-800 border border-blue-500/20 shadow-2xl rounded-2xl p-8">
                    <h1 className="text-3xl font-bold text-blue-400 mb-6">Công cụ Quản lý Ảnh</h1>
                    
                    {notification && <div className="bg-green-900/50 border border-green-500 text-green-300 p-3 rounded-lg mb-4">{notification}</div>}
                    {error && <div className="bg-red-900/50 border border-red-500 text-red-300 p-3 rounded-lg mb-4">{error}</div>}

                     {/* AI Image Generation */}
                    <div className="mb-8 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                        <h2 className="text-xl font-semibold mb-3 text-purple-300">Tạo Ảnh Bằng AI</h2>
                        <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="Mô tả hình ảnh bạn muốn tạo, ví dụ: 'một con rồng lửa khổng lồ bay trên đỉnh núi lửa'..." rows={2} className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-purple-500 outline-none transition resize-none"></textarea>
                        <button type="button" onClick={handleGenerateImage} disabled={isGeneratingImage} className="w-full mt-2 text-white font-bold py-2 px-4 rounded-lg transition duration-300 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center">
                            {isGeneratingImage ? <><AILoadingIcon className="mr-2" /> Đang tạo ảnh...</> : 'Tạo Ảnh'}
                        </button>
                    </div>

                    <form onSubmit={handleAddImage} className="space-y-4 mb-8">
                         <h2 className="text-xl font-semibold text-blue-300">Thêm Ảnh Thủ Công</h2>
                        <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="URL Ảnh..." className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-blue-500 outline-none transition" />
                        
                        <div className="relative">
                            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Mô tả cho ảnh..." rows={3} className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-blue-500 outline-none transition resize-none pr-32"></textarea>
                            <button type="button" onClick={handleGenerateDesc} disabled={isAIDescLoading} className="absolute bottom-3 right-3 bg-gray-600 hover:bg-gray-500 text-xs px-2 py-1 rounded-md flex items-center gap-1 disabled:opacity-50">
                                {isAIDescLoading ? <AILoadingIcon className="h-4 w-4" /> : 'Tạo mô tả bằng AI'}
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                             <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Thẻ (phân cách bởi ';') vd: nhân vật; rồng; lâu đài" className="flex-grow bg-gray-700 p-3 rounded-lg border-2 border-gray-600 focus:border-blue-500 outline-none transition" />
                             <button type="button" onClick={handleGenerateTags} disabled={isAITagsLoading} className="bg-gray-600 hover:bg-gray-500 p-3 rounded-lg flex items-center justify-center disabled:opacity-50">
                                {isAITagsLoading ? <AILoadingIcon /> : 'AI ✨'}
                             </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isMonster" checked={isMonster} onChange={e => setIsMonster(e.target.checked)} className="h-5 w-5 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500" />
                            <label htmlFor="isMonster" className="text-gray-300">Dùng làm ảnh quái vật</label>
                        </div>

                        <button type="submit" disabled={isAdding} className="w-full text-white font-bold py-3 px-4 rounded-lg transition duration-300 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 disabled:opacity-50">
                            {isAdding ? 'Đang thêm...' : 'Thêm Ảnh vào Thư viện'}
                        </button>
                    </form>

                    {/* Import / Export */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-3 text-blue-300">Nhập / Xuất</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={handleImportClick} className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition">Nhập Thư Viện (json)</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                            <button onClick={handleExport} className="bg-gray-700 hover:bg-gray-600 p-3 rounded-lg transition">Xuất Thư Viện (json)</button>
                        </div>
                        <div className="mt-4">
                            <button onClick={handleImportFromWeb} disabled={isImportingFromWeb} className="w-full bg-teal-600 hover:bg-teal-700 p-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center">
                                {isImportingFromWeb ? <><AILoadingIcon className="mr-2"/> Đang nhập...</> : 'Nhập Ảnh Nền Tu Tiên (AvatarTuTien)'}
                            </button>
                            <p className="text-xs text-center text-gray-500 mt-1">Tự động tải và thêm bộ sưu tập ảnh nền tu tiên từ trang web công cộng.</p>
                        </div>
                    </div>

                    {/* Library View */}
                    <div>
                        <h2 className="text-xl font-semibold mb-3 text-blue-300">Thư viện ({library.length})</h2>
                        <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Lọc ảnh theo thẻ hoặc mô tả..." className="w-full bg-gray-700 p-3 rounded-lg border-2 border-gray-600 mb-4 focus:border-blue-500 outline-none transition" />

                        {filteredLibrary.length > 0 ? (
                             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                                {filteredLibrary.map(item => (
                                    <div key={item.id} className="bg-gray-700 rounded-lg overflow-hidden relative group">
                                        <button onClick={() => handleDelete(item.id)} className="absolute top-2 right-2 bg-black/50 text-white rounded-full h-8 w-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600">&times;</button>
                                        <img src={item.url} alt={item.description} className="w-full h-40 object-cover" />
                                        <div className="p-3">
                                            <p className="text-sm text-gray-300 truncate" title={item.description}>{item.description || "Không có mô tả"}</p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {item.tags.map(tag => <span key={tag} className="bg-blue-900/70 text-blue-300 text-xs px-2 py-0.5 rounded-full">{tag}</span>)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 p-10 bg-gray-700/50 rounded-lg">
                                Thư viện trống hoặc không có ảnh phù hợp.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageLibrary;
