import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Zap,
  Play,
  Plus,
  RefreshCw,
  Lock,
  Unlock,
  Copy,
  LogOut,
  Crown,
  UserPlus,
  Check,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/useGameStore';
import { Room } from '../../shared/types';
import { generatePixelAvatar } from '../utils/pixelUtils';

export function Match() {
  const [selectedMode, setSelectedMode] = useState<'2v2' | '4v4' | 'free'>('2v2');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [inRoom, setInRoom] = useState(false);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { emit, on } = useSocket();
  const {
    rooms,
    isMatching,
    setIsMatching,
    currentPlayer,
    setGameState,
    currentRoom,
    setCurrentRoom,
    setCurrentRoomData,
  } = useGameStore();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    emit('rooms:get');

    const offMatchFound = on('match:found', (data: any) => {
      setIsMatching(false);
      setInRoom(true);
      setCurrentRoom(data.roomId);
    });

    const offGameStarted = on('game:started', (data: any) => {
      setGameState(data.gameState);
      setIsMatching(false);
      navigate('/game');
    });

    const offRoomCreated = on('room:created', (data: any) => {
      setInRoom(true);
      setIsHost(true);
      setShowCreateRoom(false);
      setCurrentRoom(data.room.id);
      setCurrentRoomData(data.room);
      setRoomMembers([
        {
          id: currentPlayer?.id,
          nickname: currentPlayer?.nickname,
          avatar: currentPlayer?.avatar,
          isHost: true,
        },
      ]);
    });

    const offRoomJoined = on('room:joined', (data: any) => {
      setInRoom(true);
      setIsHost(data.room.hostId === currentPlayer?.id);
      setCurrentRoom(data.room.id);
      setCurrentRoomData(data.room);
      emit('room:requestMembers', { roomId: data.room.id });
    });

    const offRoomPlayerJoined = on('room:playerJoined', (data: any) => {
      setRoomMembers((prev) => [
        ...prev,
        {
          id: data.playerId,
          nickname: data.nickname,
          avatar: generatePixelAvatar(data.playerId),
          isHost: false,
        },
      ]);
    });

    const offRoomPlayerLeft = on('room:playerLeft', (data: any) => {
      setRoomMembers((prev) => prev.filter((m) => m.id !== data.playerId));
    });

    const offRoomMembers = on('room:members', (data: any) => {
      setRoomMembers(data.members);
      setIsHost(data.members[0]?.id === currentPlayer?.id);
    });

    const offRoomError = on('room:error', (data: any) => {
      alert(data.message);
      setInRoom(false);
      setCurrentRoom(null);
      setCurrentRoomData(null);
    });

    return () => {
      offMatchFound();
      offGameStarted();
      offRoomCreated();
      offRoomJoined();
      offRoomPlayerJoined();
      offRoomPlayerLeft();
      offRoomMembers();
      offRoomError();
    };
  }, [
    emit,
    on,
    setIsMatching,
    setGameState,
    navigate,
    setCurrentRoom,
    setCurrentRoomData,
    currentPlayer,
  ]);

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  useEffect(() => {
    if (currentRoom && !inRoom) {
      const room = rooms.find((r) => r.id === currentRoom);
      if (room) {
        setInRoom(true);
        setIsHost(room.hostId === currentPlayer?.id);
        setCurrentRoomData(room);
        emit('room:requestMembers', { roomId: currentRoom });
      }
    }
  }, [currentRoom, rooms, inRoom, currentPlayer, emit, setCurrentRoomData]);

  const startMatch = () => {
    setIsMatching(true);
    emit('match:find', { mode: 'auto' });
  };

  const cancelMatch = () => {
    setIsMatching(false);
    emit('match:cancel');
  };

  const createRoom = () => {
    if (!roomName.trim()) {
      alert('请输入房间名称');
      return;
    }
    emit('room:create', { mode: selectedMode });
  };

  const joinRoom = (roomId: string) => {
    emit('room:join', { roomId });
  };

  const joinByCode = () => {
    if (joinCode.length === 6) {
      emit('room:join', { roomId: joinCode.toUpperCase() });
    }
  };

  const leaveRoom = () => {
    emit('room:leave');
    setInRoom(false);
    setCurrentRoom(null);
    setCurrentRoomData(null);
    setRoomMembers([]);
    setIsHost(false);
    emit('rooms:get');
  };

  const startGame = () => {
    if (!currentRoom) return;
    emit('game:start', { roomId: currentRoom, mode: selectedMode });
  };

  const copyRoomCode = () => {
    if (currentRoom) {
      navigator.clipboard.writeText(currentRoom);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshRooms = () => {
    emit('rooms:get');
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

  if (inRoom && currentRoom) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="pixel-card">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-pixel text-xl neon-text-blue">房间详情</h2>
                <button
                  onClick={leaveRoom}
                  className="flex items-center gap-2 text-pixel-red hover:text-pixel-orange transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-pixel-body text-sm">离开房间</span>
                </button>
              </div>

              <div className="bg-pixel-purple/50 border-4 border-pixel-blue/50 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="font-pixel text-sm text-gray-500 mb-1">房间号</div>
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-2xl text-pixel-blue tracking-widest">
                        {currentRoom}
                      </span>
                      <button
                        onClick={copyRoomCode}
                        className="p-2 hover:bg-pixel-blue/20 rounded transition-colors"
                      >
                        {copied ? (
                          <Check size={18} className="text-pixel-green" />
                        ) : (
                          <Copy size={18} className="text-pixel-blue" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-pixel text-sm text-gray-500 mb-1">游戏模式</div>
                    <span className="font-pixel text-lg text-pixel-pink">{selectedMode}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Users size={18} className="text-pixel-green" />
                  <span className="font-pixel-body text-sm text-pixel-green">
                    {roomMembers.length} / {selectedMode === '2v2' ? 4 : 8} 玩家
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-pixel text-sm text-pixel-yellow mb-4 flex items-center gap-2">
                  <UserPlus size={16} />
                  玩家列表
                </h3>
                <div className="space-y-3">
                  {roomMembers.map((member, index) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-pixel-bg border-2 border-pixel-blue/30"
                    >
                      <div className="flex items-center gap-3">
                        <PixelAvatar src={member.avatar} size={40} online />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-pixel-body text-white">{member.nickname}</span>
                            {member.isHost && (
                              <Crown size={14} className="text-pixel-yellow" />
                            )}
                          </div>
                          <div className="font-pixel-body text-xs text-gray-500">
                            {member.isHost ? '房主' : '玩家'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-pixel text-xs text-pixel-green">已就绪</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {roomMembers.length < (selectedMode === '2v2' ? 4 : 8) && (
                <div className="bg-pixel-blue/10 border-2 border-pixel-blue/30 p-4 mb-6 text-center">
                  <p className="font-pixel-body text-sm text-pixel-blue mb-2">
                    等待其他玩家加入...
                  </p>
                  <p className="font-pixel-body text-xs text-gray-500">
                    分享房间号 <span className="text-pixel-pink">{currentRoom}</span> 邀请好友
                  </p>
                </div>
              )}

              {isHost && (
                <PixelButton
                  variant="success"
                  className="w-full"
                  onClick={startGame}
                  disabled={roomMembers.length < 2}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Play size={18} />
                    <span>开始游戏</span>
                  </div>
                </PixelButton>
              )}

              {!isHost && (
                <div className="text-center py-4">
                  <p className="font-pixel-body text-sm text-gray-500">
                    等待房主开始游戏...
                  </p>
                </div>
              )}
            </div>
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
                  onClick={refreshRooms}
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
