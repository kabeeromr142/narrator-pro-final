import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Beat, VisualizerStyle } from '../types';

declare var lottie: any;

interface TimelineProps {
    duration: number;
    beats: Beat[];
    commands: Record<number, string>;
    currentTime: number;
    onBeatClick: (event: React.MouseEvent, timestamp: number) => void;
    onScrubStart: () => void;
    onScrub: (newTime: number) => void;
    onScrubEnd: () => void;
    visualizerStyle: VisualizerStyle;
    syncIntensity: number;
    isBeatSyncEnabled: boolean;
    waveformThickness: number;
    waveformSensitivity: number;
    visualizerColor: string;
}

const commandIconMap: Record<string, string> = {
    "Zoom In": "🔍",
    "Quick Cut": "✂️",
    "Pan Left": "⬅️",
    "DoF Blur": "💧",
    "Explosion": "💥"
};

const waveformLottieData = {"v":"5.5.7","fr":30,"ip":0,"op":150,"w":500,"h":80,"nm":"Waveform","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Wave","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[250,40,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0,0]],"o":[[0,0],[0,0]],"v":[[0,-20],[0,20]],"c":false},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"rp","nm":"Repeater 1","c":{"a":0,"k":100,"ix":3},"o":{"a":0,"k":0,"ix":4},"t":{"a":0,"k":0,"ix":5,"s":{"a":0,"k":5,"ix":6},"e":{"a":0,"k":100,"ix":7},"o":{"a":0,"k":0,"ix":8}},"hd":false},{"ty":"rd","nm":"Round Corners 1","r":{"a":0,"k":2,"ix":1},"hd":false},{"ty":"tm","s":{"a":0,"k":0,"ix":1},"e":{"a":1,"k":[{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":0,"s":[0]},{"i":{"x":[0.833],"y":[0.833]},"o":{"x":[0.167],"y":[0.167]},"t":30,"s":[99]},{"t":150,"s":[0]}],"ix":2},"o":{"a":0,"k":0,"ix":3},"m":1,"ix":2,"hd":false},{"ty":"fl","nm":"Fill 1","o":{"a":0,"k":100,"ix":5},"c":{"a":0,"k":[0.827,0.686,0.227,1],"ix":4},"r":1,"hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Repeater Group","np":4,"cix":2,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":180,"st":0,"bm":0}]};
const barsLottieData = {"v":"5.9.0","fr":30,"ip":0,"op":15,"w":500,"h":80,"nm":"Bars","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Bar","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[250,40,0],"ix":2},"a":{"a":0,"k":[250,40,0],"ix":1},"s":{"a":0,"k":[100,100,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"rc","d":1,"s":{"a":0,"k":[8,0],"ix":2},"p":{"a":0,"k":[0,40],"ix":3},"r":{"a":0,"k":2,"ix":4},"nm":"Bar Shape"},
{"ty":"tm","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":0,"s":[100,0]},{"t":7,"s":[100,100]},{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":15,"s":[100,0]}]}},
{"ty":"fl","c":{"a":0,"k":[0.98,0.73,0.2,1]},"o":{"a":0,"k":100},"r":1},
{"ty":"rp","c":{"a":0,"k":50},"o":{"a":0,"k":0},"t":{"p":{"a":0,"k":[10,0]}}}}]}]};
const particlesLottieData = {"v":"5.9.0","fr":30,"ip":0,"op":20,"w":500,"h":80,"nm":"Particles","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Particle Burst","sr":1,"ks":{"o":{"a":0,"k":100},"r":{"a":0,"k":0},"p":{"a":0,"k":[250,40,0]},"a":{"a":0,"k":[0,0]},"s":{"a":0,"k":[100,100]}},"ao":0,"shapes":[{"ty":"gr","it":[{"ty":"el","d":1,"s":{"a":0,"k":[5,5]},"p":{"a":0,"k":[0,0]}},
{"ty":"fl","c":{"a":0,"k":[1,0.8,0.4,1]}},
{"ty":"tr","s":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":0,"s":[0,0]},{"t":20,"s":[200,200]}]},"o":{"a":1,"k":[{"i":{"x":[0.667],"y":[1]},"o":{"x":[0.333],"y":[0]},"t":5,"s":[100]},{"t":20,"s":[0]}]}},
{"ty":"rp","c":{"a":0,"k":12},"o":{"a":0,"k":0},"t":{"r":{"a":0,"k":30}}}}]}]};

