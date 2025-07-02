import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from '../services/socket';
import { gamesAPI } from '../services/api';
import { LiveGameState } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useGameState = () => {
    const { gameId } = useParams<{ gameId: string }>();
    const { user } = useAuth();
    const [gameState, setGameState] = useState<LiveGameState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(socket.connected);

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

    useEffect(() => {
        if (!gameId) return;

        const handleConnect = () => {
            console.log('Socket connected');
            setIsConnected(true);
            socket.emit('join_game', { game_id: gameId });
        };

        const handleDisconnect = () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        };

        const handleGameUpdate = (data: LiveGameState) => {
            console.log('Game state updated via socket:', data);
            setGameState(data);
        };
        
        const handleGameError = (data: { error: string }) => {
            console.error('Game error from server:', data.error);
            setError(data.error);
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('game_update', handleGameUpdate);
        socket.on('game_error', handleGameError);
        
        socket.connect();

        return () => {
            socket.emit('leave_game', { game_id: gameId });
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('game_update', handleGameUpdate);
            socket.off('game_error', handleGameError);
            socket.disconnect();
        };
    }, [gameId]);

    return { gameState, loading, error, isConnected, setGameState };
}; 