import React from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';
import { motion } from 'framer-motion';

interface WaitingForOpponentProps {
    message: string;
    subtext?: string;
}

const WaitingForOpponent: React.FC<WaitingForOpponentProps> = ({ message, subtext }) => {
    return (
        <motion.div
            className="flex flex-col justify-center items-center text-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <LoadingSpinner size="lg" />
            <h2 className="text-2xl font-bold mt-6 text-white">{message}</h2>
            {subtext && <p className="text-dark-300 mt-2">{subtext}</p>}
        </motion.div>
    );
};

export default WaitingForOpponent; 