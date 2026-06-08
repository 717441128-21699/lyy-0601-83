import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Download,
  Clock,
  Users,
  Trophy,
  List,
  X,
  ChevronRight,
  FastForward,
  Rewind,
  ArrowLeft,
  Crown,
  Image as ImageIcon,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { gridToImage, downloadImage } from '../utils/pixelUtils';
import { Cell, ReplayFrame } from '../../shared/types';

const mockReplays = [
  {
    id: 'replay_1',
    title: '2024-01-15 精彩对决',
    mode: '2v2',
    date: Date.now() - 3600000,
    duration: 300,
    winner: '霓虹粉',
    winnerColor: '#ff2d95',
    players: [
      { nickname: '像素大师', team: '霓虹粉' },
      { nickname: '画画达人', team: '霓虹粉' },
      { nickname: '涂色王者', team: '电光蓝' },
      { nickname: '艺术大师', team: '电光蓝' },
    ],
  },
  {
    id: 'replay_2',
    title: '4v4 团队协作赛',
    mode: '4v4',
    date: Date.now() - 7200000,
    duration: 300,
    winner: '电光蓝',
    winnerColor: '#00d4ff',
    players: [
      { nickname: '玩家A', team: '电光蓝' },
      { nickname: '玩家B', team: '电光蓝' },
      { nickname: '玩家C', team: '电光蓝' },
      { nickname: '玩家D', team: '电光蓝' },
      { nickname: '玩家E', team: '荧光绿' },
      { nickname: '玩家F', team: '荧光绿' },
      { nickname: '玩家G', team: '荧光绿' },
      { nickname: '玩家H', team: '荧光绿' },
    ],
  },
  {
    id: 'replay_3',
    title: '自由模式大乱斗',
    mode: 'free',
    date: Date.now() - 86400000,
    duration: 300,
    winner: '金沙黄',
    winnerColor: '#ffdd00',
    players: [
      { nickname: '独行侠', team: '金沙黄' },
      { nickname: '快枪手', team: '霓虹粉' },
      { nickname: '艺术家', team: '电光蓝' },
      { nickname: '涂色侠', team: '荧光绿' },
    ],
  },
];

