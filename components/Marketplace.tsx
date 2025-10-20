import React, { useState } from 'react';
import { Project } from '../types';

interface MarketplaceProps {
    projects: Project[];
    onPurchase: (projectId: string) => void;
}

const SolanaIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 42 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.53125 15.9375L16.3281 10.5312L5.57812 5.125L5.53125 15.9375Z" fill="#14F195"/>
        <path d="M5.85938 29.3125L16.3281 23.9062L5.89062 18.5L5.85938 29.3125Z" fill="#14F195"/>
        <path d="M18.1094 24.125L27.9219 29.5312L28.0156 18.7188L18.1094 24.125Z" fill="#14F195"/>
        <path d="M27.9219 4.875L18.1094 10.2812L28.0156 15.6875L27.9219 4.875Z" fill="#14F195"/>
        <path d="M5.57812 5.125L16.3281 10.5312L18.1094 10.2812L5.89062 3.5625L5.57812 5.125Z" fill="#9945FF"/>
        <path d="M5.89062 18.5L18.1094 24.125L16.3281 23.9062L5.85938 29.3125L5.89062 18.5Z" fill="#9945FF"/>
        <path d="M28.0156 18.7188L18.1094 24.125L18.2969 24.3438L29.3594 17.5312L28.0156 18.7188Z" fill="#9945FF"/>
        <path d="M28.0156 15.6875L29.3906 16.5L18.2969 10.0938L18.1094 10.2812L28.0156 15.6875Z" fill="#9945FF"/>
    </svg>
);


const ListingCard: React.FC<{ project: Project; onPurchase: (projectId: string) => void }> = ({ project, onPurchase }) => {
    const [status, setStatus] = useState<'IDLE' | 'BUYING' | 'CONFIRMING'>('IDLE');

    const handleBuy = () => {
        setStatus('BUYING');
        setTimeout(() => setStatus('CONFIRMING'), 1500); // Simulate wallet connection
        setTimeout(() => {
            onPurchase(project.id);
            // Component will unmount, so no need to reset state
        }, 3000); // Simulate transaction confirmation
    }
    
    const getButtonText = () => {
        switch(status) {
            case 'BUYING': return 'Connecting Wallet...';
            case 'CONFIRMING': return 'Confirming Tx...';
            default: return 'Buy Now';
        }
    }

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col">
            <div className="w-full h-48 bg-black">
                <video src={project.videoUrl} className="w-full h-full object-cover" controls loop muted />
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-white truncate">{project.name}</h3>
                <p className="text-xs text-gray-500 font-mono truncate mt-1" title={project.copyrightTokenId}>
                    Token: {project.copyrightTokenId}
                </p>
                <div className="mt-4 flex-grow flex flex-col justify-end">
                    <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                        <span className="text-sm text-gray-400">Price</span>
                        <div className="flex items-center gap-2">
                            <SolanaIcon className="w-5 h-5" />
                            <span className="text-xl font-bold text-white">{project.priceSol} SOL</span>
                        </div>
                    </div>
                    <button 
                        onClick={handleBuy}
                        disabled={status !== 'IDLE'}
                        className="w-full mt-3 bg-amber-500 text-black font-bold py-3 px-4 rounded-lg hover:bg-amber-400 transition-colors disabled:bg-amber-700 disabled:cursor-wait"
                    >
                        {getButtonText()}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Marketplace: React.FC<MarketplaceProps> = ({ projects, onPurchase }) => {
  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-4xl font-black text-white">Token Marketplace</h1>
            <p className="text-gray-400">Buy and sell copyright tokens for M2V creations. (Alpha Access)</p>
        </header>

        {projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {projects.map(project => (
                    <ListingCard key={project.id} project={project} onPurchase={onPurchase} />
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-lg">
                <h3 className="text-xl font-semibold text-white">The Marketplace is Quiet...</h3>
                <p className="text-gray-400 mt-2">No projects are currently listed for sale. List one from your library!</p>
            </div>
        )}
    </div>
  );
};

export default Marketplace;
