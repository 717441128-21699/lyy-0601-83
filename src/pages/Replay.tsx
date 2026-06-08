import { useState, useEffect, useRef, useMemo } from 'react';
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
  Heart,
  Star,
  History,
  Sparkles,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { gridToImage, downloadImage } from '../utils/pixelUtils';
import { Cell, ReplayRecord, FavoriteArtwork } from '../../shared/types';

export function Replay() {
  const { gameId } = useParams<{ gameId?: string }>();
  const [selectedReplay, setSelectedReplay] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [mockGrid, setMockGrid] = useState<Cell[][]>([]);
  const [showFinalWork, setShowFinalWork] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'history' | 'favorites'>('recent');
  const [isFavorited, setIsFavorited] = useState(false);
  const [timelinePreviews, setTimelinePreviews] = useState<Cell[][][]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const navigate = useNavigate();
  const {
    currentPlayer,
    gameReplay,
    gameState,
    replayHistory,
    favoriteArtworks,
    addFavoriteArtwork,
    removeFavoriteArtwork,
    isArtworkFavorited,
  } = useGameStore();
  const cellSize = 16;
  const gridSize = 32;

  useEffect(() => {
    const savedId = localStorage.getItem('playerId');
    if (savedId && !currentPlayer) {
      const playerData = localStorage.getItem('currentPlayer');
      if (playerData) {
        useGameStore.getState().setCurrentPlayer(JSON.parse(playerData));
      }
    }
  }, [currentPlayer]);

  useEffect(() => {
    if (currentPlayer) {
      localStorage.setItem('currentPlayer', JSON.stringify(currentPlayer));
    }
  }, [currentPlayer]);

  const recentReplays = useMemo(() => {
    const oneHourAgo = Date.now() - 3600000;
    return replayHistory.filter((r) => r.date > oneHourAgo);
  }, [replayHistory]);

  const historicalReplays = useMemo(() => {
    const oneHourAgo = Date.now() - 3600000;
    return replayHistory.filter((r) => r.date <= oneHourAgo);
  }, [replayHistory]);

  useEffect(() => {
    if (gameId && gameReplay) {
      const existingReplay = replayHistory.find((r) => r.gameId === gameId) || 
                            favoriteArtworks.find((f) => f.gameId === gameId);

      const replayData: any = existingReplay || {
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
          avatar: p.avatar,
        })) || [],
        finalGrid: gameReplay.finalGrid,
        mvp: gameReplay.mvp,
      };

      setSelectedReplay(replayData);
      setShowFinalWork(true);
      setIsFavorited(isArtworkFavorited(gameId));
      generateTimelinePreviews(replayData);

      if (gameReplay.finalGrid) {
        try {
          const parsedGrid = typeof gameReplay.finalGrid === 'string'
            ? JSON.parse(gameReplay.finalGrid)
            : gameReplay.finalGrid;
          setMockGrid(parsedGrid);
        } catch (e) {
          console.error('Failed to parse finalGrid:', e);
          initEmptyGrid();
        }
      } else {
        initEmptyGrid();
      }
    } else if (gameId) {
      const existingReplay = replayHistory.find((r) => r.gameId === gameId) || 
                            favoriteArtworks.find((f) => f.gameId === gameId);
      if (existingReplay) {
        loadReplay(existingReplay);
      } else {
        initEmptyGrid();
      }
    } else {
      initEmptyGrid();
    }
  }, [gameId, gameReplay, gameState, replayHistory, favoriteArtworks]);

  useEffect(() => {
    if (selectedReplay) {
      setIsFavorited(isArtworkFavorited(selectedReplay.gameId));
    }
  }, [selectedReplay, favoriteArtworks]);

  useEffect(() => {
    if (mockGrid.length > 0) {
      renderGrid();
    }
  }, [mockGrid]);

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

  const generateTimelinePreviews = (replay: any) => {
    const previews: Cell[][][] = [];
    const finalGrid = typeof replay.finalGrid === 'string'
      ? JSON.parse(replay.finalGrid)
      : replay.finalGrid;

    if (!finalGrid || !Array.isArray(finalGrid)) {
      setTimelinePreviews([]);
      return;
    }

    const frameCount = 10;
    for (let i = 0; i <= frameCount; i++) {
      const progress = i / frameCount;
      const previewGrid = finalGrid.map((row: Cell[]) =>
        row.map((cell) => ({ ...cell }))
      );
      
      const totalCells = gridSize * gridSize;
      const cellsToKeep = Math.floor(progress * totalCells);
      let cellCount = 0;

      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          if (cellCount >= cellsToKeep && previewGrid[y][x].color) {
            previewGrid[y][x] = {
              x,
              y,
              color: null,
              teamId: null,
              painterId: null,
              lastPainted: 0,
            };
          }
          if (previewGrid[y][x].color) {
            cellCount++;
          }
        }
      }
      previews.push(previewGrid);
    }
    setTimelinePreviews(previews);
  };

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
    if (isPlaying && selectedReplay && !showFinalWork && !isDragging) {
      const startTime = Date.now() - currentTime * playbackSpeed;
      const animate = () => {
        const elapsed = (Date.now() - startTime) * playbackSpeed;
        const newTime = Math.min(elapsed / 1000, selectedReplay.duration);
        setCurrentTime(newTime);
        simulatePaint(newTime);

        if (newTime >= selectedReplay.duration) {
          setIsPlaying(false);
          setShowFinalWork(true);
          showFinalWorkView();
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
  }, [isPlaying, selectedReplay, playbackSpeed, showFinalWork, isDragging]);

  const simulatePaint = (time: number) => {
    if (!selectedReplay) return;

    const progress = time / selectedReplay.duration;
    const finalGrid = typeof selectedReplay.finalGrid === 'string'
      ? JSON.parse(selectedReplay.finalGrid)
      : selectedReplay.finalGrid;

    if (!finalGrid || !Array.isArray(finalGrid)) return;

    const newGrid = finalGrid.map((row: Cell[]) =>
      row.map((cell) => ({ ...cell }))
    );

    const totalCells = gridSize * gridSize;
    const cellsToKeep = Math.floor(progress * totalCells);
    let cellCount = 0;

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (cellCount >= cellsToKeep && newGrid[y][x].color) {
          newGrid[y][x] = {
            x,
            y,
            color: null,
            teamId: null,
            painterId: null,
            lastPainted: 0,
          };
        }
        if (newGrid[y][x].color) {
          cellCount++;
        }
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
      setCurrentTime(0);
      initEmptyGrid();
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
    setIsDragging(true);
    simulatePaint(newTime);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
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
    downloadImage(dataUrl, `replay_${selectedReplay?.gameId || 'artwork'}.png`);
  };

  const toggleFavorite = () => {
    if (!selectedReplay) return;

    if (isFavorited) {
      removeFavoriteArtwork(selectedReplay.gameId);
      setIsFavorited(false);
    } else {
      const success = addFavoriteArtwork({
        gameId: selectedReplay.gameId,
        title: selectedReplay.title,
        mode: selectedReplay.mode,
        date: selectedReplay.date,
        duration: selectedReplay.duration || 300,
        winner: selectedReplay.winner,
        winnerColor: selectedReplay.winnerColor,
        players: selectedReplay.players,
        finalGrid: selectedReplay.finalGrid,
        mvp: selectedReplay.mvp,
        playerId: currentPlayer?.id || '',
      });
      if (success) {
        setIsFavorited(true);
      }
    }
  };

  const showFinalWorkView = () => {
    if (selectedReplay?.finalGrid) {
      try {
        const parsedGrid = typeof selectedReplay.finalGrid === 'string'
          ? JSON.parse(selectedReplay.finalGrid)
          : selectedReplay.finalGrid;
        setMockGrid(parsedGrid);
      } catch (e) {
        console.error('Failed to parse finalGrid:', e);
      }
    }
    setShowFinalWork(true);
    setIsPlaying(false);
  };

  const loadReplay = (replay: ReplayRecord | FavoriteArtwork) => {
    setSelectedReplay(replay);
    setCurrentTime(0);
    setIsPlaying(false);
    setShowFinalWork(true);
    setIsFavorited(isArtworkFavorited(replay.gameId));
    generateTimelinePreviews(replay);

    try {
      const parsedGrid = typeof replay.finalGrid === 'string'
        ? JSON.parse(replay.finalGrid)
        : replay.finalGrid;
      setMockGrid(parsedGrid);
    } catch (e) {
      console.error('Failed to parse finalGrid:', e);
      initEmptyGrid();
    }

    navigate(`/replay/${replay.gameId}`, { replace: true });
  };

  const getCurrentList = () => {
    switch (activeTab) {
      case 'recent':
        return recentReplays;
      case 'history':
        return historicalReplays;
      case 'favorites':
        return favoriteArtworks;
      default:
        return [];
    }
  };

  const renderReplayCard = (replay: ReplayRecord | FavoriteArtwork, index: number) => {
    const isCurrent = gameReplay && replay.gameId === gameReplay.gameId;
    const isSelected = selectedReplay?.gameId === replay.gameId;

    return (
      <motion.div
        key={replay.gameId}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        onClick={() => loadReplay(replay)}
        className={`p-4 cursor-pointer border-4 transition-all ${
          isCurrent
            ? 'border-pixel-yellow bg-pixel-yellow/10'
            : isSelected
            ? 'border-pixel-pink bg-pixel-pink/10'
            : 'border-pixel-blue/30 hover:border-pixel-blue/50 bg-pixel-bg'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-pixel text-xs text-white truncate">
            {isCurrent ? '当前比赛' : replay.title}
          </span>
          <div className="flex items-center gap-2">
            {'favoritedAt' in replay && (
              <Heart size={12} className="text-pixel-pink fill-pixel-pink" />
            )}
            <span
              className="font-pixel text-xs px-2 py-1"
              style={{
                backgroundColor: (replay.winnerColor || '#ff2d95') + '20',
                color: replay.winnerColor || '#ff2d95',
              }}
            >
              {replay.mode}
            </span>
          </div>
        </div>
        <div className="font-pixel-body text-xs text-gray-500 mb-1">
          {new Date(replay.date).toLocaleString()}
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
            {typeof replay.winner === 'string' ? replay.winner : replay.winner?.name} 胜
          </span>
        </div>
      </motion.div>
    );
  };

  if (!currentPlayer) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6 flex items-center justify-center min-h-[400px]">
          <div className="pixel-card p-8 text-center">
            <p className="font-pixel text-sm text-gray-500 mb-4">正在恢复连接...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'recent', name: '刚结束', icon: Sparkles, color: 'text-pixel-yellow' },
    { id: 'history', name: '历史回放', icon: History, color: 'text-pixel-blue' },
    { id: 'favorites', name: '我的收藏', icon: Star, color: 'text-pixel-pink' },
  ];

  const currentList = getCurrentList();

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
            作品库
          </h1>
        </div>

        {gameReplay && (activeTab === 'recent' || selectedReplay?.gameId === gameReplay.gameId) && (
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
                      style={{ color: selectedReplay?.winnerColor || gameReplay.winner?.color }}
                    >
                      {selectedReplay?.winner?.name || gameReplay.winner?.name || '未知'} 获胜
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
                  onClick={toggleFavorite}
                  className={`px-4 py-2 border-2 font-pixel text-xs transition-colors ${
                    isFavorited
                      ? 'border-pixel-pink bg-pixel-pink/20 text-pixel-pink'
                      : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-pink hover:text-pixel-pink'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Heart size={14} className={isFavorited ? 'fill-pixel-pink' : ''} />
                    <span>{isFavorited ? '已收藏' : '收藏作品'}</span>
                  </div>
                </button>
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
                作品列表
              </h2>

              <div className="flex border-b-2 border-pixel-blue/30 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1 py-3 border-b-4 transition-all ${
                      activeTab === tab.id
                        ? `${tab.color} border-current`
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span className="font-pixel text-[10px]">{tab.name}</span>
                    <span className="font-pixel text-[10px] bg-pixel-bg/50 px-1 rounded">
                      {tab.id === 'recent' ? recentReplays.length :
                       tab.id === 'history' ? historicalReplays.length :
                       favoriteArtworks.length}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {currentList.length === 0 ? (
                  <div className="text-center py-8">
                    <List size={32} className="text-gray-600 mx-auto mb-2" />
                    <p className="font-pixel-body text-xs text-gray-500">
                      {activeTab === 'recent' ? '暂无刚结束的比赛' :
                       activeTab === 'history' ? '暂无历史回放' :
                       '暂无收藏的作品'}
                    </p>
                  </div>
                ) : (
                  currentList.map((replay, index) => renderReplayCard(replay, index))
                )}
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
                    <div>
                      <h2 className="font-pixel text-sm text-pixel-blue">
                        {selectedReplay.title}
                      </h2>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(selectedReplay.date).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy size={12} className="text-pixel-yellow" />
                          <span style={{ color: selectedReplay.winnerColor }}>
                            {typeof selectedReplay.winner === 'string'
                              ? selectedReplay.winner
                              : selectedReplay.winner?.name} 胜
                          </span>
                        </span>
                        {selectedReplay.mvp && (
                          <span className="flex items-center gap-1 text-pixel-yellow">
                            <Crown size={12} />
                            MVP: {selectedReplay.mvp.nickname}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleFavorite}
                        className={`p-2 border-2 transition-colors ${
                          isFavorited
                            ? 'border-pixel-pink bg-pixel-pink/20 text-pixel-pink'
                            : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-pink hover:text-pixel-pink'
                        }`}
                        title={isFavorited ? '取消收藏' : '收藏作品'}
                      >
                        <Heart size={16} className={isFavorited ? 'fill-pixel-pink' : ''} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedReplay(null);
                          setIsPlaying(false);
                          navigate('/replay', { replace: true });
                        }}
                        className="p-2 hover:bg-pixel-red/10 text-gray-500 hover:text-pixel-red transition-colors"
                        title="关闭"
                      >
                        <X size={16} />
                      </button>
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

                  {!showFinalWork && timelinePreviews.length > 0 && (
                    <div className="mb-4">
                      <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                        {timelinePreviews.map((preview, index) => {
                          const previewProgress = (index / (timelinePreviews.length - 1)) * 100;
                          const currentProgress = (currentTime / selectedReplay.duration) * 100;
                          const isActive = Math.abs(previewProgress - currentProgress) < 10;
                          
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                const time = (index / (timelinePreviews.length - 1)) * selectedReplay.duration;
                                setCurrentTime(time);
                                setShowFinalWork(false);
                                simulatePaint(time);
                              }}
                              className={`flex-shrink-0 w-10 h-10 border-2 transition-all ${
                                isActive
                                  ? 'border-pixel-pink scale-110'
                                  : 'border-pixel-blue/30 hover:border-pixel-blue'
                              }`}
                              title={`${Math.round(previewProgress)}%`}
                            >
                              <div
                                className="w-full h-full"
                                style={{
                                  background: `linear-gradient(90deg, ${selectedReplay.winnerColor || '#ff2d95'} ${previewProgress}%, #1a0a2e ${previewProgress}%)`,
                                }}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!showFinalWork && (
                    <div className="mb-4">
                      <input
                        type="range"
                        min="0"
                        max={selectedReplay.duration}
                        step="0.1"
                        value={currentTime}
                        onChange={seekTo}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
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

                  <div className="flex justify-center gap-3 mb-6">
                    <PixelButton
                      variant="secondary"
                      onClick={toggleFavorite}
                      className={`!border-2 !font-pixel !text-xs !transition-colors ${
                        isFavorited
                          ? '!border-pixel-pink !bg-pixel-pink/20 !text-pixel-pink'
                          : '!border-pixel-blue/30 !text-gray-500 hover:!border-pixel-pink hover:!text-pixel-pink'
                      }`}
                    >
                      <Heart size={14} className={`mr-2 ${isFavorited ? 'fill-pixel-pink' : ''}`} />
                      {isFavorited ? '已收藏' : '收藏作品'}
                    </PixelButton>
                    <PixelButton variant="secondary" onClick={saveArtwork}>
                      <Download size={14} className="mr-2" />
                      保存图片
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
                            src={player.avatar || `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjMWEwYTJlIi8+PHJlY3QgeD0iOCIgeT0iOCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjMDBkNGZmIi8+PC9zdmc+`}
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
                          {selectedReplay.mvp?.nickname === player.nickname && (
                            <Crown size={12} className="text-pixel-yellow" />
                          )}
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
                  <p className="font-pixel text-sm text-gray-500 mb-2">选择一个作品</p>
                  <p className="font-pixel-body text-xs text-gray-600">
                    从左侧列表中选择要观看的比赛回放或收藏的作品
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