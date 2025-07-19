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
    selectedCategoryId?: number; // اضافه شد
}

// تابع ایموجی مرتبط با نام کتگوری
const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('vehicles')) return '🚗';
    if (name.includes('sports')) return '🏅';
    if (name.includes('mathematics')) return '➗';
    if (name.includes('gadgets')) return '📱';
    if (name.includes('computers')) return '💻';
    if (name.includes('nature')) return '🌱';
    if (name.includes('politics')) return '🏛️';
    if (name.includes('mythology')) return '⚡';
    if (name.includes('history')) return '📚';
    if (name.includes('general knowledge')) return '❔';
    if (name.includes('video games')) return '🎮';
    if (name.includes('television')) return '📺';
    if (name.includes('musicals and theatres')) return '🎭';
    if (name.includes('music')) return '🎵';
    if (name.includes('anime') || name.includes('manga')) return '🗾';
    if (name.includes('film')) return '🎬';
    if (name.includes('comics')) return '🦸';
    if (name.includes('cartoon and animations')) return '🐭';
    if (name.includes('books')) return '📖';
    if (name.includes('board games')) return '🎲';
    if (name.includes('celebrities')) return '🌟';
    if (name.includes('art')) return '🎨';
    if (name.includes('animals')) return '🐾';
    if (name.includes('science')) return '🔬';
    if (name.includes('entertainment')) return '🎬';
    if (name.includes('literature')) return '📖';
    if (name.includes('geography')) return '🌍';
    return '❓';
};

// تابع گرادینت رنگی بر اساس ایندکس
const getCategoryColor = (index: number) => {
    const colors = [
        'from-red-600 to-pink-600',
        'from-blue-600 to-indigo-600',
        'from-green-600 to-teal-600',
        'from-yellow-600 to-orange-600',
        'from-purple-600 to-indigo-600',
        'from-pink-600 to-rose-600',
        'from-indigo-600 to-blue-600',
        'from-teal-600 to-green-600',
    ];
    return colors[index % colors.length];
};

const CategorySelection: React.FC<CategorySelectionProps> = ({
    roundNumber,
    picker,
    isMyTurnToPick,
    categoryOptions,
    onSelectCategory,
    timeLeft,
    duration,
    selectedCategoryId
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
                <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 mb-2 drop-shadow-lg">
                    Round {roundNumber}
                </h1>
                <p className="text-lg text-dark-200 font-medium">
                    {isMyTurnToPick
                        ? "Choose the field of battle!"
                        : `Waiting for ${picker?.username || 'opponent'} to pick a category...`}
                </p>
            </div>
            
            <div className="w-full max-w-lg mx-auto mb-8">
                <TimerBar timeLeft={timeLeft} duration={duration} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categoryOptions.map((cat, idx) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                        <Card 
                            key={cat.id}
                            onClick={() => isMyTurnToPick && onSelectCategory(cat.id)}
                            className={`
                                relative p-6 min-h-[140px] flex flex-col items-center justify-center
                                bg-gradient-to-br ${getCategoryColor(idx)}
                                text-center transition-all duration-300 rounded-2xl
                                border-2
                                ${isMyTurnToPick 
                                    ? 'cursor-pointer hover:scale-105 hover:shadow-2xl hover:border-primary-400' 
                                    : 'opacity-60 cursor-not-allowed'}
                                ${isSelected ? 'ring-4 ring-primary-400 border-primary-400 scale-105 shadow-2xl' : 'border-dark-600'}
                                shadow-lg
                            `}
                        >
                            <div className="text-5xl mb-2 drop-shadow-lg">
                                {getCategoryIcon(cat.name)}
                            </div>
                            <span className="text-2xl font-bold text-white mb-1 drop-shadow-sm">{cat.name}</span>
                            {/* اگر تعداد سوالات را داری اینجا نمایش بده */}
                            {/* <span className="text-sm text-dark-200 mt-1">12 سوال</span> */}
                            {isSelected && (
                                <span className="absolute top-3 right-3 bg-primary-500 text-white text-xs px-3 py-1 rounded-full shadow">Selected</span>
                            )}
                        </Card>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default CategorySelection; 