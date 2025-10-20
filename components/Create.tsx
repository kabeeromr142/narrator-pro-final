import React, { useState, useRef, useCallback, useEffect } from 'react';
import { generateVideo, getPromptSuggestions } from '../services/geminiService';
import { Project, Plan, Page } from '../types';
import { SparklesIcon, DownloadIcon } from './icons';

interface CreateProps {
    addProject: (project: Project) => void;
    credits: number;
    currentPlan: Plan;
    setActivePage: (page: Page) => void;
}

const styles = ["Epic", "Moody", "Urban", "Cinematic", "Anime", "Noir"];

const Create: React.FC<CreateProps> = ({ addProject, credits, currentPlan, setActivePage }) => {
    const [prompt, setPrompt] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<string>(styles[0]);
    const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [status, setStatus] = useState<'IDLE' | 'GENERATING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [progressMessage, setProgressMessage] = useState('');
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const promptContainerRef = useRef<HTMLDivElement>(null);

    // AI Suggestions State
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionTimeoutRef = useRef<number | null>(null);

    const hasCredits = currentPlan === 'Alpha' || credits > 0;
    
    useEffect(() => {
        if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);

        if (prompt.trim().length > 4) {
            suggestionTimeoutRef.current = window.setTimeout(async () => {
                setIsFetchingSuggestions(true);
                const newSuggestions = await getPromptSuggestions(prompt);
                setSuggestions(newSuggestions);
                if (newSuggestions.length > 0) setShowSuggestions(true);
                setIsFetchingSuggestions(false);
            }, 600);
        } else {
            setShowSuggestions(false);
        }

        return () => { if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current); };
    }, [prompt]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (promptContainerRef.current && !promptContainerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSuggestionClick = (suggestion: string) => {
        setPrompt(prev => prev.trim() + ', ' + suggestion);
        setShowSuggestions(false);
    };

    const handleAudioUploadClick = () => {
        audioInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setAudioFile(event.target.files[0]);
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!prompt || !audioFile || status === 'GENERATING' || !hasCredits) return;

        setStatus('GENERATING');
        setError(null);
        setProgressMessage('Starting generation process...');
        setGeneratedVideoUrl(null);

        const fullPrompt = `Style: ${selectedStyle}. ${prompt}`;
        
        try {
            const { videoUrl, veoVideo, resolution: res, aspectRatio: ar } = await generateVideo(fullPrompt, resolution, aspectRatio, (message) => {
                setProgressMessage(message);
            });
            
            const newProject: Project = {
                id: new Date().toISOString(),
                name: prompt.substring(0, 30) || 'Untitled Project',
                prompt: fullPrompt,
                duration: '0:07', // VEO default
                createdAt: new Date().toLocaleDateString(),
                videoUrl,
                veoVideo,
                resolution: res,
                aspectRatio: ar,
                copyrightTokenId: `C2PA-${Date.now()}`,
                moodVibrancy: 50,
                syncIntensity: 60,
                zoom: 0,
                pan: 0,
                tilt: 0,
                depthOfField: 'Medium',
                volumeMix: {
                    drums: 50,
                    vocals: 50,
                    bass: 50,
                    melody: 50,
                },
                visualizerStyle: 'Waveform',
                isBeatSyncEnabled: true,
                waveformThickness: 3,
                waveformSensitivity: 50,
                visualizerColor: 'Amber',
            };
            
            addProject(newProject);
            setGeneratedVideoUrl(videoUrl);
            setStatus('SUCCESS');

        } catch (e) {
            const err = e as Error;
            setError(err.message || 'An unknown error occurred.');
            setStatus('ERROR');
        }
    }, [prompt, audioFile, selectedStyle, addProject, status, hasCredits, resolution, aspectRatio]);

    const handleReset = () => {
        setPrompt('');
        setAudioFile(null);
        setSelectedStyle(styles[0]);
        setStatus('IDLE');
        setGeneratedVideoUrl(null);
        setError(null);
        // FIX: Corrected typo from 'audioInput' to 'audioInputRef' to properly clear the file input.
        if(audioInputRef.current) audioInputRef.current.value = "";
    };

    const renderNoCreditsModal = () => (
        <div className="bg-gray-900 border border-amber-500 rounded-lg p-8 text-center animate-fadeIn">
             <h2 className="text-3xl font-bold text-yellow-400">Out of Credits</h2>
             <p className="text-gray-300 mt-4">You have used all your credits for this billing cycle.</p>
             <p className="text-gray-400 mt-2">Please upgrade your plan to continue creating.</p>
             <button 
                onClick={() => setActivePage(Page.Billing)}
                className="mt-6 bg-amber-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-amber-400 transition-transform transform hover:scale-105 shadow-lg"
            >
                Upgrade Plan
            </button>
        </div>
    );
    
    const renderCreationForm = () => (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left Column: Core Inputs */}
                <div className="lg:col-span-3 space-y-6">
                    <div>
                        <label className="block text-lg font-semibold mb-2 text-amber-400">1. Upload Your Audio</label>
                        <div 
                            onClick={handleAudioUploadClick}
                            className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-gray-900 transition-colors"
                        >
                            <input
                                type="file"
                                ref={audioInputRef}
                                onChange={handleFileChange}
                                accept="audio/*"
                                className="hidden"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="mt-2 text-sm text-gray-400">
                                <span className="font-semibold text-amber-400">{audioFile ? audioFile.name : "Click to upload"}</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500">MP3, WAV, or FLAC</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-lg font-semibold mb-2 text-amber-400">2. Describe Your Vision</label>
                        <div ref={promptContainerRef} className="relative">
                            <textarea
                                value={prompt}
                                onFocus={() => prompt.trim().length > 4 && setShowSuggestions(true)}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder="e.g., A lone astronaut discovering a glowing alien forest, synthwave soundtrack..."
                                className="w-full bg-gray-900 border-2 border-gray-700 rounded-lg p-4 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none h-32"
                                disabled={status === 'GENERATING'}
                            />
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="absolute z-10 w-full bg-gray-800 border border-gray-700 rounded-b-lg shadow-lg max-h-48 overflow-y-auto">
                                    {isFetchingSuggestions ? (
                                        <div className="p-2 text-center text-gray-400">Loading suggestions...</div>
                                    ) : (
                                        <ul className="py-1">
                                            {suggestions.map((s, i) => (
                                                <li key={i} onMouseDown={() => handleSuggestionClick(s)} className="px-4 py-2 text-sm text-gray-300 hover:bg-amber-500 hover:text-black cursor-pointer">
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-lg font-semibold mb-2 text-amber-400">3. Choose a Style</label>
                        <div className="flex flex-wrap gap-2">
                            {styles.map(style => (
                                <button key={style} onClick={() => setSelectedStyle(style)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedStyle === style ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings & Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div>
                        <label className="block text-lg font-semibold mb-2 text-amber-400">4. Output Settings</label>
                        <div className="space-y-4 bg-gray-900 border border-gray-800 p-4 rounded-lg">
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-1">Resolution</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setResolution('720p')} className={`flex-1 p-2 text-sm rounded-md font-semibold transition-all ${resolution === '720p' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>720p (Fast)</button>
                                    <button onClick={() => setResolution('1080p')} disabled={currentPlan === 'Freemium'} className={`flex-1 p-2 text-sm rounded-md font-semibold transition-all ${resolution === '1080p' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'} disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed`}>1080p (HD)</button>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-300 block mb-1">Aspect Ratio</label>
                                <div className="flex gap-2">
                                    <button onClick={() => setAspectRatio('16:9')} className={`flex-1 p-2 text-sm rounded-md font-semibold transition-all ${aspectRatio === '16:9' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>Landscape (16:9)</button>
                                    <button onClick={() => setAspectRatio('9:16')} className={`flex-1 p-2 text-sm rounded-md font-semibold transition-all ${aspectRatio === '9:16' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>Portrait (9:16)</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!prompt || !audioFile || status === 'GENERATING' || !hasCredits}
                        className="w-full bg-amber-500 text-black font-bold py-4 px-8 rounded-lg text-lg hover:bg-amber-400 transition-all transform hover:scale-105 shadow-lg btn-glow disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                    >
                        <SparklesIcon className="w-6 h-6 inline-block mr-2" />
                        Generate Video ({currentPlan === 'Freemium' ? '1 Credit' : 'Go'})
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <div className="animate-fadeIn">
            <header className="mb-8">
                <h1 className="text-4xl font-black text-white">Create New Project</h1>
                <p className="text-gray-400">Turn your audio into a cinematic masterpiece with AI.</p>
            </header>

            <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8">
                {status === 'GENERATING' ? (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-amber-400">Generating Your Masterpiece...</h2>
                        <p className="text-gray-300 font-mono mt-4">{progressMessage}</p>
                        <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                            <div className="bg-amber-500 h-2.5 rounded-full animate-pulse-fast"></div>
                        </div>
                    </div>
                ) : status === 'SUCCESS' && generatedVideoUrl ? (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-green-400">Generation Complete!</h2>
                        <video src={generatedVideoUrl} controls autoPlay loop className="w-full max-w-2xl rounded-lg shadow-2xl mx-auto my-4" />
                        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                           <a href={generatedVideoUrl} download="narrator-pro-video.mp4" className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-400 transition-colors text-lg inline-flex items-center justify-center gap-2">
                                <DownloadIcon className="w-6 h-6"/> Download
                            </a>
                            <button onClick={handleReset} className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-colors text-lg">Create Another</button>
                        </div>
                    </div>
                ) : status === 'ERROR' ? (
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-red-500">Generation Failed</h2>
                        <p className="text-red-400 mt-2">{error}</p>
                        <button onClick={handleReset} className="mt-6 bg-amber-500 text-black font-bold py-3 px-6 rounded-lg hover:bg-amber-400">Try Again</button>
                    </div>
                ) : !hasCredits ? (
                    renderNoCreditsModal()
                ) : (
                    renderCreationForm()
                )}
            </div>
        </div>
    );
};

export default Create;