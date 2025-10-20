import React from 'react';
import { PlayIcon, PauseIcon, VolumeUpIcon, VolumeOffIcon } from './icons';

interface VideoControlsProps {
    isPlaying: boolean;
    onPlayPause: () => void;
    currentTime: number;
    duration: number;
    onSeek: (time: number) => void;
    onSeekStart: () => void;
    onSeekEnd: () => void;
    volume: number;
    onVolumeChange: (volume: number) => void;
    isMuted: boolean;
    onMuteToggle: () => void;
}

const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const VideoControls: React.FC<VideoControlsProps> = ({
    isPlaying,
    onPlayPause,
    currentTime,
    duration,
    onSeek,
    onSeekStart,
    onSeekEnd,
    volume,
    onVolumeChange,
    isMuted,
    onMuteToggle,
}) => {

    const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSeek(Number(e.target.value));
    };
    
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onVolumeChange(Number(e.target.value));
    };

    return (
        <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm rounded-b-lg">
            <div className="flex items-center gap-4 text-white">
                <button onClick={onPlayPause} className="hover:text-amber-400">
                    {isPlaying ? <PauseIcon className="w-6 h-6" /> : <PlayIcon className="w-6 h-6" />}
                </button>

                <span className="text-xs font-mono w-10 text-center">{formatTime(currentTime)}</span>
                
                <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={handleSeekChange}
                    onMouseDown={onSeekStart}
                    onMouseUp={onSeekEnd}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-amber-500"
                />

                <span className="text-xs font-mono w-10 text-center">{formatTime(duration)}</span>
                
                <div className="flex items-center gap-2">
                    <button onClick={onMuteToggle} className="hover:text-amber-400">
                        {isMuted || volume === 0 ? <VolumeOffIcon className="w-6 h-6" /> : <VolumeUpIcon className="w-6 h-6" />}
                    </button>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer range-sm accent-amber-500 hidden sm:block"
                    />
                </div>
            </div>
        </div>
    );
};

export default VideoControls;
