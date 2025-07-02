import React from 'react';
import LoadingSpinner from '../UI/LoadingSpinner';

const WaitingForNextRound: React.FC = () => {
    return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-dark-900 text-white">
            <LoadingSpinner size="lg" />
            <h2 className="text-2xl font-bold mt-6">Round Finished!</h2>
            <p className="text-dark-300 mt-2">Waiting for your opponent to finish...</p>
        </div>
    );
};

export default WaitingForNextRound; 