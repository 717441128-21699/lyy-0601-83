import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const {
    setConnectionStatus,
    setCurrentPlayer,
    setGameState,
    updateCell,
    updateScore,
    updatePlayer,
    removePlayer,
    addMessage,
    setRooms,
    setIsMatching,
    useItem,
    resetGame,
  } = useGameStore();

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('auth:success', (data: any) => {
      setCurrentPlayer(data.player);
      localStorage.setItem('playerId', data.player.id);
    });

    socket.on('match:waiting', () => {
      setIsMatching(true);
    });

    socket.on('match:found', () => {
      setIsMatching(false);
    });

    socket.on('match:cancel', () => {
      setIsMatching(false);
    });

    socket.on('rooms:list', (data: any) => {
      setRooms(data);
    });

    socket.on('rooms:update', (data: any) => {
      setRooms(data);
    });

    socket.on('game:started', (data: any) => {
      setGameState(data.gameState);
    });

    socket.on('cell:update', (data: any) => {
      updateCell(data.x, data.y, data);
    });

    socket.on('area:capture', (data: any) => {
      const { gameState } = useGameStore.getState();
      if (gameState) {
        setGameState({
          ...gameState,
          capturedAreas: [...gameState.capturedAreas, ...data.areas],
        });
      }
    });

    socket.on('score:update', (data: any) => {
      updateScore(data.teams);
      const { gameState } = useGameStore.getState();
      if (gameState) {
        setGameState({ ...gameState, timeLeft: data.timeLeft });
      }
    });

    socket.on('item:effect', (data: any) => {
      useItem(data.itemId);
      if (data.effect?.type === 'speedBoost') {
        const { currentPlayer } = useGameStore.getState();
        if (currentPlayer && data.playerId === currentPlayer.id) {
          updatePlayer(currentPlayer.id, {
            effects: [
              ...currentPlayer.effects,
              {
                type: 'speedBoost',
                duration: data.effect.duration,
                startTime: Date.now(),
              },
            ],
          });
        }
      }
      if (data.effect?.type === 'shield') {
        const { currentPlayer } = useGameStore.getState();
        if (currentPlayer && data.playerId === currentPlayer.id) {
          updatePlayer(currentPlayer.id, {
            effects: [
              ...currentPlayer.effects,
              {
                type: 'shield',
                duration: data.effect.duration,
                startTime: Date.now(),
              },
            ],
          });
        }
      }
    });

    socket.on('chat:receive', (data: any) => {
      addMessage(data);
    });

    socket.on('player:updated', (data: any) => {
      updatePlayer(data.playerId, data);
    });

    socket.on('player:disconnect', (data: any) => {
      removePlayer(data.playerId);
    });

    socket.on('player:reconnected', () => {
    });

    socket.on('game:ended', (data: any) => {
      const { gameState } = useGameStore.getState();
      if (gameState) {
        setGameState({ ...gameState, status: 'ended' });
      }
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    return socket;
  }, [
    setConnectionStatus,
    setCurrentPlayer,
    setGameState,
    updateCell,
    updateScore,
    updatePlayer,
    removePlayer,
    addMessage,
    setRooms,
    setIsMatching,
    useItem,
  ]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, [setConnectionStatus]);

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
    return () => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    isConnected: socketRef.current?.connected || false,
  };
}
