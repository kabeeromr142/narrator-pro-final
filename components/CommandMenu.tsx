import React, { useEffect, useRef } from 'react';

interface CommandMenuProps {
    position: { x: number, y: number };
    onSelect: (command: string) => void;
    onClose: () => void;
}

const commands = ["Zoom In", "Quick Cut", "Pan Left", "DoF Blur", "Explosion"];

const CommandMenu: React.FC<CommandMenuProps> = ({ position, onSelect, onClose }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            style={{ top: position.y, left: position.x }}
            className="fixed z-50 bg-gray-900 border border-amber-500 rounded-lg shadow-2xl animate-fadeIn p-2"
        >
            <ul className="space-y-1">
                {commands.map(command => (
                    <li key={command}>
                        <button
                            onClick={() => onSelect(command)}
                            className="w-full text-left px-4 py-2 text-sm text-white rounded hover:bg-amber-500 hover:text-black transition-colors"
                        >
                            {command}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="border-t border-gray-700 my-1" />
            <button
                onClick={() => onSelect('__REMOVE__')}
                className="w-full text-left px-4 py-2 text-sm text-red-400 rounded hover:bg-red-900/50 hover:text-red-300 transition-colors"
            >
                Remove Command
            </button>
        </div>
    );
};

export default CommandMenu;