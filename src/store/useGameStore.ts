import { create } from 'zustand';
import {
  GameState,
  Player,
  Cell,
  Team,
  Item,
  ChatMessage,
  ITEMS,
  PAINT_COLORS,
} from '../../shared/types';

interface GameStore {
  currentPlayer: Player | null;
  gameState: GameState | null;
  selectedColor: string;
  selectedItem: Item | null;
  inventory: Item[];
  messages: ChatMessage[];
  rooms: any[];
  isMatching: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  currentRoom: string | null;
  currentRoomData: any | null;
  gameReplay: any | null;
  blockedPlayers: string[];

  setCurrentPlayer: (player: Player | null) => void;
  setGameState: (state: GameState | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedItem: (item: Item | null) => void;
  setInventory: (items: Item[]) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  setRooms: (rooms: any[]) => void;
  setIsMatching: (v: boolean) => void;
  setConnectionStatus: (s: 'connected' | 'disconnected' | 'connecting') => void;
  setCurrentRoom: (roomId: string | null) => void;
  setCurrentRoomData: (room: any | null) => void;
  setGameReplay: (replay: any | null) => void;
  addBlockedPlayer: (playerId: string) => void;
  removeBlockedPlayer: (playerId: string) => void;

  updateCell: (x: number, y: number, cell: Partial<Cell>) => void;
  updateScore: (teams: Team[]) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removePlayer: (playerId: string) => void;
  useItem: (itemId: string, playerId?: string) => void;
  resetGame: () => void;
}

const savedGameReplay = localStorage.getItem('gameReplay');

export const useGameStore = create<GameStore>((set, get) => ({
  currentPlayer: null,
  gameState: null,
  selectedColor: PAINT_COLORS[0],
  selectedItem: null,
  inventory: JSON.parse(JSON.stringify(ITEMS)),
  messages: [],
  rooms: [],
  isMatching: false,
  connectionStatus: 'disconnected',
  currentRoom: null,
  currentRoomData: null,
  gameReplay: savedGameReplay ? JSON.parse(savedGameReplay) : null,
  blockedPlayers: [],

  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setGameState: (state) => set({ gameState: state }),
  setSelectedColor: (color) => set({ selectedColor: color }),
  setSelectedItem: (item) => set({ selectedItem: item }),
  setInventory: (items) => set({ inventory: items }),
  addMessage: (msg) =>
    set((state) => {
      if (state.messages.some((m) => m.id === msg.id)) {
        return state;
      }
      return { messages: [...state.messages.slice(-100), msg] };
    }),
  clearMessages: () => set({ messages: [] }),
  setRooms: (rooms) => set({ rooms }),
  setIsMatching: (v) => set({ isMatching: v }),
  setConnectionStatus: (s) => set({ connectionStatus: s }),
  setCurrentRoom: (roomId) => set({ currentRoom: roomId }),
  setCurrentRoomData: (room) => set({ currentRoomData: room }),
  setGameReplay: (replay) => {
    if (replay) {
      localStorage.setItem('gameReplay', JSON.stringify(replay));
    } else {
      localStorage.removeItem('gameReplay');
    }
    set({ gameReplay: replay });
  },
  addBlockedPlayer: (playerId) =>
    set((state) => ({
      blockedPlayers: state.blockedPlayers.includes(playerId)
        ? state.blockedPlayers
        : [...state.blockedPlayers, playerId],
    })),
  removeBlockedPlayer: (playerId) =>
    set((state) => ({
      blockedPlayers: state.blockedPlayers.filter((p) => p !== playerId),
    })),

  updateCell: (x, y, updates) => {
    const { gameState } = get();
    if (!gameState) return;
    const newGrid = gameState.grid.map(row => [...row]);
    newGrid[y] = [...newGrid[y]];
    newGrid[y][x] = { ...newGrid[y][x], ...updates };
    set({ gameState: { ...gameState, grid: newGrid } });
  },

  updateScore: (teams) => {
    const { gameState } = get();
    if (!gameState) return;
    set({ gameState: { ...gameState, teams } });
  },

  updatePlayer: (playerId, updates) => {
    const { gameState, currentPlayer } = get();
    if (!gameState) return;
    const newPlayers = gameState.players.map((p) =>
      p.id === playerId ? { ...p, ...updates } : p
    );
    set({
      gameState: { ...gameState, players: newPlayers },
      currentPlayer:
        currentPlayer?.id === playerId
          ? { ...currentPlayer, ...updates }
          : currentPlayer,
    });
  },

  removePlayer: (playerId) => {
    const { gameState } = get();
    if (!gameState) return;
    set({
      gameState: {
        ...gameState,
        players: gameState.players.filter((p) => p.id !== playerId),
      },
    });
  },

  useItem: (itemId, playerId) => {
    const { inventory, currentPlayer } = get();
    if (playerId && currentPlayer?.id !== playerId) {
      return;
    }
    const newInventory = inventory.map((item) =>
      item.id === itemId
        ? { ...item, count: Math.max(0, item.count - 1), lastUsed: Date.now() }
        : item
    );
    set({ inventory: newInventory, selectedItem: null });
  },

  resetGame: () => {
    localStorage.removeItem('gameReplay');
    set({
      gameState: null,
      selectedColor: PAINT_COLORS[0],
      selectedItem: null,
      inventory: JSON.parse(JSON.stringify(ITEMS)),
      messages: [],
      currentRoom: null,
      currentRoomData: null,
      isMatching: false,
      gameReplay: null,
    });
  },
}));
