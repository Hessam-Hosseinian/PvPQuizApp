import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LiveGameState } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Avatar from '../UI/Avatar';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Crown, Trophy, Home, XCircle } from 'lucide-react';

interface GameEndScreenProps {
    gameState: LiveGameState;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ gameState }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { participants } = gameState;

    if (!user) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-dark-900">
                <LoadingSpinner />
            </div>
        );
    }

    const winner = participants.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    const loser = participants.find(p => p.user_id !== winner.user_id);
    const isWinner = winner.user_id === user?.id;

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 text-white flex flex-col justify-center items-center p-4 animate-fade-in">
            <Card className="w-full max-w-md text-center p-8 bg-dark-800/90 border-2 border-primary-500/60 shadow-2xl animate-slide-up backdrop-blur-md">
                <div className="flex flex-col items-center justify-center mb-4 gap-2">
                    {isWinner ? (
                        <Trophy className="w-12 h-12 text-yellow-400 drop-shadow-lg animate-bounce-slow" />
                    ) : (
                        <XCircle className="w-12 h-12 text-red-400 drop-shadow-lg animate-shake" />
                    )}
                    <h1 className={`text-5xl font-extrabold tracking-tight ${isWinner ? 'text-primary-400 drop-shadow-glow' : 'text-red-400'}`}>
                        {isWinner ? 'Victory!' : 'Defeat'}
                    </h1>
                    <p className="text-dark-200 text-lg font-medium animate-fade-in-slow">
                        {isWinner ? 'You crushed your opponent!' : 'Better luck next time!'}
                    </p>
                </div>

                {/* Game Summary Section (if available) */}
                {/* Removed: winner.correctAnswers and winner.wrongAnswers, as these fields do not exist on GamePlayer */}

                <div className="space-y-8">
                    {/* Winner Card */}
                    <div className="relative p-6 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-dark-700 border-2 border-yellow-400/60 shadow-xl animate-pop-in">
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-dark-900 px-4 py-1 rounded-full text-base font-bold flex items-center shadow-md">
                            <Crown className="w-5 h-5 mr-2" /> Winner
                        </div>
                        <div className="flex items-center">
                            <div className="relative">
                                <Avatar src={winner.avatar} alt={winner.username} size="xl" className="ring-4 ring-yellow-400 shadow-glow animate-glow" />
                                {isWinner && (
                                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-primary-500 text-xs text-white px-2 py-0.5 rounded shadow">You</span>
                                )}
                            </div>
                            <div className="ml-5 text-left">
                                <h2 className="text-2xl font-bold text-yellow-300 drop-shadow">{winner.username}</h2>
                                <p className="text-dark-200 text-sm">Final Score</p>
                            </div>
                            <div className="ml-auto text-4xl font-extrabold text-yellow-400 drop-shadow">{winner.score}</div>
                        </div>
                        {loser && (
                            <div className="mt-2 text-xs text-dark-300 text-right">+{winner.score - loser.score} points difference</div>
                        )}
                    </div>

                    {/* Loser Card */}
                    {loser && (
                        <div className="p-6 rounded-2xl bg-dark-700/80 border border-dark-600 shadow-md animate-fade-in-slow">
                            <div className="flex items-center">
                                <Avatar src={loser.avatar} alt={loser.username} size="lg" className="opacity-70" />
                                <div className="ml-5 text-left">
                                    <h2 className="text-lg font-semibold text-dark-200">{loser.username}</h2>
                                    <p className="text-dark-400 text-sm">Final Score</p>
                                </div>
                                <div className="ml-auto text-2xl font-bold text-dark-300">{loser.score}</div>
                            </div>
                        </div>
                    )}
                </div>

                <Button
                    onClick={() => navigate('/')}
                    size="lg"
                    className="mt-12 w-full bg-gradient-to-r from-primary-600 to-primary-400 hover:from-primary-700 hover:to-primary-500 transition-all duration-200 shadow-lg flex items-center justify-center gap-2 text-lg font-semibold tracking-wide rounded-xl py-3 animate-pop-in"
                >
                    <Home className="w-6 h-6" />
                    Back to Home
                </Button>
            </Card>
        </div>
    );
};

export default GameEndScreen;