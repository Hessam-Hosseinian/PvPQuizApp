import React from 'react';
import Card from '../UI/Card';
import Avatar from '../UI/Avatar';
import { GamePlayer } from '../../types';
import { motion } from 'framer-motion';

interface PlayerHeaderProps {
    player1: GamePlayer;
    player2: GamePlayer;
    isMyTurnToPick: boolean;
    isCategorySelectionPhase: boolean;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ player1, player2, isMyTurnToPick, isCategorySelectionPhase }) => {
    return (
        <motion.div
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fade-in"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
        >
            {/* Player 1 */}
            <Card
                className={`relative p-5 flex items-center bg-gradient-to-br from-dark-700 to-dark-900 shadow-xl border-2 transition-all duration-300
                    rounded-2xl min-h-[90px]
                    ${isMyTurnToPick && isCategorySelectionPhase ? 'border-primary-500 ring-4 ring-primary-400/40 scale-105' : 'border-dark-600'}
                `}
            >
                <Avatar
                    src={player1.avatar}
                    alt={player1.username}
                    size="lg"
                    className={isMyTurnToPick && isCategorySelectionPhase ? 'ring-4 ring-primary-400' : 'ring-2 ring-dark-500'}
                />
                <div className="ml-4 flex flex-col">
                    <h2 className="text-xl font-extrabold text-white drop-shadow-sm">{player1.username}</h2>
                    <p className="text-sm text-dark-300 font-medium">score</p>
                </div>
                <div className="ml-auto text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text drop-shadow-lg">
                    {player1.score}
                </div>
                {isMyTurnToPick && isCategorySelectionPhase && (
                    <span className="absolute top-2 left-2 bg-primary-500 text-white text-xs px-3 py-1 rounded-full shadow animate-bounce-in font-bold">
                     Your Turn
                    </span>
                )}
            </Card>
            {/* Player 2 */}
            <Card
                className={`relative p-5 flex items-center bg-gradient-to-br from-dark-700 to-dark-900 shadow-xl border-2 transition-all duration-300
                    rounded-2xl min-h-[90px]
                    ${!isMyTurnToPick && isCategorySelectionPhase ? 'border-primary-500 ring-4 ring-primary-400/40 scale-105' : 'border-dark-600'}
                `}
            >
                <div className="mr-auto text-3xl font-extrabold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text drop-shadow-lg">
                    {player2.score}
                </div>
                <div className="mr-4 flex flex-col text-right">
                    <h2 className="text-xl font-extrabold text-white drop-shadow-sm">{player2.username}</h2>
                    <p className="text-sm text-dark-300 font-medium">score</p>
                </div>
                <Avatar
                    src={player2.avatar}
                    alt={player2.username}
                    size="lg"
                    className={!isMyTurnToPick && isCategorySelectionPhase ? 'ring-4 ring-primary-400' : 'ring-2 ring-dark-500'}
                />
                {!isMyTurnToPick && isCategorySelectionPhase && (
                    <span className="absolute top-2 right-2 bg-primary-500 text-white text-xs px-3 py-1 rounded-full shadow animate-bounce-in font-bold">
                        opponent's turn
                    </span>
                )}
            </Card>
        </motion.div>
    );
};

export default PlayerHeader; 
