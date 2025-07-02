import React from 'react';
import { motion } from 'framer-motion';

interface TimerBarProps {
    timeLeft: number;
    duration: number;
}

const TimerBar: React.FC<TimerBarProps> = ({ timeLeft, duration }) => {
    const percentage = (timeLeft / duration) * 100;
    return (
        <div className="w-full bg-dark-600 rounded-full h-2.5 mb-4">
            <motion.div
                className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2.5 rounded-full"
                initial={{ width: '100%' }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 1, ease: "linear" }}
            />
        </div>
    );
};

export default TimerBar; 