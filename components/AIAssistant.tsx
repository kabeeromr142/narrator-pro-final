import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Project, ChatMessage, VisualizerStyle } from '../types';
import { startAIChatSession, sendChatMessage, getProactiveSuggestion } from '../services/geminiService';
import { CloseIcon, SendIcon, SparklesIcon } from './icons';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    project: Project | null;
    controls: {
        setZoom: (zoom: number) => void;
        setPan: (pan: number) => void;
        setTilt: (tilt: number) => void;
        setMoodVibrancy: (vibrancy: number) => void;
        setSyncIntensity: (intensity: number) => void;
        setVolumeMix: React.Dispatch<React.SetStateAction<{ drums: number; vocals: number; bass: number; melody: number }>>;
        handleVisualizerChange: (style: VisualizerStyle) => void;
        setDepthOfField: (depth: 'Low' | 'Medium' | 'High') => void;
    };
    currentState: {
        zoom: number;
        pan: number;
        tilt: number;
        moodVibrancy: number;
        syncIntensity: number;
        volumeMix: { drums: number; vocals: number; bass: number; melody: number };
        depthOfField: 'Low' | 'Medium' | 'High';
    };
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, project, controls, currentState }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && project) {
            startAIChatSession().then(() => {
                 setMessages([{ role: 'model', text: "Hello! I'm your AI Studio Assistant. How can I help you polish your video today?" }]);
                 
                 // Proactive suggestion
                 setTimeout(async () => {
                     const thinkingMessage: ChatMessage = { role: 'model', text: 'Analyzing your project for ideas...' };
                     setMessages(prev => [...prev, thinkingMessage]);
                     
                     const suggestion = await getProactiveSuggestion(project.prompt);
                     
                     setMessages(prev => {
                         // Replace the "thinking" message with the actual suggestion
                         const newMessages = [...prev];
                         const thinkingIndex = newMessages.findIndex(m => m.text === thinkingMessage.text);
                         if (thinkingIndex > -1) {
                             newMessages[thinkingIndex] = { role: 'model', text: suggestion };
                         } else { // Fallback if it was somehow removed
                             newMessages.push({ role: 'model', text: suggestion });
                         }
                         return newMessages;
                     });
                 }, 1000); // Small delay to feel more natural

            }).catch(error => {
                setMessages([{ role: 'model', text: `Sorry, I couldn't start up. Error: ${error.message}` }]);
            });
        } else {
             setMessages([]);
        }
    }, [isOpen, project]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const handleFunctionCall = useCallback((functionCall: any) => {
        const { name, args } = functionCall;
        console.log(`Executing function: ${name}`, args);

        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

        switch (name) {
            case 'update_camera_controls':
                if (args.zoom !== undefined) controls.setZoom(args.zoom);
                if (args.pan !== undefined) controls.setPan(args.pan);
                if (args.tilt !== undefined) controls.setTilt(args.tilt);
                if (args.depthOfField !== undefined) {
                    const validDepths = ['Low', 'Medium', 'High'];
                    if (validDepths.includes(args.depthOfField)) {
                        controls.setDepthOfField(args.depthOfField as 'Low' | 'Medium' | 'High');
                    }
                }
                break;
            case 'adjust_camera_controls':
                if (args.zoom_delta !== undefined) controls.setZoom(clamp(currentState.zoom + args.zoom_delta, 0, 100));
                if (args.pan_delta !== undefined) controls.setPan(clamp(currentState.pan + args.pan_delta, -50, 50));
                if (args.tilt_delta !== undefined) controls.setTilt(clamp(currentState.tilt + args.tilt_delta, -50, 50));
                break;
            case 'update_ai_polish':
                if (args.moodVibrancy !== undefined) controls.setMoodVibrancy(args.moodVibrancy);
                if (args.syncIntensity !== undefined) controls.setSyncIntensity(args.syncIntensity);
                break;
            case 'adjust_ai_polish':
                if (args.moodVibrancy_delta !== undefined) controls.setMoodVibrancy(clamp(currentState.moodVibrancy + args.moodVibrancy_delta, 0, 100));
                if (args.syncIntensity_delta !== undefined) controls.setSyncIntensity(clamp(currentState.syncIntensity + args.syncIntensity_delta, 0, 100));
                break;
            case 'update_audio_mix':
                 controls.setVolumeMix(prev => ({ ...prev, ...args }));
                 break;
            case 'adjust_audio_mix':
                controls.setVolumeMix(prev => ({
                    drums: args.drums_delta !== undefined ? clamp(prev.drums + args.drums_delta, 0, 100) : prev.drums,
                    vocals: args.vocals_delta !== undefined ? clamp(prev.vocals + args.vocals_delta, 0, 100) : prev.vocals,
                    bass: args.bass_delta !== undefined ? clamp(prev.bass + args.bass_delta, 0, 100) : prev.bass,
                    melody: args.melody_delta !== undefined ? clamp(prev.melody + args.melody_delta, 0, 100) : prev.melody,
                }));
                break;
            case 'change_visualizer':
                if (args.style && ['Waveform', 'Bars', 'Particles'].includes(args.style)) {
                    controls.handleVisualizerChange(args.style as VisualizerStyle);
                }
                break;
            default:
                console.warn(`Unknown function call: ${name}`);
        }
    }, [controls, currentState]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const newUserMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, newUserMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendChatMessage(input);
            
            if (response.functionCalls) {
                response.functionCalls.forEach(handleFunctionCall);
            }

            if (response.text) {
                const newModelMessage: ChatMessage = { role: 'model', text: response.text };
                setMessages(prev => [...prev, newModelMessage]);
            }

        } catch (error) {
            const err = error as Error;
            const errorMessage: ChatMessage = { role: 'model', text: `Sorry, I ran into an error: ${err.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-gray-900 border border-gray-800 rounded-lg shadow-2xl flex flex-col z-40 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-black/30 rounded-t-lg">
                <div className="flex items-center gap-2">
                    <SparklesIcon className="w-6 h-6 text-purple-400" />
                    <h3 className="font-bold text-white">AI Studio Assistant</h3>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-amber-500/10 text-amber-300' : 'bg-gray-800 text-gray-300'}`}>
                           <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isLoading && (
                     <div className="flex justify-start">
                        <div className="max-w-xs rounded-lg px-3 py-2 bg-gray-800 text-gray-300">
                           <div className="flex items-center gap-2">
                               <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                               <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                               <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                           </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 border-t border-gray-800">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g. Set pan to -20"
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="bg-amber-500 text-black p-2 rounded-lg hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed">
                        <SendIcon className="w-5 h-5" />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AIAssistant;
