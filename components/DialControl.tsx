import React, { useRef, useCallback, useState, useEffect } from 'react';

declare var lottie: any;

interface DialControlProps {
    label: string;
    value: number;
    min: number;
    max: number;
    onChange: (value: number) => void;
}

const dialLottieData = {"v":"5.5.7","fr":60,"ip":0,"op":60,"w":100,"h":100,"nm":"Dial Arrow","ddd":0,"assets":[],"layers":[{"ddd":0,"ind":1,"ty":4,"nm":"Arrow","sr":1,"ks":{"o":{"a":0,"k":100,"ix":11},"r":{"a":0,"k":0,"ix":10},"p":{"a":0,"k":[50,15,0],"ix":2},"a":{"a":0,"k":[0,0,0],"ix":1},"s":{"a":0,"k":[80,80,100],"ix":6}},"ao":0,"shapes":[{"ty":"gr","it":[{"ind":0,"ty":"sh","ix":1,"ks":{"a":0,"k":{"i":[[0,0],[0.92,0],[-0.92,0]],"o":[[-0.92,0],[0.92,0],[0,0]],"v":[[-1.675,2.89],[-3.35,0],[0,0]],"c":true},"ix":2},"nm":"Path 1","mn":"ADBE Vector Shape - Group","hd":false},{"ty":"fl","nm":"Fill 1","o":{"a":0,"k":100,"ix":5},"c":{"a":0,"k":[0.827,0.686,0.227,1],"ix":4},"r":1,"hd":false},{"ty":"tr","p":{"a":0,"k":[0,0],"ix":2},"a":{"a":0,"k":[0,0],"ix":1},"s":{"a":0,"k":[100,100],"ix":3},"r":{"a":0,"k":0,"ix":6},"o":{"a":0,"k":100,"ix":7},"sk":{"a":0,"k":0,"ix":4},"sa":{"a":0,"k":0,"ix":5},"nm":"Transform"}],"nm":"Group 1","np":3,"cix":2,"ix":1,"mn":"ADBE Vector Group","hd":false}],"ip":0,"op":60,"st":0,"bm":0}]};

const LottieDialIndicator: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current) {
            const anim = lottie.loadAnimation({
                container: containerRef.current,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                animationData: dialLottieData,
            });
            return () => anim.destroy();
        }
    }, []);

    return <div ref={containerRef} className="w-full h-full" />;
};


const DialControl: React.FC<DialControlProps> = ({ label, value, min, max, onChange }) => {
    const dialRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const valueToAngle = (val: number) => {
        const percentage = (val - min) / (max - min);
        // Map to a 270-degree arc (-135 to +135)
        return percentage * 270 - 135;
    };
    
    const angleToValue = (angle: number) => {
        // Normalize angle to be within -180 to 180
        let normalizedAngle = (angle + 360) % 360;
        if (normalizedAngle > 180) {
            normalizedAngle -= 360;
        }
        
        // Clamp angle to the -135 to 135 range
        let clampedAngle = Math.max(-135, Math.min(135, normalizedAngle));
        const percentage = (clampedAngle + 135) / 270;
        return Math.round(percentage * (max - min) + min);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dialRef.current) return;

        const rect = dialRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const angleDeg = angleRad * (180 / Math.PI) - 90; // Adjust for top-center 0
        
        onChange(angleToValue(angleDeg));

    }, [isDragging, min, max, onChange]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        document.body.style.cursor = 'default';
    }, []);
    
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        document.body.style.cursor = 'grabbing';
    };

    const rotation = valueToAngle(value);

    return (
        <div className="flex flex-col items-center space-y-2">
            <div className="dial" ref={dialRef}>
                <div className="dial-ticks">
                    {Array.from({ length: 11 }).map((_, i) => (
                        <div 
                            key={i} 
                            className="dial-tick"
                            style={{ transform: `rotate(${i * (270 / 10) - 135}deg)` }}
                        ></div>
                    ))}
                </div>
                <div 
                    className="absolute w-full h-full rounded-full cursor-grab" 
                    onMouseDown={handleMouseDown}
                    style={{ transform: `rotate(${rotation}deg)`, transformOrigin: 'center' }}
                >
                    <LottieDialIndicator />
                </div>
            </div>
            <label className="text-sm font-medium text-gray-400">{label} ({value})</label>
        </div>
    );
};

export default DialControl;