const LottieWaveform: React.FC<{ currentTime: number; duration: number; animationData: any; }> = ({ currentTime, duration, animationData }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<any>(null);

    useEffect(() => {
        if (containerRef.current) {
            if(animRef.current) {
                animRef.current.destroy();
                animRef.current = null;
            }
            animRef.current = lottie.loadAnimation({
                container: containerRef.current,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData: animationData,
            });
        }
        return () => {
            if (animRef.current) {
                animRef.current.destroy();
                animRef.current = null;
            }
        };
    }, [animationData]);

    useEffect(() => {
        if (animRef.current && duration > 0) {
            const totalFrames = animRef.current.totalFrames;
            const currentFrame = (currentTime / duration) * totalFrames;
            animRef.current.goToAndStop(currentFrame, true);
        }
    }, [currentTime, duration]);

    return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
};

interface BeatReactiveVisualizerProps {
    animationData: any;
    activeBeat: Beat | null;
    syncIntensity: number;
}

const BeatReactiveVisualizer: React.FC<BeatReactiveVisualizerProps> = ({ animationData, activeBeat, syncIntensity }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const animRef = useRef<any>(null);
    const [scale, setScale] = useState(1); // State for scaling based on bass

    useEffect(() => {
        if (containerRef.current && !animRef.current) {
            animRef.current = lottie.loadAnimation({
                container: containerRef.current,
                renderer: 'svg',
                loop: false,
                autoplay: false,
                animationData,
            });
        }
        return () => {
            if (animRef.current) {
                animRef.current.destroy();
                animRef.current = null;
            }
        };
    }, [animationData]);

    useEffect(() => {
        if (activeBeat && animRef.current) {
            const intensityFactor = syncIntensity / 50.0; // Use 50 as the baseline for 1x effect

            // Speed is tied to overall intensity for more dynamic animation playback
            const speed = 1 + activeBeat.intensity * 1.5 * intensityFactor;
            animRef.current.setSpeed(Math.max(0.1, speed)); // Prevent speed from being <= 0
            animRef.current.goToAndPlay(0, true);
            
            // Scale is tied to bass intensity for a more impactful visual punch
            const scaleAmount = 1 + activeBeat.bassIntensity * 0.4 * intensityFactor;
            setScale(scaleAmount);
            
            // Reset scale after the pulse animation completes
            const timer = setTimeout(() => setScale(1), 300);
            return () => clearTimeout(timer);
        }
    }, [activeBeat, syncIntensity]);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 w-full h-full transition-transform duration-150 ease-out"
            style={{ transform: `scale(${scale})` }}
        />
    );
};

const colorNameToRgbArray = (colorName: string): [number, number, number, number] => {
    switch (colorName) {
        case 'Aqua': return [0.176, 0.831, 0.749, 1]; // #2DD4BF
        case 'Crimson': return [0.957, 0.247, 0.369, 1]; // #F43F5E
        case 'Amber':
        default: return [0.984, 0.749, 0.141, 1]; // #FBBF24
    }
};

// Deep clone is necessary to not mutate the original Lottie data object
const deepClone = (obj: any) => JSON.parse(JSON.stringify(obj));

const modifyLottieColors = (data: any, newColor: [number, number, number, number]): any => {
    const newData = deepClone(data);
    const findAndReplace = (obj: any) => {
        if (obj && obj.c && obj.c.k && Array.isArray(obj.c.k) && obj.c.k.length === 4) {
            // This is a heuristic for finding color properties [r,g,b,a] normalized to 1.
            obj.c.k = newColor;
        }
        for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                findAndReplace(obj[key]);
            }
        }
    };
    findAndReplace(newData.layers);
    return newData;
};

const modifyWaveformLottie = (data: any, thickness: number, color: [number, number, number, number]): any => {
    const newData = deepClone(data);
    try {
        const shapeGroup = newData.layers[0].shapes[0].it;
        const fillIndex = shapeGroup.findIndex((item: any) => item.ty === 'fl');
        if (fillIndex > -1) {
            // Replace fill with a stroke to control thickness
            shapeGroup[fillIndex] = {
                "ty": "st",
                "nm": "Dynamic Stroke",
                "o": { "a": 0, "k": 100 },
                "c": { "a": 0, "k": color },
                "w": { "a": 0, "k": thickness }
            };
        }
    } catch (e) {
        console.error("Failed to modify waveform lottie data", e);
    }
    return newData;
};


