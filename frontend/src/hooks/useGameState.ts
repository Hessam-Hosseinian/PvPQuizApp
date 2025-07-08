import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { gameSocket } from '../services/socket';
import { gamesAPI } from '../services/api';
import { LiveGameState } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useGameState = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const { user } = useAuth();
    const [gameState, setGameState] = useState<LiveGameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(gameSocket.connected);

    const fetchInitialState = useCallback(async () => {
        if (!gameId || !user) return;
        try {
            setLoading(true);
            const response = await gamesAPI.getGameState(parseInt(gameId), user.id);
            setGameState(response.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.error || 'No game data found.');
        } finally {
            setLoading(false);
        }
    }, [gameId, user]);

    useEffect(() => {
        fetchInitialState();
    }, [fetchInitialState]);

    // Polling fallback for game state updates
    useEffect(() => {
        if (!gameId || !user || !isConnected) return;
        
        const pollInterval = setInterval(async () => {
            try {
                const response = await gamesAPI.getGameState(parseInt(gameId), user.id);
                setGameState(response.data);
            } catch (err) {
                console.error('Polling failed:', err);
            }
        }, 5000); // Poll every 5 seconds
        
        return () => clearInterval(pollInterval);
    }, [gameId, user, isConnected, setGameState]);

    useEffect(() => {
        if (!gameId) return;

        const handleConnect = () => {
            console.log('Game socket connected');
            setIsConnected(true);
            console.log('Joining game room:', gameId);
            gameSocket.emit('join_game', { game_id: gameId });
        };

        const handleDisconnect = () => {
            console.log('Game socket disconnected');
            setIsConnected(false);
        };

        const handleGameUpdate = (data: LiveGameState) => {
            console.log('Game state updated via socket:', data);
            console.log('Current round:', data.current_round);
            setGameState(data);
        };
        
        const handleGameError = (data: { error: string }) => {
            console.error('Game error from server:', data.error);
            setError(data.error);
        };

        gameSocket.on('connect', handleConnect);
        gameSocket.on('disconnect', handleDisconnect);
        gameSocket.on('game_update', handleGameUpdate);
        gameSocket.on('game_error', handleGameError);
        
        // Connect with a small delay to ensure proper initialization
        setTimeout(() => {
            gameSocket.connect();
        }, 100);

        return () => {
            gameSocket.emit('leave_game', { game_id: gameId });
            gameSocket.off('connect', handleConnect);
            gameSocket.off('disconnect', handleDisconnect);
            gameSocket.off('game_update', handleGameUpdate);
            gameSocket.off('game_error', handleGameError);
            gameSocket.disconnect();
        };
    }, [gameId]);

    return { gameState, loading, error, isConnected, setGameState };
}; 