import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Zap, Play, Plus, RefreshCw, Lock, Unlock } from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { Layout } from '../components/Layout';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/useGameStore';
import { Room } from '../../shared/types';
import { formatTime } from '../utils/pixelUtils';

export function Match() {
  const [selectedMode, setSelectedMode] = useState<'2v2' | '4v4' | 'free'>('2v2');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const { rooms, isMatching, setIsMatching, currentPlayer, setGameState } = useGameStore();

  useEffect(() => {
    emit('rooms:get');

    const offMatchFound = on('match:found', (data: any) => {
      setIsMatching(false);
    });

    const offGameStarted = on('game:started', (data: any) => {
      setGameState(data.gameState);
      navigate('/game');
    });

    return () => {
      offMatchFound();
      offGameStarted();
    };
  }, [emit, on, setIsMatching, setGameState, navigate]);

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  const startMatch = () => {
    setIsMatching(true);
    emit('match:find', { mode: 'auto' });
  };

  const cancelMatch = () => {
    setIsMatching(false);
    emit('match:cancel');
  };

  const createRoom = () => {
    if (!roomName) return;
    emit('room:create', { mode: selectedMode });
    setShowCreateRoom(false);
    setRoomName('');
  };

  const joinRoom = (roomId: string) => {
    emit('room:join', { roomId });
  };

  const joinByCode = () => {
    if (joinCode.length === 6) {
      emit('room:join', { roomId: joinCode.toUpperCase() });
    }
  };

  const modeOptions = [
    { id: '2v2', label: '2v2', desc: '4人对战', icon: Users, color: 'text-pixel-blue' },
    { id: '4v4', label: '4v4', desc: '8人混战', icon: Zap, color: 'text-pixel-pink' },
    { id: 'free', label: '自由', desc: '无限制', icon: Play, color: 'text-pixel-green' },
  ];

  if (isMatching) {
    return (
      <Layout>
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="relative w-32 h-32 mx-auto mb-8">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 border-4 border-pixel-pink"
                  style={{
                    clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
                  }}
                  animate={{
                    rotate: i * 45,
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-pixel text-2xl neon-text-blue">匹配中</span>
              </div>
            </div>

            <p className="font-pixel-body text-pixel-blue text-lg mb-2">正在寻找对手...</p>
            <p className="font-pixel-body text-gray-500 text-sm mb-8">
              请耐心等待，预计等待时间 30 秒
            </p>

            <PixelButton variant="danger" onClick={cancelMatch}>
              取消匹配
            </PixelButton>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="pixel-card">
              <h2 className="font-pixel text-lg neon-text-blue mb-4">快速匹配</h2>
              <p className="font-pixel-body text-gray-400 mb-6">
                系统将自动为你匹配实力相近的对手
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {modeOptions.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setSelectedMode(mode.id as any)}
                    className={`p-4 border-4 transition-all ${
                      selectedMode === mode.id
                        ? 'border-pixel-pink bg-pixel-pink/10'
                        : 'border-pixel-blue/30 hover:border-pixel-blue'
                    }`}
                  >
                    <mode.icon className={`mx-auto mb-2 ${mode.color}`} size={24} />
                    <div className={`font-pixel text-sm ${mode.color}`}>{mode.label}</div>
                    <div className="font-pixel-body text-xs text-gray-500">{mode.desc}</div>
                  </button>
                ))}
              </div>

              <PixelButton variant="primary" className="w-full" onClick={startMatch}>
                <div className="flex items-center justify-center gap-2">
                  <Zap size={16} />
                  <span>开始匹配</span>
                </div>
              </PixelButton>
            </div>

            <div className="pixel-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-pixel text-lg neon-text-pink">房间列表</h2>
                <button
                  onClick={() => emit('rooms:get')}
                  className="text-pixel-blue hover:text-pixel-pink transition-colors"
                >
                  <RefreshCw size={20} />
                </button>
              </div>

              <AnimatePresence>
                {rooms.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Users className="mx-auto text-gray-600 mb-4" size={48} />
                    <p className="font-pixel-body text-gray-500">暂无房间，创建一个吧！</p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map((room: Room) => (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 bg-pixel-bg border-2 border-pixel-blue/30 hover:border-pixel-blue transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-pixel-purple border-2 border-pixel-blue flex items-center justify-center">
                            {room.hasPassword ? (
                              <Lock className="text-pixel-yellow" size={20} />
                            ) : (
                              <Unlock className="text-pixel-green" size={20} />
                            )}
                          </div>
                          <div>
                            <div className="font-pixel-body text-pixel-blue">{room.name}</div>
                            <div className="font-pixel-body text-xs text-gray-500">
                              {room.mode} · {room.currentPlayers}/{room.maxPlayers}人 · 房间号: {room.id}
                            </div>
                          </div>
                        </div>
                        <PixelButton
                          variant="success"
                          onClick={() => joinRoom(room.id)}
                          disabled={room.status !== 'waiting' || room.currentPlayers >= room.maxPlayers}
                        >
                          {room.status === 'playing' ? '游戏中' : '加入'}
                        </PixelButton>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="space-y-6">
            <div className="pixel-card">
              <h2 className="font-pixel text-lg neon-text-green mb-4">创建房间</h2>
              {showCreateRoom ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="输入房间名称..."
                    className="pixel-input"
                    maxLength={20}
                  />
                  <div className="flex gap-2">
                    <PixelButton variant="primary" className="flex-1" onClick={createRoom}>
                      创建
                    </PixelButton>
                    <PixelButton
                      variant="secondary"
                      onClick={() => setShowCreateRoom(false)}
                    >
                      取消
                    </PixelButton>
                  </div>
                </div>
              ) : (
                <PixelButton variant="success" className="w-full" onClick={() => setShowCreateRoom(true)}>
                  <div className="flex items-center justify-center gap-2">
                    <Plus size={16} />
                    <span>创建房间</span>
                  </div>
                </PixelButton>
              )}
            </div>

            <div className="pixel-card">
              <h2 className="font-pixel text-lg neon-text-yellow mb-4">输入房间号</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="6位房间号..."
                  className="pixel-input text-center font-pixel text-lg tracking-widest"
                  maxLength={6}
                />
                <PixelButton
                  variant="secondary"
                  className="w-full"
                  onClick={joinByCode}
                  disabled={joinCode.length !== 6}
                >
                  加入房间
                </PixelButton>
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-sm text-pixel-blue mb-3">游戏规则</h3>
              <ul className="font-pixel-body text-sm text-gray-400 space-y-2">
                <li>• 点击格子涂色，占领区域</li>
                <li>• 连续5×5格获得速度加成</li>
                <li>• 使用道具干扰对手</li>
                <li>• 5分钟内占领最多获胜</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
