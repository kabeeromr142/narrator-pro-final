import React, { useState, useMemo } from 'react';
import { Project } from '../types';
import { FilterIcon } from './icons';

interface LibraryProps {
  projects: Project[];
  selectProjectForStudio: (project: Project) => void;
  updateProjectListing: (projectId: string, price: number | null) => void;
}

const ProjectCard: React.FC<{ 
    project: Project; 
    onEdit: () => void; 
    onList: () => void;
    onUnlist: () => void;
}> = ({ project, onEdit, onList, onUnlist }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden transition-transform transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col">
        <div className="w-full h-48 bg-black">
             <video src={project.videoUrl} className="w-full h-full object-cover" controls loop muted />
        </div>
        <div className="p-4 flex flex-col flex-grow">
            <h3 className="font-bold text-lg text-white truncate">{project.name}</h3>
            <p className="text-sm text-gray-400">Created: {project.createdAt}</p>
            <p className="text-xs text-amber-400/80 font-mono truncate mt-2" title={project.copyrightTokenId}>
                Token: {project.copyrightTokenId}
            </p>
            <div className="mt-4 flex-grow flex flex-col justify-end">
                {project.isListed && project.priceSol && (
                    <div className="bg-green-900/50 border border-green-500 rounded-lg p-2 text-center mb-2">
                        <p className="text-sm font-bold text-green-300">Listed for Sale</p>
                        <p className="text-lg font-black text-white">{project.priceSol} SOL</p>
                    </div>
                )}
                <div className="flex gap-2">
                    <a href={project.videoUrl} download={`${project.name}.mp4`} className="w-full text-center bg-amber-500 text-black font-bold py-2 px-4 rounded-lg text-sm hover:bg-amber-400 transition-colors">
                        Download
                    </a>
                    <button onClick={onEdit} className="w-full bg-gray-700 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-600 transition-colors">
                        Edit in Studio
                    </button>
                </div>
                 {project.isListed ? (
                    <button onClick={onUnlist} className="w-full mt-2 bg-red-800 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-red-700 transition-colors">
                        Unlist from Marketplace
                    </button>
                ) : (
                    <button onClick={onList} className="w-full mt-2 bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-sm hover:bg-gray-500 transition-colors">
                        List on Marketplace
                    </button>
                )}
            </div>
        </div>
    </div>
);

const ListingModal: React.FC<{
    project: Project;
    onClose: () => void;
    onConfirm: (price: number) => void;
}> = ({ project, onClose, onConfirm }) => {
    const [price, setPrice] = useState('');
    const [error, setError] = useState('');

    const handleConfirm = () => {
        const solPrice = parseFloat(price);
        if (isNaN(solPrice) || solPrice <= 0) {
            setError('Please enter a valid price greater than 0.');
            return;
        }
        setError('');
        onConfirm(solPrice);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center animate-fadeIn" onClick={onClose}>
            <div className="bg-gray-900 border border-amber-500 rounded-lg shadow-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold text-amber-400">List Project for Sale</h2>
                <p className="text-gray-400 mt-1">List "{project.name}" on the Marketplace.</p>
                <div className="my-6">
                    <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Price in SOL</label>
                    <div className="relative">
                        <input
                            type="number"
                            id="price"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none text-white pl-10"
                            placeholder="e.g., 5.5"
                            min="0"
                            step="0.1"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">◎</span>
                    </div>
                    {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-700 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-600">Cancel</button>
                    <button onClick={handleConfirm} className="bg-amber-500 text-black font-bold py-2 px-6 rounded-lg hover:bg-amber-400">Confirm Listing</button>
                </div>
            </div>
        </div>
    )
}

const Library: React.FC<LibraryProps> = ({ projects, selectProjectForStudio, updateProjectListing }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name
  const [modalState, setModalState] = useState<{ isOpen: boolean, project: Project | null }>({ isOpen: false, project: null });

  const processedProjects = useMemo(() => {
    const filtered = projects.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.id).getTime() - new Date(a.id).getTime();
        if (sortBy === 'oldest') return new Date(a.id).getTime() - new Date(b.id).getTime();
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0;
    });
  }, [projects, searchTerm, sortBy]);


  const handleOpenModal = (project: Project) => {
      setModalState({ isOpen: true, project });
  };
  
  const handleCloseModal = () => {
      setModalState({ isOpen: false, project: null });
  };

  const handleConfirmListing = (price: number) => {
      if (modalState.project) {
          updateProjectListing(modalState.project.id, price);
          handleCloseModal();
      }
  };
  
  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-4xl font-black text-white">Project Library</h1>
            <p className="text-gray-400">Your collection of generated masterpieces.</p>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
            <input 
                type="text"
                placeholder="Search by name or prompt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full md:max-w-md p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none text-white"
            />
            <div className="relative">
                <select 
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="w-full md:w-48 p-3 bg-gray-900 border border-gray-700 rounded-lg focus:ring-2 focus:ring-amber-400 focus:outline-none text-white appearance-none pl-10"
                >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="name">Sort: Name (A-Z)</option>
                </select>
                <FilterIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
        </div>

        {processedProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {processedProjects.map(project => (
                    <ProjectCard 
                        key={project.id} 
                        project={project} 
                        onEdit={() => selectProjectForStudio(project)}
                        onList={() => handleOpenModal(project)}
                        onUnlist={() => updateProjectListing(project.id, null)}
                    />
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-gray-900 border border-gray-800 rounded-lg">
                <h3 className="text-xl font-semibold text-white">Your library is empty.</h3>
                <p className="text-gray-400 mt-2">Create a project to see it here.</p>
            </div>
        )}

        {modalState.isOpen && modalState.project && (
            <ListingModal 
                project={modalState.project}
                onClose={handleCloseModal}
                onConfirm={handleConfirmListing}
            />
        )}
    </div>
  );
};

export default Library;