const Timeline: React.FC<TimelineProps> = ({ duration, beats, commands, currentTime, onBeatClick, onScrubStart, onScrub, onScrubEnd, visualizerStyle, syncIntensity, isBeatSyncEnabled, waveformThickness, waveformSensitivity, visualizerColor }) => {
    const timelineRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [waveformPulse, setWaveformPulse] = useState(1); // State for waveform pulsing

    const activeBeat = isBeatSyncEnabled ? beats.find(beat => Math.abs(currentTime - beat.timestamp) < 0.1) || null : null;
    
    // Effect for the waveform pulse
    useEffect(() => {
        if (visualizerStyle === 'Waveform' && activeBeat) {
            // Create a pulse effect based on the beat's overall intensity and sensitivity
            const pulseMultiplier = 0.15 * (waveformSensitivity / 50.0);
            setWaveformPulse(1 + activeBeat.intensity * pulseMultiplier);
            
            // Reset after a short duration to complete the pulse animation
            const timer = setTimeout(() => {
                setWaveformPulse(1);
            }, 150);
            
            return () => clearTimeout(timer);
        }
    }, [activeBeat, visualizerStyle, waveformSensitivity]);

    const calculateTimeFromX = (clientX: number) => {
        if (!timelineRef.current) return 0;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        return percentage * duration;
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        onScrub(calculateTimeFromX(e.clientX));
    }, [duration, onScrub]);

    const handleMouseUp = useCallback((e: MouseEvent) => {
        setIsScrubbing(false);
        onScrubEnd();
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove, onScrubEnd]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Prevent beat click from firing
        if ((e.target as HTMLElement).closest('button')) return;
        setIsScrubbing(true);
        onScrubStart();
        onScrub(calculateTimeFromX(e.clientX));
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

     const modifiedAnimationData = useMemo(() => {
        const colorRgb = colorNameToRgbArray(visualizerColor);
        switch (visualizerStyle) {
            case 'Waveform':
                return modifyWaveformLottie(waveformLottieData, waveformThickness, colorRgb);
            case 'Bars':
                return modifyLottieColors(barsLottieData, colorRgb);
            case 'Particles':
                return modifyLottieColors(particlesLottieData, colorRgb);
            default:
                return waveformLottieData;
        }
    }, [visualizerStyle, visualizerColor, waveformThickness]);

    const renderVisualizer = () => {
        const key = `${visualizerStyle}-${visualizerColor}-${waveformThickness}`;
        switch(visualizerStyle) {
            case 'Bars':
                return <BeatReactiveVisualizer key={key} animationData={modifiedAnimationData} activeBeat={activeBeat} syncIntensity={syncIntensity} />;
            case 'Particles':
                return <BeatReactiveVisualizer key={key} animationData={modifiedAnimationData} activeBeat={activeBeat} syncIntensity={syncIntensity} />;
            case 'Waveform':
            default:
                return (
                    <div 
                        key={key}
                        className="w-full h-full absolute inset-0 transition-transform duration-100 ease-in-out"
                        style={{ transform: `scaleY(${waveformPulse})`, transformOrigin: 'center' }}
                    >
                        <LottieWaveform animationData={modifiedAnimationData} currentTime={currentTime} duration={duration} />
                    </div>
                );
        }
    };

    return (
        <div 
            ref={timelineRef}
            onMouseDown={handleMouseDown}
            className="w-full h-20 bg-[#1E1E1E] border border-gray-800 rounded-lg p-2 relative select-none cursor-pointer">
            <div className="w-full h-full bg-gray-900/50 rounded relative overflow-hidden pointer-events-none">
                {renderVisualizer()}
                {/* Beats */}
                {isBeatSyncEnabled && beats.map(beat => {
                    const isActive = beat === activeBeat;
                    // Make bass beats bigger/more prominent
                    const sizeMultiplier = beat.bassIntensity > 0.5 ? 1.2 : 1;
                    const baseSize = (8 + (beat.intensity - 0.5) * 12) * sizeMultiplier;
                    const baseClasses = "rounded-full cursor-pointer transition-all duration-100 transform-gpu";
                    const colorClass = beat.bassIntensity > 0.5 ? "bg-red-500/80" : "bg-amber-400/80";
                    const animationClass = isActive ? 'beat-active' : 'animate-beat-pulse';
                    
                    return (
                        <div key={beat.timestamp} style={{ left: `${(beat.timestamp / duration) * 100}%`, transform: 'translateX(-50%)' }} className="absolute top-0 h-full flex items-center z-10 pointer-events-auto">
                            <button 
                                onClick={(e) => onBeatClick(e, beat.timestamp)}
                                className={`${baseClasses} ${colorClass} ${animationClass}`}
                                style={{
                                    width: `${baseSize}px`,
                                    height: `${baseSize}px`,
                                }}
                                title={`Beat at ${beat.timestamp.toFixed(2)}s (Intensity: ${beat.intensity.toFixed(2)})`}
                            />
                            {commands[beat.timestamp] && (
                                <div className="absolute -top-1 text-lg pointer-events-none" style={{ transform: 'translateX(-50%)' }} title={commands[beat.timestamp]}>
                                    {commandIconMap[commands[beat.timestamp]] || '🎬'}
                                </div>
                            )}
                        </div>
                    );
                })}
                
                {/* Playhead */}
                <div 
                    className="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"
                    style={{ 
                        left: `${(currentTime / duration) * 100}%`,
                        transition: isScrubbing ? 'none' : 'left 0.1s linear'
                    }}
                >
                     <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
            </div>
        </div>
    );
};

export default Timeline;