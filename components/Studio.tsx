import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, Beat, VisualizerStyle } from '../types';
import { regenerateVideo, generateSpeech, getStudioSuggestions, generateVoiceoverScript } from '../services/geminiService';
import { LogoIcon, CameraIcon, AnalyticsIcon, SparklesIcon, SaveIcon, ChatIcon, FilterIcon, DownloadIcon, MicrophoneIcon } from './icons'; 
import Timeline from './Timeline';
import CommandMenu from './CommandMenu';
import Storyboard from './Storyboard';
import DialControl from './DialControl';
import AIAssistant from './AIAssistant';
import VideoControls from './VideoControls';

declare var Meyda: any;
declare var Sentry: any;

interface StudioProps {
  project: Project | null;
  updateProject: (updatedProject: Project) => void;
}

// Performance Optimization: Cache for beat analysis results
interface CachedAudioAnalysis {
    beats: Beat[];
    duration: number;
}
const beatCache = new Map<string, CachedAudioAnalysis>();

const aiVoices = {
    'Kore': 'Male - Professional',
    'Puck': 'Female - Energetic',
    'Zephyr': 'Neutral - AI',
    'Charon': 'Male - Deep',
    'Fenrir': 'Female - Warm'
};


const Studio: React.FC<StudioProps> = ({ project, updateProject }) => {
    const [generationStatus, setGenerationStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');
    const [progressMessage, setProgressMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [newVideoDownloadUrl, setNewVideoDownloadUrl] = useState<string | null>(null);

    // Timeline & Storyboard State
    const [beats, setBeats] = useState<Beat[]>([]);
    const [timelineCommands, setTimelineCommands] = useState<Record<number, string>>({});
    const [commandMenu, setCommandMenu] = useState<{ visible: boolean; x: number; y: number; timestamp: number } | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const wasPlayingBeforeScrub = useRef(false);
    const [duration, setDuration] = useState(7); // Default
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    // Controls State
    const [moodVibrancy, setMoodVibrancy] = useState(50);
    const [syncIntensity, setSyncIntensity] = useState(60);
    const [isBeatSyncEnabled, setIsBeatSyncEnabled] = useState(true);
    const [zoom, setZoom] = useState(0);
    const [pan, setPan] = useState(0);
    const [tilt, setTilt] = useState(0);
    const [depthOfField, setDepthOfField] = useState<'Low' | 'Medium' | 'High'>('Medium');
    const [volumeMix, setVolumeMix] = useState({ drums: 50, vocals: 50, bass: 50, melody: 50 });
    const [deepfakeConsent, setDeepfakeConsent] = useState(false);
    const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>('Waveform');
    // New visualizer controls state
    const [waveformThickness, setWaveformThickness] = useState(3);
    const [waveformSensitivity, setWaveformSensitivity] = useState(50);
    const [visualizerColor, setVisualizerColor] = useState('Amber');
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);


    // AI Voiceover State
    const [voiceoverScript, setVoiceoverScript] = useState('');
    const [selectedVoice, setSelectedVoice] = useState('Kore');
    const [isGeneratingVoiceover, setIsGeneratingVoiceover] = useState(false);
    const [voiceoverError, setVoiceoverError] = useState<string | null>(null);
    const [generatedVoiceoverUrl, setGeneratedVoiceoverUrl] = useState<string | null>(null);
    const [isSuggestingScript, setIsSuggestingScript] = useState(false);

    // AI Polish Suggestion State
    const [isSuggestingPolish, setIsSuggestingPolish] = useState(false);
    
    // Animation State
    const [isZooming, setIsZooming] = useState(false);
    const zoomTimeoutRef = useRef<number | null>(null);
    const [isPulsing, setIsPulsing] = useState(false);
    const [beatPulseStyle, setBeatPulseStyle] = useState({});
    const lastPulsedBeatRef = useRef<number | null>(null);


    // VQA State
    const [vqaScore, setVqaScore] = useState(96);
    const [vqaIssues, setVqaIssues] = useState<string[]>([]);
    
    const analyzeAudioForBeats = useCallback(async (audioUrl: string): Promise<Beat[]> => {
        // Performance Optimization: Check cache first
        if (beatCache.has(audioUrl)) {
            const cachedData = beatCache.get(audioUrl)!;
            setDuration(cachedData.duration);
            return cachedData.beats;
        }

        setIsAnalyzing(true);
        try {
            if (typeof Sentry !== 'undefined') {
                Sentry.addBreadcrumb({
                    category: 'audio',
                    message: `Meyda analysis started for project: ${project?.id}`,
                    level: 'info',
                });
            }
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const response = await fetch(audioUrl);
            if (!response.ok) throw new Error(`Failed to fetch audio file. Status: ${response.status}`);
            
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const audioDuration = audioBuffer.duration;
            setDuration(audioDuration);

            const channelData = audioBuffer.getChannelData(0); // Analyze mono
            const bufferSize = 1024;
            const hopSize = 512;
            const detectedBeats: Beat[] = [];

            let fluxHistory: number[] = [];
            const historySize = 10;
            let previousFlux = 0;

            for (let i = 0; i + bufferSize <= channelData.length; i += hopSize) {
                const buffer = channelData.slice(i, i + bufferSize);
                // Extract more features: spectralFlux for peaks, rms for overall intensity, energy for bass
                const features = Meyda.extract(['spectralFlux', 'rms', 'energy'], buffer);
                const flux = features.spectralFlux;

                fluxHistory.push(flux);
                if (fluxHistory.length > historySize) fluxHistory.shift();

                const isPeak = flux > previousFlux && flux > Math.max(...fluxHistory.slice(0, -1));
                
                if (isPeak) {
                    const threshold = fluxHistory.reduce((a, b) => a + b, 0) / fluxHistory.length * 1.5;
                    if (flux > threshold && flux > 0.01) {
                        const timestamp = i / audioBuffer.sampleRate;
                        detectedBeats.push({
                            timestamp,
                            intensity: Math.min(1, features.rms * 3),
                            // 'energy' in Meyda is RMS of power spectrum, often corresponds to low-end power
                            bassIntensity: Math.min(1, features.energy / 10),
                        });
                    }
                }
                previousFlux = flux;
            }
            
            // Performance Optimization: Store result in cache
            beatCache.set(audioUrl, { beats: detectedBeats, duration: audioDuration });
            return detectedBeats;

        } catch (e) {
            // Enhanced Error Handling
            if (typeof Sentry !== 'undefined') {
                Sentry.captureException(e);
            }
            console.error("Failed to analyze audio:", e);
            let errorMessage = "Could not analyze audio for beat detection.";
            if (e instanceof Error) {
                if (e.message.includes('decodeAudioData')) {
                    errorMessage = "Failed to decode audio. The file might be corrupt or in an unsupported format.";
                } else if (e.message.includes('fetch')) {
                    errorMessage = "Failed to load audio file. Please check the network connection.";
                }
            }
            setError(errorMessage);
            return [];
        } finally {
            setIsAnalyzing(false);
        }
    }, [project?.id]);


    useEffect(() => {
        if (project) {
            // Set controls based on project
            setMoodVibrancy(project.moodVibrancy);
            setSyncIntensity(project.syncIntensity);
            setIsBeatSyncEnabled(project.isBeatSyncEnabled ?? true);
            setZoom(project.zoom);
            setPan(project.pan);
            setTilt(project.tilt);
            setDepthOfField(project.depthOfField);
            setVolumeMix(project.volumeMix);
            setVisualizerStyle(project.visualizerStyle || 'Waveform');
            setWaveformThickness(project.waveformThickness ?? 3);
            setWaveformSensitivity(project.waveformSensitivity ?? 50);
            setVisualizerColor(project.visualizerColor ?? 'Amber');
            setTimelineCommands({}); // Reset

            // Analyze audio for beats
            analyzeAudioForBeats(project.videoUrl).then(detectedBeats => {
                setBeats(detectedBeats);
            });

            if (project.prompt.toLowerCase().includes("glitch")) {
                setVqaScore(82);
                setVqaIssues(['Flicker Detected', 'Minor Sync Drift']);
            } else {
                setVqaScore(96);
                setVqaIssues([]);
            }
        }
        const videoElement = videoRef.current;
        const handleTimeUpdate = () => {
            if (videoElement) setCurrentTime(videoElement.currentTime);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleLoadedMetadata = () => {
            if (videoElement) setDuration(videoElement.duration);
        };
        const handleVolumeChangeOnElement = () => {
            if (videoElement) {
                setVolume(videoElement.volume);
                setIsMuted(videoElement.muted);
            }
        };


        if(videoElement) {
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            videoElement.addEventListener('play', handlePlay);
            videoElement.addEventListener('pause', handlePause);
            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
            videoElement.addEventListener('volumechange', handleVolumeChangeOnElement);
        }
        return () => {
             if(videoElement) {
                videoElement.removeEventListener('timeupdate', handleTimeUpdate);
                videoElement.removeEventListener('play', handlePlay);
                videoElement.removeEventListener('pause', handlePause);
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
                videoElement.removeEventListener('volumechange', handleVolumeChangeOnElement);
            }
        }
    }, [project, analyzeAudioForBeats]);

     // Effect to trigger the pulse animation
    useEffect(() => {
        const activeBeat = beats.find(beat => Math.abs(currentTime - beat.timestamp) < 0.1);

        if (isBeatSyncEnabled && activeBeat && activeBeat.timestamp !== lastPulsedBeatRef.current) {
            lastPulsedBeatRef.current = activeBeat.timestamp;

            // Calculate dynamic pulse style based on beat and sync intensity
            const pulseScale = 1 + (syncIntensity / 100) * 0.05 * activeBeat.intensity;
            const shadowOpacity = (syncIntensity / 100) * 0.7 * activeBeat.intensity;
            
            setBeatPulseStyle({
                '--beat-pulse-scale': pulseScale,
                '--beat-pulse-shadow-opacity': shadowOpacity,
            } as React.CSSProperties);

            setIsPulsing(true);
        }
    }, [currentTime, beats, isBeatSyncEnabled, syncIntensity]);

    // Effect to remove the pulse animation class after it completes
    useEffect(() => {
        if (isPulsing) {
            const timer = setTimeout(() => setIsPulsing(false), 400); // Must match animation duration
            return () => clearTimeout(timer);
        }
    }, [isPulsing]);

     const handleBeatClick = (event: React.MouseEvent, timestamp: number) => {
        setCommandMenu({ visible: true, x: event.clientX, y: event.clientY, timestamp });
    };

    const handleSelectCommand = (command: string) => {
        if (commandMenu) {
            if (command === '__REMOVE__') {
                const newCommands = { ...timelineCommands };
                delete newCommands[commandMenu.timestamp];
                setTimelineCommands(newCommands);
            } else {
                setTimelineCommands(prev => ({ ...prev, [commandMenu.timestamp]: command }));
            }
        }
        setCommandMenu(null);
    };
    
    const handleZoomChange = (newZoom: number) => {
        setZoom(newZoom);
        setIsZooming(true);
        if (zoomTimeoutRef.current) {
            clearTimeout(zoomTimeoutRef.current);
        }
        zoomTimeoutRef.current = window.setTimeout(() => {
            setIsZooming(false);
        }, 500); // Glow lasts for 500ms
    };

    const handleScrubStart = () => {
        if (videoRef.current) {
            wasPlayingBeforeScrub.current = !videoRef.current.paused;
            if (wasPlayingBeforeScrub.current) {
                videoRef.current.pause();
            }
        }
    };
    
    const handleScrub = (newTime: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = newTime;
            setCurrentTime(newTime);
        }
    };

    const handleScrubEnd = () => {
        if (wasPlayingBeforeScrub.current && videoRef.current) {
            videoRef.current.play();
        }
    };
    
    // Video Playback Handlers
    const handlePlayPause = () => {
        if (videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
        }
    };

    const handleVolumeChange = (newVolume: number) => {
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
            if (newVolume > 0 && videoRef.current.muted) {
                videoRef.current.muted = false;
            }
        }
    };

    const handleMuteToggle = () => {
        if (videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
        }
    };


    const handleVisualizerChange = (style: VisualizerStyle) => {
        if (!project) return;
        setVisualizerStyle(style);
        const updated = { ...project, visualizerStyle: style };
        updateProject(updated); // Persist the change
    };
    
    const handleApplyCinematicControls = async () => {
        if (!project || generationStatus === 'PROCESSING') return;

        setGenerationStatus('PROCESSING');
        setError(null);
        setProgressMessage('Applying new cinematic effects...');

        try {
            let basePrompt = project.prompt;
            const cinematicKeys = [
                ". Cinematic Mood Vibrancy:", ". Audio Sync Intensity:", 
                ". Zoom:", ". Pan:", ". Tilt:", ". Depth of Field:", ". Camera:", ". Audio Mix:"
            ];
            cinematicKeys.forEach(key => {
                const regex = new RegExp(key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + ".*", "g");
                basePrompt = basePrompt.replace(regex, '');
            });

            const newSettings = `Camera: Zoom ${zoom}%, Pan ${pan}, Tilt ${tilt}, Depth of Field ${depthOfField}. Audio Mix: Drums ${volumeMix.drums}%, Vocals ${volumeMix.vocals}%, Bass ${volumeMix.bass}%, Melody ${volumeMix.melody}%. Cinematic Mood Vibrancy: ${moodVibrancy}/100. Audio Sync Intensity: ${syncIntensity}/100.`;
            const newPrompt = `${basePrompt.trim()} ${newSettings}`;

            const { videoUrl, veoVideo } = await regenerateVideo(
                newPrompt,
                project.resolution,
                project.aspectRatio,
                setProgressMessage
            );

            const updated: Project = {
                ...project,
                prompt: newPrompt, videoUrl, veoVideo,
                moodVibrancy, syncIntensity, zoom, pan, tilt, depthOfField, volumeMix, isBeatSyncEnabled,
                visualizerStyle, waveformThickness, waveformSensitivity, visualizerColor
            };
            
            setProgressMessage("Success! Effects applied.");
            setNewVideoDownloadUrl(videoUrl);
            updateProject(updated);
            setGenerationStatus('SUCCESS');

        } catch (e) {
             if (typeof Sentry !== 'undefined') {
                Sentry.captureException(e);
            }
            const err = e as Error;
            setError(err.message || "An unknown error occurred while applying effects.");
            setGenerationStatus('IDLE');
        }
    };

    // --- Voiceover Helpers ---
    function decode(base64: string) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    function createWavBlob(pcmData: Uint8Array): Blob {
        const sampleRate = 24000;
        const numChannels = 1;
        const bitsPerSample = 16;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const byteRate = sampleRate * blockAlign;
        const dataSize = pcmData.length;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);

        // RIFF header
        view.setUint32(0, 0x52494646, false); // "RIFF"
        view.setUint32(4, 36 + dataSize, true);
        view.setUint32(8, 0x57415645, false); // "WAVE"
        // fmt chunk
        view.setUint32(12, 0x666d7420, false); // "fmt "
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        // data chunk
        view.setUint32(36, 0x64617461, false); // "data"
        view.setUint32(40, dataSize, true);

        // PCM data
        const pcmAsInt16 = new Int16Array(pcmData.buffer);
        for (let i = 0; i < pcmAsInt16.length; i++) {
            view.setInt16(44 + i * 2, pcmAsInt16[i], true);
        }

        return new Blob([view], { type: 'audio/wav' });
    }
    
    const handleGenerateVoiceover = async () => {
        if (!voiceoverScript.trim() || isGeneratingVoiceover) return;
        
        setIsGeneratingVoiceover(true);
        setVoiceoverError(null);
        setGeneratedVoiceoverUrl(null);

        try {
            const base64Audio = await generateSpeech(voiceoverScript, selectedVoice);
            const pcmData = decode(base64Audio);
            const wavBlob = createWavBlob(pcmData);
            const url = URL.createObjectURL(wavBlob);
            setGeneratedVoiceoverUrl(url);
        } catch(e) {
            const err = e as Error;
            setVoiceoverError(err.message || 'An unknown error occurred.');
        } finally {
            setIsGeneratingVoiceover(false);
        }
    };
    
    // --- AI Suggestion Handlers ---
    const handleSuggestPolish = async () => {
        if (!project || isSuggestingPolish) return;
        setIsSuggestingPolish(true);
        try {
            const suggestions = await getStudioSuggestions(project.prompt);
            setMoodVibrancy(suggestions.moodVibrancy);
            setSyncIntensity(suggestions.syncIntensity);
        } catch (e) {
            console.error("Failed to get polish suggestions", e);
            // Optionally set an error state to show in the UI
        } finally {
            setIsSuggestingPolish(false);
        }
    };

    const handleSuggestScript = async () => {
        if (!project || isSuggestingScript) return;
        setIsSuggestingScript(true);
        try {
            const script = await generateVoiceoverScript(project.prompt);
            setVoiceoverScript(script);
        } catch (e) {
            console.error("Failed to generate script", e);
            setVoiceoverError("Failed to generate script.");
        } finally {
            setIsSuggestingScript(false);
        }
    };

    const assistantControls = {
        setZoom: handleZoomChange,
        setPan,
        setTilt,
        setMoodVibrancy,
        setSyncIntensity,
        setVolumeMix,
        handleVisualizerChange,
        setDepthOfField,
    };

    const assistantState = {
        zoom,
        pan,
        tilt,
        moodVibrancy,
        syncIntensity,
        volumeMix,
        depthOfField,
    };
    
    const colorToHex = (colorName: string) => {
        switch (colorName) {
            case 'Aqua': return '#2DD4BF';
            case 'Crimson': return '#F43F5E';
            case 'Amber':
            default: return '#FBBF24';
        }
    };

    const ExportModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
        const [exportResolution, setExportResolution] = useState<'720p' | '1080p'>(project?.resolution || '1080p');
        const [exportAspectRatio, setExportAspectRatio] = useState<'16:9' | '9:16'>(project?.aspectRatio || '16:9');
        
        const handleExport = async () => {
            if (!project) return;
            onClose(); // Close modal immediately
            setGenerationStatus('PROCESSING');
            setError(null);
            setProgressMessage(`Initializing ${exportResolution} export...`);

            try {
                const { videoUrl, veoVideo, resolution, aspectRatio } = await regenerateVideo(
                    project.prompt, exportResolution, exportAspectRatio, setProgressMessage
                );
                const updated: Project = { ...project, videoUrl, veoVideo, resolution, aspectRatio };
                setProgressMessage("Success! Your new video is ready.");
                setNewVideoDownloadUrl(videoUrl);
                updateProject(updated);
                setGenerationStatus('SUCCESS');
            } catch (e) {
                 if (typeof Sentry !== 'undefined') {
                    Sentry.captureException(e);
                }
                const err = e as Error;
                setError(err.message || "An unknown error occurred during the export.");
                setGenerationStatus('IDLE');
            }
        };

        return (
             <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-fadeIn" onClick={onClose}>
                <div className="bg-[#1E1E1E] border border-amber-500 rounded-lg shadow-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-2xl font-bold text-amber-400">Export Project</h2>
                    <p className="text-gray-400 mt-1">Select your desired output settings.</p>
                    <div className="my-6 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">Resolution</label>
                            <div className="flex gap-2">
                               <button onClick={() => setExportResolution('720p')} className={`flex-1 p-3 text-sm rounded-md font-semibold transition-all ${exportResolution === '720p' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>720p (Fast)</button>
                               <button onClick={() => setExportResolution('1080p')} className={`flex-1 p-3 text-sm rounded-md font-semibold transition-all ${exportResolution === '1080p' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>1080p (HD)</button>
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-300 block mb-2">Aspect Ratio</label>
                            <div className="flex gap-2">
                               <button onClick={() => setExportAspectRatio('16:9')} className={`flex-1 p-3 text-sm rounded-md font-semibold transition-all ${exportAspectRatio === '16:9' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>Landscape (16:9)</button>
                               <button onClick={() => setExportAspectRatio('9:16')} className={`flex-1 p-3 text-sm rounded-md font-semibold transition-all ${exportAspectRatio === '9:16' ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}>Portrait (9:16)</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4">
                        <button onClick={onClose} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600">Cancel</button>
                        <button onClick={handleExport} className="bg-amber-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-amber-400 btn-glow">Render & Export</button>
                    </div>
                </div>
            </div>
        )
    };
    
    const CollapsibleSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }> = ({ title, icon, children, defaultOpen = true }) => {
        const [isOpen, setIsOpen] = useState(defaultOpen);

        return (
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-lg"
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center gap-2">
                        {icon}
                        <h3 className="font-semibold text-lg text-amber-400">{title}</h3>
                    </div>
                    <svg className={`w-5 h-5 text-gray-400 transform transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px]' : 'max-h-0'}`}>
                     <div className="p-4 pt-0 space-y-4">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    const SliderControl: React.FC<{ label: string, value: number, min: number, max: number, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, unit?: string }> = 
    ({ label, value, min, max, onChange, unit="" }) => (
        <div>
            <label className="text-sm font-medium text-gray-400">{label} ({value}{unit})</label>
            <input type="range" min={min} max={max} value={value} onChange={onChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg accent-amber-500" />
        </div>
    );

    const ToggleSwitch: React.FC<{ label: string; enabled: boolean; onChange: (enabled: boolean) => void }> = ({ label, enabled, onChange }) => (
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-400">{label}</span>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-amber-500 ${enabled ? 'bg-amber-500' : 'bg-gray-600'}`}
            >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
        </div>
    );
    
    const videoGlowClass = isZooming ? 'video-glow' : (isPlaying && zoom > 50) ? 'video-zoom-sync-glow' : '';
    const videoPulseClass = isPulsing ? 'beat-video-pulse-active' : '';
    const videoScale = 1 + zoom / 200;

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <h1 className="text-2xl font-bold text-gray-300">M2V Studio</h1>
                <p className="mt-2">Select a project from your Library to begin editing.</p>
            </div>
        );
    }

    return (
      <div className="max-w-full mx-auto h-full flex flex-col relative">
        <header className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
          <h1 className="text-2xl md:text-3xl font-black text-white truncate">M2V Studio: {project.name}</h1>
          <div className="flex items-center gap-3">
            <button disabled className="bg-gray-700 text-gray-400 font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-not-allowed hidden sm:flex">
                <SaveIcon className="w-5 h-5"/> Save
            </button>
            <button onClick={() => setShowExportModal(true)} className="bg-amber-500 text-black font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-amber-400 btn-glow text-sm sm:text-base">
                Export
            </button>
          </div>
        </header>

        {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-400 p-3 rounded-lg mb-4 flex justify-between items-center animate-fadeIn text-sm">
                <span><strong>Error:</strong> {error}</span>
                <button onClick={() => setError(null)} className="font-bold rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
            </div>
        )}
        
        {generationStatus === 'PROCESSING' ? (
             <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg p-8 text-center flex flex-col items-center justify-center flex-1">
                <LogoIcon className="w-24 h-24 animate-pulse"/>
                <h2 className="text-2xl font-bold text-white mt-4">Processing Your Request...</h2>
                <p className="text-amber-400 font-mono mt-2">{progressMessage}</p>
             </div>
        ) : generationStatus === 'SUCCESS' ? (
            <div className="bg-[#1E1E1E] border border-gray-800 rounded-lg p-8 text-center flex flex-col items-center justify-center flex-1 animate-fadeIn">
                <h2 className="text-3xl font-bold text-green-400">{progressMessage}</h2>
                <video src={project?.videoUrl} controls autoPlay loop className="w-full max-w-2xl rounded-lg shadow-2xl mx-auto my-4" />
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
                    <a href={newVideoDownloadUrl!} download={`${project?.name}_export.mp4`} className="bg-green-500 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-400 transition-colors text-lg btn-glow inline-flex items-center justify-center gap-2">
                       <DownloadIcon className="w-6 h-6"/> Download Video
                    </a>
                    <button onClick={() => setGenerationStatus('IDLE')} className="bg-gray-700 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-600 transition-colors text-lg">Return to Studio</button>
                </div>
            </div>
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0 gap-6">
                {/* Left: Storyboard - hidden on mobile, takes space on desktop */}
                <div className="w-full lg:w-1/4 lg:max-w-xs hidden lg:block">
                    <Storyboard project={project} />
                </div>
                
                {/* Center: Preview - flex-1 to take available space */}
                <div className="w-full lg:flex-1 flex flex-col relative group">
                    <video 
                        ref={videoRef} 
                        src={project.videoUrl} 
                        autoPlay 
                        loop
                        muted={isMuted}
                        onClick={handlePlayPause}
                        className={`w-full rounded-lg shadow-2xl bg-black aspect-video transition-shadow duration-300 cursor-pointer ${videoGlowClass} ${videoPulseClass}`}
                        style={{ ...beatPulseStyle, '--video-zoom-scale': videoScale } as React.CSSProperties}
                    />
                    <VideoControls
                        isPlaying={isPlaying}
                        onPlayPause={handlePlayPause}
                        currentTime={currentTime}
                        duration={duration}
                        onSeek={handleScrub}
                        onSeekStart={handleScrubStart}
                        onSeekEnd={handleScrubEnd}
                        volume={volume}
                        onVolumeChange={handleVolumeChange}
                        isMuted={isMuted}
                        onMuteToggle={handleMuteToggle}
                    />
                </div>

                {/* Right: Controls - full width on mobile, fixed on desktop */}
                <div className="w-full lg:w-1/4 lg:max-w-xs space-y-4 lg:overflow-y-auto lg:pr-2">
                    <CollapsibleSection title="Camera Controls" icon={<CameraIcon className="w-6 h-6 text-amber-400" />}>
                        <SliderControl label="Zoom" value={zoom} min={0} max={100} onChange={e => handleZoomChange(Number(e.target.value))} unit="%"/>
                        <SliderControl label="Pan" value={pan} min={-50} max={50} onChange={e => setPan(Number(e.target.value))} />
                        <SliderControl label="Tilt" value={tilt} min={-50} max={50} onChange={e => setTilt(Number(e.target.value))} />
                        <div>
                            <label className="text-sm font-medium text-gray-400">Depth of Field</label>
                            <select value={depthOfField} onChange={e => setDepthOfField(e.target.value as any)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-amber-500 focus:border-amber-500">
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                            </select>
                        </div>
                    </CollapsibleSection>

                     <CollapsibleSection title="Audio Mixing" icon={<AnalyticsIcon className="w-6 h-6 text-amber-400" />}>
                        <SliderControl label="Drums" value={volumeMix.drums} min={0} max={100} onChange={e => setVolumeMix(v => ({...v, drums: Number(e.target.value)}))} />
                        <SliderControl label="Vocals" value={volumeMix.vocals} min={0} max={100} onChange={e => setVolumeMix(v => ({...v, vocals: Number(e.target.value)}))} />
                        <SliderControl label="Bass" value={volumeMix.bass} min={0} max={100} onChange={e => setVolumeMix(v => ({...v, bass: Number(e.target.value)}))} />
                        <SliderControl label="Melody" value={volumeMix.melody} min={0} max={100} onChange={e => setVolumeMix(v => ({...v, melody: Number(e.target.value)}))} />
                    </CollapsibleSection>

                    <CollapsibleSection title="AI Polish" icon={<SparklesIcon className="w-6 h-6 text-amber-400" />}>
                        <SliderControl label="Mood Vibrancy" value={moodVibrancy} min={0} max={100} onChange={e => setMoodVibrancy(Number(e.target.value))} />
                        <SliderControl label="Sync Intensity" value={syncIntensity} min={0} max={100} onChange={e => setSyncIntensity(Number(e.target.value))} />
                        <ToggleSwitch label="Beat Sync" enabled={isBeatSyncEnabled} onChange={setIsBeatSyncEnabled} />
                        <div className="flex gap-2">
                             <button onClick={handleSuggestPolish} disabled={isSuggestingPolish} className="w-full bg-gray-700 text-amber-400 font-bold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-wait">
                                <SparklesIcon className="w-4 h-4" /> {isSuggestingPolish ? 'Thinking...' : 'Suggest'}
                            </button>
                             <button onClick={handleApplyCinematicControls} disabled={generationStatus === 'PROCESSING'} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed btn-glow">
                                Apply
                            </button>
                        </div>
                    </CollapsibleSection>
                    
                     <CollapsibleSection title="AI Voiceover" icon={<MicrophoneIcon className="w-6 h-6 text-amber-400" />} defaultOpen={false}>
                        <div>
                            <label className="text-sm font-medium text-gray-400">AI Voice</label>
                            <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:ring-amber-500 focus:border-amber-500">
                                {Object.entries(aiVoices).map(([apiKey, displayName]) => (
                                    <option key={apiKey} value={apiKey}>{displayName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-400">Narration Script</label>
                                <button onClick={handleSuggestScript} disabled={isSuggestingScript} className="text-xs text-amber-400 hover:text-white disabled:opacity-50 flex items-center gap-1">
                                    <SparklesIcon className="w-3 h-3" /> {isSuggestingScript ? 'Writing...' : 'Suggest Script'}
                                </button>
                            </div>
                            <textarea
                                value={voiceoverScript}
                                onChange={e => setVoiceoverScript(e.target.value)}
                                placeholder="Enter the narration script here..."
                                className="w-full mt-1 bg-gray-800 border-2 border-gray-700 rounded-lg p-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none h-24"
                                disabled={isGeneratingVoiceover || isSuggestingScript}
                            />
                        </div>
                        {voiceoverError && <p className="text-xs text-red-400">{voiceoverError}</p>}
                        {generatedVoiceoverUrl && (
                             <audio src={generatedVoiceoverUrl} controls className="w-full" />
                        )}
                        <button onClick={handleGenerateVoiceover} disabled={isGeneratingVoiceover || !voiceoverScript.trim()} className="w-full bg-amber-500 text-black font-bold py-2 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-gray-800 disabled:cursor-not-allowed btn-glow">
                            {isGeneratingVoiceover ? 'Generating...' : 'Generate & Preview'}
                        </button>
                    </CollapsibleSection>

                    <CollapsibleSection title="Timeline Visuals" icon={<FilterIcon className="w-6 h-6 text-amber-400" />}>
                        <div>
                            <label className="text-sm font-medium text-gray-400">Visualizer Style</label>
                            <div className="flex gap-2 mt-2">
                                {(['Waveform', 'Bars', 'Particles'] as VisualizerStyle[]).map(style => (
                                    <button
                                        key={style}
                                        onClick={() => handleVisualizerChange(style)}
                                        className={`flex-1 p-2 text-sm rounded-md font-semibold transition-all ${visualizerStyle === style ? 'bg-amber-500 text-black' : 'bg-gray-800 text-white'}`}
                                    >
                                        {style}
                                    </button>
                                ))}
                            </div>
                        </div>
                         {visualizerStyle === 'Waveform' && (
                            <div className="space-y-4 pt-4 border-t border-gray-700 mt-4">
                                <SliderControl label="Thickness" value={waveformThickness} min={1} max={10} onChange={e => setWaveformThickness(Number(e.target.value))} />
                                <SliderControl label="Sensitivity" value={waveformSensitivity} min={0} max={100} onChange={e => setWaveformSensitivity(Number(e.target.value))} unit="%"/>
                            </div>
                        )}
                        {(visualizerStyle === 'Bars' || visualizerStyle === 'Particles') && (
                            <div className="pt-4 border-t border-gray-700 mt-4">
                                <label className="text-sm font-medium text-gray-400">Color Palette</label>
                                <div className="flex gap-3 mt-2">
                                    {['Amber', 'Aqua', 'Crimson'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setVisualizerColor(color)}
                                            title={color}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${visualizerColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: colorToHex(color) }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CollapsibleSection>

                     <div className="bg-[#1E1E1E] border border-gray-800 p-4 rounded-lg">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="checkbox" checked={deepfakeConsent} onChange={e => setDeepfakeConsent(e.target.checked)} className="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-amber-500 focus:ring-amber-500" />
                            <span className="text-xs text-gray-400">I consent to the responsible use of generative AI and have the rights to all source material.</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div className="mt-4 relative">
                 {isAnalyzing && (
                    <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center rounded-lg backdrop-blur-sm">
                        <p className="text-amber-400 font-semibold animate-pulse">Analyzing audio for beats...</p>
                    </div>
                 )}
                 <Timeline 
                    duration={duration} 
                    beats={beats}
                    commands={timelineCommands}
                    onBeatClick={handleBeatClick}
                    currentTime={currentTime}
                    onScrubStart={handleScrubStart}
                    onScrub={handleScrub}
                    onScrubEnd={handleScrubEnd}
                    visualizerStyle={visualizerStyle}
                    syncIntensity={syncIntensity}
                    isBeatSyncEnabled={isBeatSyncEnabled}
                    waveformThickness={waveformThickness}
                    waveformSensitivity={waveformSensitivity}
                    visualizerColor={visualizerColor}
                />
            </div>
          </div>
        )}

        {commandMenu?.visible && (
            <CommandMenu
                position={{ x: commandMenu.x, y: commandMenu.y }}
                onSelect={handleSelectCommand}
                onClose={() => setCommandMenu(null)}
            />
        )}

        {showExportModal && <ExportModal onClose={() => setShowExportModal(false)} />}
        
        <button onClick={() => setIsAssistantOpen(true)} className="fixed bottom-24 right-6 md:bottom-6 md:right-6 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-purple-500 transition-transform hover:scale-110 btn-glow z-30">
            <ChatIcon className="w-8 h-8"/>
        </button>
        <AIAssistant 
            isOpen={isAssistantOpen}
            onClose={() => setIsAssistantOpen(false)}
            project={project}
            controls={assistantControls}
            currentState={assistantState}
        />
      </div>
    );
}

export default Studio;