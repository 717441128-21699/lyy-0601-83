import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Timer,
  Zap,
  Shield,
  Users,
  MessageSquare,
  Flag,
  Download,
  Home,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/useGameStore';
import { PAINT_COLORS, EMOTES, ITEMS } from '../../shared/types';
import { formatTime, gridToImage, downloadImage } from '../utils/pixelUtils';

export function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatActiveTab, setChatActiveTab] = useState<'room' | 'team'>('room');
  const [gameResult, setGameResult] = useState<any>(null);
  const [particles, setParticles] = useState<{ x: number; y: number; color: string; id: number }[]>([]);
  const [targetingMode, setTargetingMode] = useState<string | null>(null);
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const {
    gameState,
    currentPlayer,
    selectedColor,
    setSelectedColor,
    selectedItem,
    setSelectedItem,
    inventory,
    useItem,
    messages,
    addMessage,
    resetGame,
  } = useGameStore();

  const particleIdRef = useRef(0);

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  useEffect(() => {
    const offGameEnded = on('game:ended', (data: any) => {
      setGameResult(data);
    });

    const offChatReceived = on('chat:receive', (msg: any) => {
      addMessage(msg);
    });

    return () => {
      offGameEnded();
      offChatReceived();
    };
  }, [on, addMessage]);

  useEffect(() => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / gameState.gridSize;

    for (let y = 0; y < gameState.gridSize; y++) {
      for (let x = 0; x < gameState.gridSize; x++) {
        const cell = gameState.grid[y][x];
        ctx.fillStyle = cell.color || '#0a0612';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

        if (cell.teamId) {
          const team = gameState.teams.find((t) => t.id === cell.teamId);
          if (team) {
            ctx.strokeStyle = team.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }
    }

    if (hoveredCell) {
      ctx.fillStyle = selectedColor + '40';
      ctx.fillRect(
        hoveredCell.x * cellSize,
        hoveredCell.y * cellSize,
        cellSize,
        cellSize
      );
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredCell.x * cellSize,
        hoveredCell.y * cellSize,
        cellSize,
        cellSize
      );
    }

    gameState.capturedAreas.forEach((area) => {
      if (area.cells.length > 0) {
        const team = gameState.teams.find((t) => t.id === area.teamId);
        if (team) {
          ctx.strokeStyle = team.color;
          ctx.lineWidth = 3;
          ctx.setLineDash([4, 4]);
          const minX = Math.min(...area.cells.map((c) => c.x));
          const maxX = Math.max(...area.cells.map((c) => c.x));
          const minY = Math.min(...area.cells.map((c) => c.y));
          const maxY = Math.max(...area.cells.map((c) => c.y));
          ctx.strokeRect(
            minX * cellSize - 2,
            minY * cellSize - 2,
            (maxX - minX + 1) * cellSize + 4,
            (maxY - minY + 1) * cellSize + 4
          );
          ctx.setLineDash([]);
        }
      }
    });
  }, [gameState, hoveredCell, selectedColor]);

  const addParticles = useCallback((x: number, y: number, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const cellSize = canvas.width / gameState!.gridSize;
    const centerX = x * cellSize + cellSize / 2;
    const centerY = y * cellSize + cellSize / 2;

    for (let i = 0; i < 6; i++) {
      const id = particleIdRef.current++;
      setParticles((prev) => [
        ...prev,
        {
          x: centerX + (Math.random() - 0.5) * 20,
          y: centerY + (Math.random() - 0.5) * 20,
          color,
          id,
        },
      ]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 500);
    }
  }, [gameState]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!gameState || !currentPlayer || gameState.status !== 'playing') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / (canvas.width / gameState.gridSize));
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / (canvas.height / gameState.gridSize));

      if (x < 0 || x >= gameState.gridSize || y < 0 || y >= gameState.gridSize) return;

      if (targetingMode && selectedItem) {
        const targetPlayer = gameState.players.find(
          (p) => p.teamId !== currentPlayer.teamId && p.isOnline
        );
        if (targetPlayer) {
          emit('item:use', {
            itemId: selectedItem.id,
            targetId: targetPlayer.id,
          });
        }
        setTargetingMode(null);
        setSelectedItem(null);
        return;
      }

      const hasFreeze = currentPlayer.effects.some(
        (ef) => ef.type === 'freeze' && Date.now() - ef.startTime < ef.duration * 1000
      );
      if (hasFreeze) return;

      emit('cell:paint', { x, y, color: selectedColor });
      addParticles(x, y, selectedColor);
    },
    [gameState, currentPlayer, selectedColor, selectedItem, targetingMode, emit, addParticles, setSelectedItem]
  );

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / (canvas.width / gameState.gridSize));
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / (canvas.height / gameState.gridSize));

    if (x >= 0 && x < gameState.gridSize && y >= 0 && y < gameState.gridSize) {
      setHoveredCell({ x, y });
    } else {
      setHoveredCell(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '8') {
        const index = parseInt(e.key) - 1;
        if (PAINT_COLORS[index]) {
          setSelectedColor(PAINT_COLORS[index]);
        }
      }
      if (e.key === 'q' || e.key === 'Q') {
        const availableItem = inventory.find((i) => i.count > 0);
        if (availableItem) {
          setSelectedItem(availableItem);
          if (availableItem.type === 'attack') {
            setTargetingMode(availableItem.id);
          } else {
            emit('item:use', { itemId: availableItem.id });
            setSelectedItem(null);
          }
        }
      }
      if (e.key === 'Escape') {
        setTargetingMode(null);
        setSelectedItem(null);
      }
      if (e.key === ' ' && hoveredCell && gameState?.status === 'playing') {
        e.preventDefault();
        emit('cell:paint', { x: hoveredCell.x, y: hoveredCell.y, color: selectedColor });
        addParticles(hoveredCell.x, hoveredCell.y, selectedColor);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedColor, setSelectedColor, inventory, selectedItem, setSelectedItem, emit, hoveredCell, gameState, addParticles]);

  const sendChat = () => {
    if (!chatMessage.trim()) return;
    emit('chat:send', { message: chatMessage, type: 'text', channel: chatActiveTab });
    setChatMessage('');
  };

  const sendEmote = (emote: string) => {
    emit('chat:send', { message: emote, type: 'emote', channel: chatActiveTab });
  };

  const handleUseItem = (item: any) => {
    if (item.count <= 0) return;
    setSelectedItem(item);
    if (item.type === 'attack') {
      setTargetingMode(item.id);
    } else {
      emit('item:use', { itemId: item.id });
      setSelectedItem(null);
    }
  };

  const saveArtwork = () => {
    if (!gameState) return;
    const dataUrl = gridToImage(gameState.grid, 10);
    downloadImage(dataUrl, `pixel-war-${Date.now()}.png`);
  };

  const playerTeam = gameState?.teams.find((t) => t.id === currentPlayer?.teamId);
  const hasShield = currentPlayer?.effects.some(
    (ef) => ef.type === 'shield' && Date.now() - ef.startTime < ef.duration * 1000
  );
  const hasSpeedBoost = currentPlayer?.effects.some(
    (ef) => ef.type === 'speedBoost' && Date.now() - ef.startTime < ef.duration * 1000
  );

  if (!gameState || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-bg">
        <div className="font-pixel text-pixel-blue animate-pulse">加载中...</div>
      </div>
    );
  }

  if (gameResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pixel-bg p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="pixel-card max-w-lg w-full text-center"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="mb-6"
          >
            {gameResult.winner.id === currentPlayer.teamId ? (
              <>
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="font-pixel text-2xl neon-text-green mb-2">胜利!</h2>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">💀</div>
                <h2 className="font-pixel text-2xl neon-text-pink mb-2">失败</h2>
              </>
            )}
          </motion.div>

          <div className="space-y-4 mb-8">
            <div className="grid grid-cols-2 gap-4">
              {gameState.teams.map((team: any) => (
                <div
                  key={team.id}
                  className={`p-4 border-4 ${
                    team.id === gameResult.winner.id
                      ? 'border-pixel-yellow bg-pixel-yellow/10'
                      : 'border-pixel-blue/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4"
                      style={{ backgroundColor: team.color }}
                    />
                    <span className="font-pixel text-sm" style={{ color: team.color }}>
                      {team.name}
                    </span>
                  </div>
                  <div className="font-pixel text-lg">{team.percent}%</div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-pixel-bg border-2 border-pixel-blue/30">
              <div className="font-pixel-body text-pixel-blue mb-2">MVP</div>
              <div className="flex items-center justify-center gap-3">
                <PixelAvatar src={gameResult.mvp.avatar} size={40} />
                <div className="text-left">
                  <div className="font-pixel-body text-pixel-pink">
                    {gameResult.mvp.nickname}
                  </div>
                  <div className="font-pixel-body text-xs text-gray-500">
                    涂色 {gameResult.mvp.stats.paints} 格
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-pixel-bg border border-pixel-blue/20">
                <div className="font-pixel text-lg text-pixel-blue">
                  {currentPlayer.stats?.paints || 0}
                </div>
                <div className="font-pixel-body text-xs text-gray-500">涂色数</div>
              </div>
              <div className="p-2 bg-pixel-bg border border-pixel-pink/20">
                <div className="font-pixel text-lg text-pixel-pink">
                  {currentPlayer.stats?.areasCaptured || 0}
                </div>
                <div className="font-pixel-body text-xs text-gray-500">占领区域</div>
              </div>
              <div className="p-2 bg-pixel-bg border border-pixel-green/20">
                <div className="font-pixel text-lg text-pixel-green">
                  {currentPlayer.stats?.itemsUsed || 0}
                </div>
                <div className="font-pixel-body text-xs text-gray-500">道具使用</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <PixelButton variant="success" onClick={saveArtwork}>
              <div className="flex items-center gap-2">
                <Download size={16} />
                <span>保存作品</span>
              </div>
            </PixelButton>
            <PixelButton
              variant="primary"
              onClick={() => navigate(`/replay/${gameResult.gameId}`)}
            >
              <div className="flex items-center gap-2">
                <Flag size={16} />
                <span>查看回放</span>
              </div>
            </PixelButton>
            <PixelButton
              variant="secondary"
              onClick={() => {
                resetGame();
                navigate('/match');
              }}
            >
              <div className="flex items-center gap-2">
                <Home size={16} />
                <span>返回大厅</span>
              </div>
            </PixelButton>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pixel-bg relative overflow-hidden">
      <div className="absolute inset-0 scanline-bg pointer-events-none z-10" />
      <div className="absolute inset-0 crt-effect pointer-events-none" />

      <div className="relative z-20">
        <div className="fixed top-0 left-0 right-0 bg-pixel-purple/95 border-b-4 border-pixel-blue z-30">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-6">
              {gameState.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 border-2"
                    style={{
                      backgroundColor: team.color,
                      borderColor: team.color,
                      boxShadow: `0 0 10px ${team.color}`,
                    }}
                  />
                  <div className="min-w-[100px]">
                    <div className="h-2 bg-pixel-bg border border-pixel-blue/50 overflow-hidden">
                      <motion.div
                        className="h-full"
                        style={{ backgroundColor: team.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${team.percent}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <div
                      className="font-pixel text-xs mt-1"
                      style={{ color: team.color }}
                    >
                      {team.percent}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Timer className="text-pixel-yellow" size={20} />
                <span
                  className={`font-pixel text-lg ${
                    gameState.timeLeft <= 60 ? 'text-pixel-red animate-pulse' : 'text-pixel-yellow'
                  }`}
                >
                  {formatTime(gameState.timeLeft)}
                </span>
              </div>
              {playerTeam && (
                <div
                  className="px-3 py-1 border-2 font-pixel text-xs"
                  style={{ borderColor: playerTeam.color, color: playerTeam.color }}
                >
                  {playerTeam.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-20 pb-32 px-4">
          <div className="container mx-auto flex flex-col lg:flex-row gap-6 items-start justify-center">
            <div className="flex-shrink-0 w-48 hidden lg:block">
              <div className="pixel-card p-4">
                <h3 className="font-pixel text-xs text-pixel-blue mb-4 flex items-center gap-2">
                  <Users size={14} />
                  玩家列表
                </h3>
                <div className="space-y-3">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-2 p-2 ${
                        player.id === currentPlayer.id ? 'bg-pixel-blue/10' : ''
                      }`}
                    >
                      <PixelAvatar src={player.avatar} size={28} online={player.isOnline} />
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel-body text-sm text-white truncate">
                          {player.nickname}
                        </div>
                        <div className="font-pixel-body text-xs text-gray-500">
                          {player.role === 'attacker'
                            ? '进攻'
                            : player.role === 'defender'
                            ? '防守'
                            : '支援'}
                        </div>
                      </div>
                      {player.teamId && (
                        <div
                          className="w-3 h-3"
                          style={{
                            backgroundColor: gameState.teams.find((t) => t.id === player.teamId)?.color,
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pixel-card p-4 mt-4">
                <h3 className="font-pixel text-xs text-pixel-pink mb-3">状态效果</h3>
                <div className="space-y-2">
                  {hasShield && (
                    <div className="flex items-center gap-2 text-pixel-blue">
                      <Shield size={14} />
                      <span className="font-pixel-body text-xs">护盾激活</span>
                    </div>
                  )}
                  {hasSpeedBoost && (
                    <div className="flex items-center gap-2 text-pixel-yellow">
                      <Zap size={14} />
                      <span className="font-pixel-body text-xs">加速中</span>
                    </div>
                  )}
                  {!hasShield && !hasSpeedBoost && (
                    <div className="font-pixel-body text-xs text-gray-500">无状态效果</div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div
                className={`relative border-4 ${
                  targetingMode ? 'border-pixel-red animate-pulse' : 'border-pixel-blue'
                }`}
                style={{
                  boxShadow: targetingMode
                    ? '0 0 20px rgba(231, 76, 60, 0.5)'
                    : '0 0 20px rgba(0, 212, 255, 0.3)',
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={640}
                  className="block pixelated cursor-crosshair"
                  style={{
                    imageRendering: 'pixelated',
                    width: 'min(640px, 80vw)',
                    height: 'min(640px, 80vw)',
                  }}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onMouseLeave={() => setHoveredCell(null)}
                />

                <AnimatePresence>
                  {particles.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: 0, opacity: 0, y: -20 }}
                      exit={{ opacity: 0 }}
                      className="absolute w-2 h-2 pointer-events-none"
                      style={{
                        left: p.x,
                        top: p.y,
                        backgroundColor: p.color,
                        boxShadow: `0 0 6px ${p.color}`,
                      }}
                    />
                  ))}
                </AnimatePresence>

                {targetingMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                    <div className="font-pixel text-pixel-red text-lg animate-pulse">
                      点击选择目标
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Palette size={16} className="text-pixel-blue" />
                  <span className="font-pixel-body text-sm text-gray-400">
                    按 1-8 快速切换颜色
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PAINT_COLORS.map((color, index) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`relative w-10 h-10 border-4 transition-all ${
                        selectedColor === color
                          ? 'border-white scale-110 z-10'
                          : 'border-pixel-purple hover:border-pixel-blue'
                      }`}
                      style={{
                        backgroundColor: color,
                        boxShadow:
                          selectedColor === color ? `0 0 15px ${color}` : 'none',
                      }}
                    >
                      <span className="absolute -top-1 -left-1 font-pixel text-xs bg-pixel-bg px-1">
                        {index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 w-48 space-y-4 hidden lg:block">
              <div className="pixel-card p-4">
                <h3 className="font-pixel text-xs text-pixel-green mb-4 flex items-center gap-2">
                  <Zap size={14} />
                  道具 (Q)
                </h3>
                <div className="space-y-2">
                  {inventory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleUseItem(item)}
                      disabled={item.count <= 0}
                      className={`w-full p-2 border-2 text-left transition-all ${
                        selectedItem?.id === item.id
                          ? 'border-pixel-pink bg-pixel-pink/10'
                          : item.count > 0
                          ? 'border-pixel-blue/30 hover:border-pixel-blue'
                          : 'border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-pixel-body text-xs text-white truncate">
                            {item.name}
                          </div>
                          <div className="font-pixel-body text-xs text-gray-500">
                            x{item.count}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pixel-card p-4">
                <h3 className="font-pixel text-xs text-pixel-yellow mb-3">快捷键</h3>
                <div className="font-pixel-body text-xs text-gray-400 space-y-1">
                  <div>1-8: 切换颜色</div>
                  <div>空格: 快速涂色</div>
                  <div>Q: 使用道具</div>
                  <div>ESC: 取消选择</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-pixel-purple/95 border-t-4 border-pixel-blue z-30">
          <div className="container mx-auto px-4 h-24 flex items-center justify-between gap-4">
            <div className="flex gap-2 lg:hidden">
              {PAINT_COLORS.slice(0, 4).map((color, index) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 border-2 ${
                    selectedColor === color ? 'border-white' : 'border-pixel-purple'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="flex-1 max-w-md">
              <div className="flex gap-1 mb-1">
                <button
                  onClick={() => setChatActiveTab('room')}
                  className={`px-3 py-1 font-pixel text-xs border-2 transition-colors ${
                    chatActiveTab === 'room'
                      ? 'border-pixel-green bg-pixel-green/20 text-pixel-green'
                      : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-blue'
                  }`}
                >
                  房间
                </button>
                <button
                  onClick={() => setChatActiveTab('team')}
                  className={`px-3 py-1 font-pixel text-xs border-2 transition-colors ${
                    chatActiveTab === 'team'
                      ? 'border-pixel-pink bg-pixel-pink/20 text-pixel-pink'
                      : 'border-pixel-blue/30 text-gray-500 hover:border-pixel-blue'
                  }`}
                >
                  队伍
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                  placeholder="输入聊天..."
                  className="pixel-input text-sm py-2"
                />
                <PixelButton variant="primary" onClick={sendChat} className="!px-3 !py-2">
                  <MessageSquare size={16} />
                </PixelButton>
              </div>
              <div className="flex gap-1 mt-1">
                {EMOTES.slice(0, 6).map((emote) => (
                  <button
                    key={emote.key}
                    onClick={() => sendEmote(emote.emoji)}
                    className="text-lg hover:scale-125 transition-transform"
                    title={emote.label}
                  >
                    {emote.emoji}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowChat(!showChat)}
              className="lg:hidden text-pixel-blue"
            >
              <MessageSquare size={24} />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="fixed bottom-28 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 z-40"
            >
              <div className="pixel-card p-4 max-h-64 overflow-y-auto">
                <h3 className="font-pixel text-xs text-pixel-blue mb-3">聊天</h3>
                {messages.length === 0 ? (
                  <div className="font-pixel-body text-xs text-gray-500 text-center py-4">
                    暂无消息
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages
                      .filter((msg) => msg.channel === chatActiveTab)
                      .slice(-10)
                      .map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <span
                          className="font-pixel-body font-bold"
                          style={{
                            color:
                              msg.teamId === currentPlayer.teamId
                                ? '#39ff14'
                                : '#ff2d95',
                          }}
                        >
                          {msg.nickname}:
                        </span>{' '}
                        <span className="font-pixel-body text-white">
                          {msg.type === 'emote' ? msg.content : msg.content}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