export function Replay() {
  const { gameId } = useParams<{ gameId?: string }>();
  const [selectedReplay, setSelectedReplay] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [mockGrid, setMockGrid] = useState<Cell[][]>([]);
  const [showFinalWork, setShowFinalWork] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const navigate = useNavigate();
  const { currentPlayer, gameReplay, gameState } = useGameStore();
  const cellSize = 16;
  const gridSize = 32;

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  useEffect(() => {
    if (gameId && gameReplay) {
      const replayData: any = {
        id: gameReplay.gameId || gameId,
        title: `比赛回放 - ${new Date().toLocaleDateString()}`,
        mode: gameState?.mode || '2v2',
        date: Date.now(),
        duration: 300,
        winner: gameReplay.winner?.name || '未知',
        winnerColor: gameReplay.winner?.color || '#ff2d95',
        players: gameState?.players?.map((p: any) => ({
          nickname: p.nickname,
          team: gameState?.teams?.find((t: any) => t.id === p.teamId)?.name || '未知',
        })) || [],
        finalGrid: gameReplay.finalGrid,
        mvp: gameReplay.mvp,
      };
      setSelectedReplay(replayData);
      setShowFinalWork(true);

      if (gameReplay.finalGrid) {
        setMockGrid(gameReplay.finalGrid);
      } else {
        initEmptyGrid();
      }
    } else {
      initEmptyGrid();
    }
  }, [gameId, gameReplay, gameState]);

  const initEmptyGrid = () => {
    const grid: Cell[][] = [];
    for (let y = 0; y < gridSize; y++) {
      grid[y] = [];
      for (let x = 0; x < gridSize; x++) {
        grid[y][x] = {
          x,
          y,
          color: null,
          teamId: null,
          painterId: null,
          lastPainted: 0,
        };
      }
    }
    setMockGrid(grid);
  };

  useEffect(() => {
    if (mockGrid.length > 0) {
      renderGrid();
    }
  }, [mockGrid]);

  const renderGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = mockGrid[y]?.[x];
        if (cell?.color) {
          ctx.fillStyle = cell.color;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  };

  useEffect(() => {
    if (isPlaying && selectedReplay && !showFinalWork) {
      const startTime = Date.now() - currentTime * playbackSpeed;
      const animate = () => {
        const elapsed = (Date.now() - startTime) * playbackSpeed;
        const newTime = Math.min(elapsed / 1000, selectedReplay.duration);
        setCurrentTime(newTime);
        simulatePaint(newTime);

        if (newTime >= selectedReplay.duration) {
          setIsPlaying(false);
          setShowFinalWork(true);
        } else {
          animationRef.current = requestAnimationFrame(animate);
        }
      };
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, selectedReplay, playbackSpeed, showFinalWork]);

  const simulatePaint = (time: number) => {
    if (!selectedReplay) return;

    const progress = time / selectedReplay.duration;
    const newGrid = mockGrid.map(row => row.map(cell => ({ ...cell })));

    const paintCount = Math.floor(progress * 500);
    const colors = ['#ff2d95', '#00d4ff', '#39ff14', '#ffdd00'];

    for (let i = 0; i < Math.min(10, paintCount); i++) {
      const seed = Math.floor(time * 10 + i * 100);
      const x = seed % gridSize;
      const y = Math.floor(seed / gridSize) % gridSize;
      const colorIndex = Math.floor((seed / 7) % colors.length);

      if (newGrid[y] && newGrid[y][x]) {
        newGrid[y][x].color = colors[colorIndex];
        newGrid[y][x].teamId = `team_${colorIndex}`;
      }
    }

    setMockGrid(newGrid);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (showFinalWork) {
      setShowFinalWork(false);
      initEmptyGrid();
      setCurrentTime(0);
    }
    if (currentTime >= selectedReplay?.duration) {
      setCurrentTime(0);
      initEmptyGrid();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    setShowFinalWork(false);
    if (isPlaying) {
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 50);
    }
  };

  const skipTime = (seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime + seconds, selectedReplay?.duration || 0));
    setCurrentTime(newTime);
    setShowFinalWork(false);
    simulatePaint(newTime);
  };

  const saveArtwork = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = gridToImage(mockGrid, cellSize);
    downloadImage(dataUrl, `replay_${selectedReplay?.id || 'artwork'}.png`);
  };

  const showFinalWorkView = () => {
    if (gameReplay?.finalGrid) {
      setMockGrid(gameReplay.finalGrid);
    }
    setShowFinalWork(true);
    setIsPlaying(false);
  };

  if (!currentPlayer) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          {gameId && (
            <button
              onClick={() => navigate('/match')}
              className="flex items-center gap-2 text-pixel-blue hover:text-pixel-pink transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-pixel-body text-sm">返回大厅</span>
            </button>
          )}
          <h1 className="font-pixel text-xl neon-text-pink flex items-center gap-2">
            <Play size={24} />
            比赛回放
          </h1>
        </div>

        {gameReplay && gameId && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pixel-card mb-6 border-pixel-yellow/50"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Trophy size={32} className="text-pixel-yellow" />
                <div>
                  <div className="font-pixel text-sm text-gray-500 mb-1">比赛结果</div>
                  <div className="flex items-center gap-3">
                    <span
                      className="font-pixel text-lg"
                      style={{ color: selectedReplay?.winnerColor }}
                    >
                      {selectedReplay?.winner} 获胜
                    </span>
                    {gameReplay.mvp && (
                      <div className="flex items-center gap-1 text-pixel-yellow">
                        <Crown size={16} />
                        <span className="font-pixel-body text-xs">MVP: {gameReplay.mvp.nickname}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={showFinalWorkView}
                  className={`px-4 py-2 border-2 font-pixel text-xs transition-colors ${
                    showFinalWork
                      ? 'border-pixel-pink bg-pixel-pink/20 text-pixel-pink'
                      : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-blue'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ImageIcon size={14} />
                    <span>最终作品</span>
                  </div>
                </button>
                <PixelButton variant="secondary" onClick={saveArtwork}>
                  <Download size={14} className="mr-2" />
                  保存作品
                </PixelButton>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="pixel-card">
              <h2 className="font-pixel text-sm text-pixel-blue mb-4 flex items-center gap-2">
                <List size={16} />
                回放列表
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {gameId && gameReplay && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => {
                      setShowFinalWork(true);
                      if (gameReplay.finalGrid) {
                        setMockGrid(gameReplay.finalGrid);
                      }
                    }}
                    className="p-4 cursor-pointer border-4 border-pixel-yellow bg-pixel-yellow/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-pixel text-xs text-white truncate">
                        当前比赛
                      </span>
                      <span
                        className="font-pixel text-xs px-2 py-1"
                        style={{
                          backgroundColor: (selectedReplay?.winnerColor || '#ff2d95') + '20',
                          color: selectedReplay?.winnerColor || '#ff2d95',
                        }}
                      >
                        {selectedReplay?.mode || '2v2'}
                      </span>
                    </div>
                    <div className="font-pixel-body text-xs text-pixel-yellow mb-1">
                      刚刚结束
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy size={12} className="text-pixel-yellow" />
                      <span
                        className="font-pixel text-xs"
                        style={{ color: selectedReplay?.winnerColor }}
                      >
                        {selectedReplay?.winner} 胜
                      </span>
                    </div>
                  </motion.div>
                )}
                {mockReplays.map((replay, index) => (
                  <motion.div
                    key={replay.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => {
                      setSelectedReplay(replay);
                      setCurrentTime(0);
                      setIsPlaying(false);
                      setShowFinalWork(false);
                      initEmptyGrid();
                    }}
                    className={`p-4 cursor-pointer border-4 transition-all ${
                      selectedReplay?.id === replay.id
                        ? 'border-pixel-pink bg-pixel-pink/10'
                        : 'border-pixel-blue/30 hover:border-pixel-blue/50 bg-pixel-bg'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-pixel text-xs text-white truncate">
                        {replay.title}
                      </span>
                      <span
                        className="font-pixel text-xs px-2 py-1"
                        style={{
                          backgroundColor: replay.winnerColor + '20',
                          color: replay.winnerColor,
                        }}
                      >
                        {replay.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatTime(replay.duration)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {replay.players.length}人
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy size={12} className="text-pixel-yellow" />
                      <span
                        className="font-pixel text-xs"
                        style={{ color: replay.winnerColor }}
                      >
                        {replay.winner} 胜
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {selectedReplay ? (
                <motion.div
                  key="replay-player"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="pixel-card"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-pixel text-sm text-pixel-blue">
                      {selectedReplay.title}
                    </h2>
                    <div className="flex items-center gap-2">
                      {!gameId && (
                        <button
                          onClick={() => {
                            setSelectedReplay(null);
                            setIsPlaying(false);
                          }}
                          className="p-1 hover:bg-pixel-red/10 text-gray-500 hover:text-pixel-red transition-colors"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center mb-4">
                    <div className="relative">
                      <div className="scanline-effect absolute inset-0 pointer-events-none z-10" />
                      <canvas
                        ref={canvasRef}
                        width={gridSize * cellSize}
                        height={gridSize * cellSize}
                        className="border-4 border-pixel-blue/50"
                        style={{
                          imageRendering: 'pixelated',
                          width: Math.min(512, gridSize * cellSize),
                          height: Math.min(512, gridSize * cellSize),
                        }}
                      />
                      {showFinalWork && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute top-2 right-2 px-3 py-1 bg-pixel-yellow/90 text-pixel-bg font-pixel text-xs"
                        >
                          最终作品
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {!showFinalWork && (
                    <div className="mb-4">
                      <input
                        type="range"
                        min="0"
                        max={selectedReplay.duration}
                        step="0.1"
                        value={currentTime}
                        onChange={seekTo}
                        className="w-full h-2 bg-pixel-purple border-2 border-pixel-blue/50 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-pixel-pink [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="font-pixel text-xs text-gray-500">
                          {formatTime(currentTime)}
                        </span>
                        <span className="font-pixel text-xs text-gray-500">
                          {formatTime(selectedReplay.duration)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 mb-4">
                    {!showFinalWork && (
                      <>
                        <button
                          onClick={() => skipTime(-10)}
                          className="p-3 border-2 border-pixel-blue/50 hover:border-pixel-blue transition-colors"
                          title="后退10秒"
                        >
                          <SkipBack size={16} className="text-pixel-blue" />
                        </button>
                        <button
                          onClick={() => skipTime(-5)}
                          className="p-3 border-2 border-pixel-blue/50 hover:border-pixel-blue transition-colors"
                          title="后退5秒"
                        >
                          <Rewind size={16} className="text-pixel-blue" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={togglePlay}
                      className="p-4 border-4 border-pixel-pink bg-pixel-pink/20 hover:bg-pixel-pink/30 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause size={24} className="text-pixel-pink" />
                      ) : (
                        <Play size={24} className="text-pixel-pink" />
                      )}
                    </button>
                    {!showFinalWork && (
                      <>
                        <button
                          onClick={() => skipTime(5)}
                          className="p-3 border-2 border-pixel-blue/50 hover:border-pixel-blue transition-colors"
                          title="快进5秒"
                        >
                          <FastForward size={16} className="text-pixel-blue" />
                        </button>
                        <button
                          onClick={() => skipTime(10)}
                          className="p-3 border-2 border-pixel-blue/50 hover:border-pixel-blue transition-colors"
                          title="快进10秒"
                        >
                          <SkipForward size={16} className="text-pixel-blue" />
                        </button>
                      </>
                    )}
                  </div>

                  {!showFinalWork && (
                    <div className="flex items-center justify-center gap-4 mb-4">
                      <span className="font-pixel text-xs text-gray-500">倍速:</span>
                      {[0.5, 1, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`px-3 py-1 border-2 font-pixel text-xs transition-colors ${
                            playbackSpeed === speed
                              ? 'border-pixel-pink bg-pixel-pink/20 text-pixel-pink'
                              : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-blue/50'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-center gap-3">
                    <PixelButton variant="secondary" onClick={saveArtwork}>
                      <Download size={14} className="mr-2" />
                      保存作品
                    </PixelButton>
                    <PixelButton variant="primary" onClick={() => navigate('/match')}>
                      再来一局
                    </PixelButton>
                  </div>

                  <div className="mt-6 pt-4 border-t-2 border-pixel-blue/30">
                    <h3 className="font-pixel text-xs text-pixel-yellow mb-3">参赛玩家</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReplay.players.map((player: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 p-2 bg-pixel-bg border border-pixel-blue/20"
                        >
                          <PixelAvatar
                            src={`data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMWEwYTJlIi8+PHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjMDBkNGZmIi8+PC9zdmc+`}
                            size={24}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-pixel-body text-xs text-white truncate">
                              {player.nickname}
                            </div>
                            <div className="font-pixel text-[10px] text-gray-500">
                              {player.team}
                            </div>
                          </div>
                          <ChevronRight size={12} className="text-gray-600" />
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="pixel-card h-[400px] flex flex-col items-center justify-center"
                >
                  <Play size={64} className="text-pixel-blue/30 mb-4" />
                  <p className="font-pixel text-sm text-gray-500 mb-2">选择一个回放</p>
                  <p className="font-pixel-body text-xs text-gray-600">
                    从左侧列表中选择要观看的比赛回放
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
