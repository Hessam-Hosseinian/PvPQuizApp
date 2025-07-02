import React from 'react';
import Card from '../UI/Card';
import Avatar from '../UI/Avatar';
import { GamePlayer } from '../../types';

interface PlayerHeaderProps {
    player1: GamePlayer;
    player2: GamePlayer;
    isMyTurnToPick: boolean;
    isCategorySelectionPhase: boolean;
}

const PlayerHeader: React.FC<PlayerHeaderProps> = ({ player1, player2, isMyTurnToPick, isCategorySelectionPhase }) => {
    return (
        <div className="w-full max-w-4xl grid grid-cols-2 gap-4 mb-6">
            <Card className={`p-4 flex items-center bg-dark-700 ${isMyTurnToPick && isCategorySelectionPhase ? 'border-2 border-primary-500' : ''}`}>
                <Avatar src={player1.avatar} alt={player1.username} size="lg" />
                <div className="ml-4"><h2 className="text-lg font-bold">{player1.username}</h2><p className="text-sm text-dark-300">Score</p></div>
                <div className="ml-auto text-2xl font-bold text-primary-400">{player1.score}</div>
            </Card>
            <Card className={`p-4 flex items-center bg-dark-700 ${!isMyTurnToPick && isCategorySelectionPhase ? 'border-2 border-primary-500' : ''}`}>
                <div className="mr-auto text-2xl font-bold text-primary-400">{player2.score}</div>
                <div className="mr-4 text-right"><h2 className="text-lg font-bold">{player2.username}</h2><p className="text-sm text-dark-300">Score</p></div>
                <Avatar src={player2.avatar} alt={player2.username} size="lg" />
            </Card>
      </div>
    );
};

export default PlayerHeader; 