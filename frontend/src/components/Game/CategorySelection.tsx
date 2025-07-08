import React from 'react';
import { motion } from 'framer-motion';
import Card from '../UI/Card';
import { GamePlayer } from '../../types';
import TimerBar from './TimerBar';

interface CategorySelectionProps {
    roundNumber: number;
    picker?: GamePlayer;
    isMyTurnToPick: boolean;
    categoryOptions: { id: number; name: string }[];
    onSelectCategory: (categoryId: number) => void;
    timeLeft: number;
    duration: number;
}

const CategorySelection: React.FC<CategorySelectionProps> = ({
    roundNumber,
    picker,
    isMyTurnToPick,
    categoryOptions,
    onSelectCategory,
    timeLeft,
    duration
}) => {
    return (
        <motion.div
            key={`category-select-${roundNumber}`}
            className="w-full max-w-4xl text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
        >
            <div className="mb-4">
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 mb-2">
                    Round {roundNumber}
                </h1>
                <p className="text-lg text-dark-300">
                    {isMyTurnToPick
                        ? "Choose the field of battle!"
                        : `Waiting for ${picker?.username || 'opponent'} to pick a category...`}
                </p>
            </div>
            
            <div className="w-full max-w-lg mx-auto mb-8">
                <TimerBar timeLeft={timeLeft} duration={duration} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categoryOptions.map(cat => (
                    <Card 
                        key={cat.id}
                        onClick={() => isMyTurnToPick && onSelectCategory(cat.id)}
                        className={`
                            p-6 min-h-[120px] flex items-center justify-center 
                            bg-dark-700/50 backdrop-blur-sm
                            text-center transition-all duration-300 rounded-xl
                            border-2 border-dark-600
                            ${isMyTurnToPick 
                                ? 'cursor-pointer hover:bg-primary-800/70 hover:border-primary-500 hover:scale-105' 
                                : 'opacity-60 cursor-not-allowed'
                            }
                        `}
                    >
                        <span className="text-xl font-bold text-white">{cat.name}</span>
                    </Card>
                ))}
            </div>
        </motion.div>
    );
};

export default CategorySelection; 