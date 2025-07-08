import React from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';
import { motion } from 'framer-motion';

interface WaitingForGameEndProps {
    message: string;
    subtext?: string;
}

const WaitingForGameEnd: React.FC<WaitingForGameEndProps> = ({ message, subtext }) => {
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
            <div className="mt-4 p-4 bg-dark-700 rounded-lg border border-primary-500/30">
                <p className="text-sm text-primary-300">
                    🏆 Final round in progress...
                </p>
            </div>
        </motion.div>
    );
};

export default WaitingForGameEnd;