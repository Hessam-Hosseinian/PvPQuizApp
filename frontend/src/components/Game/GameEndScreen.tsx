import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LiveGameState } from '../../types';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Avatar from '../UI/Avatar';
import LoadingSpinner from '../UI/LoadingSpinner';
import { Crown } from 'lucide-react';

interface GameEndScreenProps {
    gameState: LiveGameState;
}

const GameEndScreen: React.FC<GameEndScreenProps> = ({ gameState }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { participants } = gameState;

    if (!user) return <div className="flex justify-center items-center min-h-screen bg-dark-900"><LoadingSpinner/></div>

    const winner = participants.reduce((prev, current) => (prev.score > current.score) ? prev : current);
    const loser = participants.find(p => p.user_id !== winner.user_id);
    const isWinner = winner.user_id === user?.id;

    return (
        <div className="min-h-screen bg-dark-900 text-white flex flex-col justify-center items-center p-4">
            <Card className="w-full max-w-md text-center p-8 bg-dark-800 border-2 border-primary-500/50 shadow-2xl">
                <h1 className="text-4xl font-bold mb-2 text-primary-400">{isWinner ? 'Victory!' : 'Defeat'}</h1>
                <p className="text-dark-300 mb-8">{isWinner ? 'You crushed your opponent!' : 'Better luck next time!'}</p>

                <div className="space-y-6">
                    {/* Winner Card */}
                    <div className="relative p-6 rounded-lg bg-dark-700 border border-yellow-400">
                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-yellow-400 text-dark-900 px-3 py-1 rounded-full text-sm font-bold flex items-center">
                            <Crown className="w-4 h-4 mr-1" /> Winner
                        </div>
                        <div className="flex items-center">
                            <Avatar src={winner.avatar} alt={winner.username} size="xl" className="ring-2 ring-yellow-400" />
                            <div className="ml-4 text-left">
                                <h2 className="text-xl font-bold">{winner.username}</h2>
                                <p className="text-dark-300">Final Score</p>
                            </div>
                            <div className="ml-auto text-3xl font-bold text-yellow-400">{winner.score}</div>
                        </div>
                    </div>

                    {/* Loser Card */}
                    {loser && (
                         <div className="p-6 rounded-lg bg-dark-700 border border-dark-600">
                            <div className="flex items-center">
                                <Avatar src={loser.avatar} alt={loser.username} size="lg" className="opacity-70" />
                                <div className="ml-4 text-left">
                                    <h2 className="text-lg font-semibold text-dark-200">{loser.username}</h2>
                                    <p className="text-dark-400">Final Score</p>
                                </div>
                                <div className="ml-auto text-2xl font-bold text-dark-300">{loser.score}</div>
                            </div>
                        </div>
                    )}
                </div>

                <Button 
                    onClick={() => navigate('/')} 
                    size="lg" 
                    className="mt-10 w-full bg-primary-600 hover:bg-primary-700"
                >
                    Back to Home
                </Button>
            </Card>
        </div>
    );
}

export default GameEndScreen; 