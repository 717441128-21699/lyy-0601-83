export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  teamId: string | null;
  role: 'attacker' | 'defender' | 'supporter';
  isOnline: boolean;
  stats: {
    paints: number;
    areasCaptured: number;
    itemsUsed: number;
  };
  effects: PlayerEffect[];
}

export interface PlayerEffect {
  type: 'freeze' | 'speedBoost' | 'shield' | 'reveal';
  duration: number;
  startTime: number;
}

export interface Cell {
  x: number;
  y: number;
  color: string | null;
  teamId: string | null;
  painterId: string | null;
  lastPainted: number;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  score: number;
  percent: number;
}

export interface Area {
  id: string;
  teamId: string;
  cells: { x: number; y: number }[];
  bonus: number;
  createdAt: number;
}

export interface Item {
  id: string;
  name: string;
  type: 'attack' | 'defend' | 'support';
  icon: string;
  description: string;
  cooldown: number;
  lastUsed: number;
  count: number;
  price: number;
  effect: {
    freeze?: number;
    speedBoost?: number;
    clearArea?: boolean;
    shield?: number;
    reveal?: number;
  };
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  avatar?: string;
  content: string;
  type: 'text' | 'emote' | 'system';
  timestamp: number;
  teamId?: string;
  channel?: 'global' | 'room' | 'team';
}

export interface ReplayFrame {
  timestamp: number;
  type: 'paint' | 'area' | 'item' | 'score' | 'chat';
  data: any;
}

export interface GameState {
  id: string;
  status: 'waiting' | 'playing' | 'ended';
  gridSize: number;
  grid: Cell[][];
  teams: Team[];
  players: Player[];
  startTime: number;
  duration: number;
  timeLeft: number;
  capturedAreas: Area[];
  replayFrames: ReplayFrame[];
  mode: '2v2' | '4v4' | 'free';
}

export interface Room {
  id: string;
  name: string;
  mode: '2v2' | '4v4' | 'free';
  maxPlayers: number;
  currentPlayers: number;
  status: 'waiting' | 'playing' | 'ended';
  hostId: string;
  createdAt: number;
  hasPassword: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  season: string;
  icon: string;
  description: string;
  earnedAt: number;
}

export interface PlayerStats {
  level: number;
  totalPaints: number;
  wins: number;
  losses: number;
  mvpCount: number;
  winRate: number;
}

export interface RankEntry {
  playerId: string;
  nickname: string;
  avatar: string;
  stats: PlayerStats;
  rank: number;
}

export const TEAM_COLORS = ['#ff2d95', '#00d4ff', '#39ff14', '#ffdd00'];
export const TEAM_NAMES = ['霓虹粉', '电光蓝', '荧光绿', '金沙黄'];

export const PAINT_COLORS = [
  '#ff2d95',
  '#00d4ff',
  '#39ff14',
  '#ffdd00',
  '#ff6b35',
  '#9b59b6',
  '#1abc9c',
  '#e74c3c',
];

export const EMOTES = [
  { key: 'F1', emoji: '👍', label: '点赞' },
  { key: 'F2', emoji: '🔥', label: '加油' },
  { key: 'F3', emoji: '😂', label: '大笑' },
  { key: 'F4', emoji: '😮', label: '惊讶' },
  { key: 'F5', emoji: '💪', label: '给力' },
  { key: 'F6', emoji: '🎉', label: '庆祝' },
  { key: 'F7', emoji: '😢', label: '难过' },
  { key: 'F8', emoji: '🤔', label: '思考' },
  { key: 'F9', emoji: '👋', label: '你好' },
  { key: 'F10', emoji: '❤️', label: '爱心' },
];

export const ITEMS: Item[] = [
  {
    id: 'item_freeze',
    name: '冰冻弹',
    type: 'attack',
    icon: '❄️',
    description: '冻结目标玩家3秒无法操作',
    cooldown: 3000,
    lastUsed: 0,
    count: 3,
    price: 10,
    effect: { freeze: 3 },
  },
  {
    id: 'item_speed',
    name: '加速符',
    type: 'support',
    icon: '⚡',
    description: '自身涂色速度+50%，持续10秒',
    cooldown: 5000,
    lastUsed: 0,
    count: 3,
    price: 15,
    effect: { speedBoost: 10 },
  },
  {
    id: 'item_bomb',
    name: '颜色炸弹',
    type: 'attack',
    icon: '💣',
    description: '清除5×5区域内敌方颜色',
    cooldown: 8000,
    lastUsed: 0,
    count: 2,
    price: 20,
    effect: { clearArea: true },
  },
  {
    id: 'item_shield',
    name: '防护盾',
    type: 'defend',
    icon: '🛡️',
    description: '5秒内免疫所有干扰效果',
    cooldown: 6000,
    lastUsed: 0,
    count: 2,
    price: 15,
    effect: { shield: 5 },
  },
  {
    id: 'item_reveal',
    name: '侦查眼',
    type: 'support',
    icon: '👁️',
    description: '显示对手10秒内涂色轨迹',
    cooldown: 4000,
    lastUsed: 0,
    count: 2,
    price: 12,
    effect: { reveal: 10 },
  },
];
