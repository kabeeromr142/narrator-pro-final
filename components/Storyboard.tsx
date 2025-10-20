import React, { useState } from 'react';
import { CreateIcon, SparklesIcon, CloseIcon } from './icons';
import { Project } from '../types';
import { getStudioSuggestions } from '../services/geminiService';


interface StoryboardProps {
    project: Project;
}

const StoryboardFrame: React.FC<{ index: number; videoUrl: string }> = ({ index, videoUrl }) => {
    return (
        <div className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-800 cursor-pointer">
            <span className="text-xs font-mono text-gray-500">{String(index + 1).padStart(2, '0')}</span>
            <div className="w-full aspect-video bg-black rounded-sm overflow-hidden border border-gray-700">
                {/* In a real app, we'd generate thumbnails. For now, a muted video works as a placeholder. */}
                <video src={videoUrl} className="w-full h-full object-cover" muted />
            </div>
        </div>
    )
}

const SuggestionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    suggestions: string[];
    isLoading: boolean;
}> = ({ isOpen, onClose, suggestions, isLoading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-fadeIn" onClick={onClose}>
            <div className="bg-[#1E1E1E] border border-amber-500 rounded-lg shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6" /> AI Storyboard Ideas
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="max-h-80 overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {suggestions.map((idea, index) => (
                                <li key={index} className="bg-gray-800 p-3 rounded-lg text-sm text-gray-300 border-l-4 border-amber-500">
                                    {idea}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};


const Storyboard: React.FC<StoryboardProps> = ({ project }) => {
    const frameCount = 8;
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [storyboardSuggestions, setStoryboardSuggestions] = useState<string[]>([]);
    
    const handleSuggestClick = async () => {
        setIsSuggestionModalOpen(true);
        setIsLoadingSuggestions(true);
        try {
            const result = await getStudioSuggestions(project.prompt);
            setStoryboardSuggestions(result.storyboardIdeas);
        } catch (error) {
            console.error("Failed to get storyboard suggestions:", error);
            setStoryboardSuggestions(["Sorry, we couldn't generate ideas at this moment."]);
        } finally {
            setIsLoadingSuggestions(false);
        }
    };

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-2 h-full flex flex-col">
            <div className="flex justify-between items-center mb-2 px-1">
                 <h3 className="font-semibold text-lg text-amber-400">Storyboard</h3>
                 <button onClick={handleSuggestClick} className="text-xs bg-amber-500 text-black font-bold py-1 px-2 rounded hover:bg-amber-400 flex items-center gap-1">
                    <SparklesIcon className="w-3 h-3"/> AI Suggest
                 </button>
            </div>
            <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                {Array.from({ length: frameCount }).map((_, index) => (
                    <StoryboardFrame key={index} index={index} videoUrl={project.videoUrl} />
                ))}
            </div>
            <div className="mt-2 pt-2 border-t border-gray-800">
                <button className="w-full flex items-center justify-center gap-2 bg-gray-800 text-amber-400 font-bold py-2 px-2 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                    <CreateIcon className="w-5 h-5"/>
                    Add Scene
                </button>
            </div>
             <SuggestionModal
                isOpen={isSuggestionModalOpen}
                onClose={() => setIsSuggestionModalOpen(false)}
                suggestions={storyboardSuggestions}
                isLoading={isLoadingSuggestions}
            />
        </div>
    );
};

export default Storyboard;
