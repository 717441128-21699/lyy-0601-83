import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let globalSocket: Socket | null = null;
let globalListeners: Map<string, Set<Function>> = new Map();

function initSocket() {
  if (globalSocket?.connected) return globalSocket;

  globalSocket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

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
    setCurrentRoom,
    addBlockedPlayer,
  } = useGameStore.getState();

  globalSocket.on('connect', () => {
    setConnectionStatus('connected');
    const playerId = localStorage.getItem('playerId');
    if (playerId) {
      globalSocket?.emit('auth:reconnect', { playerId });
    }
  });

  globalSocket.on('disconnect', () => {
    setConnectionStatus('disconnected');
  });

  globalSocket.on('auth:success', (data: any) => {
    setCurrentPlayer(data.player);
    localStorage.setItem('playerId', data.player.id);
  });

  globalSocket.on('match:waiting', () => {
    setIsMatching(true);
  });

  globalSocket.on('match:found', (data: any) => {
    setIsMatching(false);
    setCurrentRoom(data.roomId);
  });

  globalSocket.on('match:cancel', () => {
    setIsMatching(false);
  });

  globalSocket.on('rooms:list', (data: any) => {
    setRooms(data);
  });

  globalSocket.on('rooms:update', (data: any) => {
    setRooms(data);
  });

  globalSocket.on('room:created', (data: any) => {
    setCurrentRoom(data.room.id);
    setRooms(useGameStore.getState().rooms);
  });

  globalSocket.on('room:joined', (data: any) => {
    setCurrentRoom(data.room.id);
  });

  globalSocket.on('room:playerJoined', (data: any) => {
    const { gameState } = useGameStore.getState();
    if (gameState) {
      const newPlayer: any = {
        id: data.playerId,
        nickname: data.nickname,
        avatar: '',
        teamId: null,
        role: 'attacker',
        isOnline: true,
        stats: { paints: 0, areasCaptured: 0, itemsUsed: 0 },
        effects: [],
      };
      setGameState({
        ...gameState,
        players: [...gameState.players, newPlayer],
      });
    }
  });

  globalSocket.on('room:playerLeft', (data: any) => {
    removePlayer(data.playerId);
  });

  globalSocket.on('game:started', (data: any) => {
    setGameState(data.gameState);
    setIsMatching(false);
  });

  globalSocket.on('cell:update', (data: any) => {
    updateCell(data.x, data.y, data);
  });

  globalSocket.on('area:capture', (data: any) => {
    const { gameState } = useGameStore.getState();
    if (gameState) {
      setGameState({
        ...gameState,
        capturedAreas: [...gameState.capturedAreas, ...data.areas],
      });
    }
  });

  globalSocket.on('score:update', (data: any) => {
    updateScore(data.teams);
    const { gameState } = useGameStore.getState();
    if (gameState) {
      setGameState({ ...gameState, timeLeft: data.timeLeft });
    }
  });

  globalSocket.on('item:effect', (data: any) => {
    const { currentPlayer } = useGameStore.getState();
    if (currentPlayer && data.playerId === currentPlayer.id) {
      useItem(data.itemId, data.playerId);
    }
    if (data.effect?.type === 'speedBoost') {
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

  globalSocket.on('chat:receive', (data: any) => {
    const { blockedPlayers } = useGameStore.getState();
    if (!blockedPlayers.includes(data.playerId)) {
      addMessage(data);
    }
  });

  globalSocket.on('player:updated', (data: any) => {
    updatePlayer(data.playerId, data);
  });

  globalSocket.on('player:disconnect', (data: any) => {
    removePlayer(data.playerId);
  });

  globalSocket.on('player:reconnected', (data: any) => {
    setCurrentRoom(data.roomId);
  });

  globalSocket.on('game:ended', (data: any) => {
    const { gameState, setGameReplay, addReplayHistory, currentPlayer } = useGameStore.getState();
    if (gameState) {
      setGameState({ ...gameState, status: 'ended' });
      setGameReplay({
        gameId: gameState.id,
        replayId: data.replayId,
        finalGrid: data.finalGrid,
        winner: data.winner,
        mvp: data.mvp,
      });

      const replayRecord = {
        id: `replay_${gameState.id}`,
        gameId: gameState.id,
        title: `比赛 - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        mode: gameState.mode,
        date: Date.now(),
        duration: gameState.duration,
        winner: data.winner,
        winnerColor: data.winner?.color || '#ff2d95',
        players: gameState.players.map((p: any) => ({
          nickname: p.nickname,
          team: gameState.teams?.find((t: any) => t.id === p.teamId)?.name || '未知',
          avatar: p.avatar,
        })),
        finalGrid: data.finalGrid,
        mvp: data.mvp,
        playerId: currentPlayer?.id || '',
      };
      addReplayHistory(replayRecord);
    }
  });

  globalSocket.on('player:blocked', (data: any) => {
    addBlockedPlayer(data.blockedPlayerId);
  });

  globalSocket.on('connect_error', () => {
    setConnectionStatus('disconnected');
  });

  return globalSocket;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { connectionStatus, setConnectionStatus } = useGameStore();

  useEffect(() => {
    socketRef.current = initSocket();

    return () => {
    };
  }, []);

  const connect = useCallback(() => {
    socketRef.current = initSocket();
    return socketRef.current;
  }, []);

  const disconnect = useCallback(() => {
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    if (globalSocket?.connected) {
      globalSocket.emit(event, data);
    }
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (globalSocket) {
      globalSocket.on(event, callback);
    }
    return () => {
      if (globalSocket) {
        globalSocket.off(event, callback);
      }
    };
  }, []);

  return {
    socket: globalSocket,
    connect,
    disconnect,
    emit,
    on,
    isConnected: globalSocket?.connected || false,
    connectionStatus,
  };
}
