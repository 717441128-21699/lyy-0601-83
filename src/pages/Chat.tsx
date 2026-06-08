import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Users,
  Globe,
  Shield,
  MoreVertical,
  Flag,
  Ban,
  UserX,
} from 'lucide-react';
import { PixelButton } from '../components/PixelButton';
import { PixelAvatar } from '../components/PixelAvatar';
import { Layout } from '../components/Layout';
import { useGameStore } from '../store/useGameStore';
import { useSocket } from '../hooks/useSocket';
import { EMOTES } from '../../shared/types';

export function Chat() {
  const [activeTab, setActiveTab] = useState<'global' | 'room' | 'team'>('global');
  const [message, setMessage] = useState('');
  const [showEmotes, setShowEmotes] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentPlayer, messages, addMessage } = useGameStore();
  const { emit, on } = useSocket();

  useEffect(() => {
    if (!currentPlayer) {
      navigate('/');
    }
  }, [currentPlayer, navigate]);

  useEffect(() => {
    const offChatReceived = on('chat:receive', (msg: any) => {
      addMessage(msg);
    });

    return () => {
      offChatReceived();
    };
  }, [on, addMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!message.trim()) return;
    emit('chat:send', {
      message,
      type: 'text',
      roomId: activeTab === 'global' ? undefined : currentPlayer?.teamId,
    });
    setMessage('');
  };

  const sendEmote = (emote: string) => {
    emit('chat:send', {
      message: emote,
      type: 'emote',
      roomId: activeTab === 'global' ? undefined : currentPlayer?.teamId,
    });
    setShowEmotes(false);
  };

  const reportPlayer = (playerId: string) => {
    emit('report:player', { targetId: playerId, reason: '不当言论' });
    setMenuOpen(null);
  };

  const blockPlayer = (playerId: string) => {
    emit('player:block', { blockedPlayerId: playerId });
    setMenuOpen(null);
  };

  const tabs = [
    { id: 'global', name: '全局', icon: Globe, color: 'text-pixel-blue' },
    { id: 'room', name: '房间', icon: Users, color: 'text-pixel-green' },
    { id: 'team', name: '队伍', icon: MessageSquare, color: 'text-pixel-pink' },
  ];

  const filteredMessages = messages.filter((msg) => {
    if (activeTab === 'global') return !msg.teamId;
    if (activeTab === 'team') return msg.teamId === currentPlayer?.teamId;
    return true;
  });

  if (!currentPlayer) return null;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="pixel-card h-[calc(100vh-200px)] flex flex-col">
              <div className="flex border-b-2 border-pixel-blue/30 mb-4">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-3 border-b-4 transition-all ${
                      activeTab === tab.id
                        ? `${tab.color} border-current`
                        : 'text-gray-500 border-transparent hover:text-gray-300'
                    }`}
                  >
                    <tab.icon size={16} />
                    <span className="font-pixel text-xs">{tab.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare size={48} className="mb-4 opacity-30" />
                    <p className="font-pixel-body text-sm">暂无消息</p>
                    <p className="font-pixel-body text-xs">发送第一条消息吧！</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredMessages.map((msg, index) => {
                      const isOwn = msg.playerId === currentPlayer.id;
                      const isSystem = msg.type === 'system';

                      if (isSystem) {
                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-center py-2"
                          >
                            <span className="font-pixel-body text-xs text-gray-500 bg-pixel-bg px-3 py-1">
                              {msg.content}
                            </span>
                          </motion.div>
                        );
                      }

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                        >
                          <PixelAvatar
                            src={`data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjMWEwYTJlIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIGZpbGw9IiMwMGQ0ZmYiLz48L3N2Zz4=`}
                            size={36}
                          />
                          <div className={`flex-1 max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
                            <div className="flex items-center gap-2 mb-1">
                              {!isOwn && (
                                <>
                                  <span className="font-pixel-body text-xs text-pixel-blue">
                                    {msg.nickname}
                                  </span>
                                  <div className="relative">
                                    <button
                                      onClick={() =>
                                        setMenuOpen(menuOpen === msg.playerId ? null : msg.playerId)
                                      }
                                      className="text-gray-500 hover:text-white"
                                    >
                                      <MoreVertical size={12} />
                                    </button>
                                    <AnimatePresence>
                                      {menuOpen === msg.playerId && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.9 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          exit={{ opacity: 0, scale: 0.9 }}
                                          className="absolute right-0 top-6 bg-pixel-purple border-2 border-pixel-blue z-50 min-w-[120px]"
                                        >
                                          <button
                                            onClick={() => reportPlayer(msg.playerId)}
                                            className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-pixel-blue/10 text-pixel-red"
                                          >
                                            <Flag size={14} />
                                            <span className="font-pixel-body text-xs">举报</span>
                                          </button>
                                          <button
                                            onClick={() => blockPlayer(msg.playerId)}
                                            className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-pixel-blue/10 text-pixel-orange"
                                          >
                                            <Ban size={14} />
                                            <span className="font-pixel-body text-xs">屏蔽</span>
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </>
                              )}
                              <span className="font-pixel-body text-xs text-gray-600">
                                {new Date(msg.timestamp).toLocaleTimeString()}
                              </span>
                              {isOwn && (
                                <span className="font-pixel-body text-xs text-pixel-pink">
                                  {msg.nickname}
                                </span>
                              )}
                            </div>
                            <div
                              className={`inline-block px-4 py-2 ${
                                isOwn
                                  ? 'bg-pixel-pink/20 border-2 border-pixel-pink text-left'
                                  : 'bg-pixel-blue/20 border-2 border-pixel-blue'
                              }`}
                            >
                              {msg.type === 'emote' ? (
                                <span className="text-3xl">{msg.content}</span>
                              ) : (
                                <span className="font-pixel-body text-white">
                                  {msg.content}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t-2 border-pixel-blue/30 pt-4">
                <div className="flex items-end gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmotes(!showEmotes)}
                      className="p-2 border-2 border-pixel-blue/50 hover:border-pixel-blue transition-colors"
                    >
                      😀
                    </button>
                    <AnimatePresence>
                      {showEmotes && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute bottom-full left-0 mb-2 p-2 bg-pixel-purple border-2 border-pixel-blue grid grid-cols-5 gap-1"
                        >
                          {EMOTES.map((emote) => (
                            <button
                              key={emote.key}
                              onClick={() => sendEmote(emote.emoji)}
                              className="p-2 hover:bg-pixel-blue/10 text-xl transition-colors"
                              title={emote.label}
                            >
                              {emote.emoji}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="输入消息..."
                    className="pixel-input flex-1 !py-2"
                    maxLength={200}
                  />
                  <PixelButton variant="primary" onClick={sendMessage} className="!px-4 !py-2">
                    <Send size={16} />
                  </PixelButton>
                </div>
                <div className="flex gap-1 mt-2">
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
            </div>
          </div>

          <div className="space-y-4">
            <div className="pixel-card">
              <h3 className="font-pixel text-xs text-pixel-blue mb-4 flex items-center gap-2">
                <Users size={14} />
                在线玩家
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[currentPlayer, ...Array(5).fill(null)].map((player, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 hover:bg-pixel-blue/10 transition-colors"
                  >
                    <PixelAvatar
                      src={currentPlayer.avatar}
                      size={28}
                      online={Math.random() > 0.2}
                    />
                    <span className="font-pixel-body text-sm text-white truncate flex-1">
                      {player ? player.nickname : `玩家${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-xs text-pixel-yellow mb-4 flex items-center gap-2">
                <Shield size={14} />
                快捷指令
              </h3>
              <div className="space-y-2">
                {['干得漂亮！', '集中进攻！', '防守这边！', '需要支援！'].map((text, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMessage(text);
                      sendMessage();
                    }}
                    className="w-full p-2 text-left font-pixel-body text-sm text-gray-300 hover:bg-pixel-blue/10 border border-pixel-blue/20 hover:border-pixel-blue/50 transition-colors"
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>

            <div className="pixel-card">
              <h3 className="font-pixel text-xs text-pixel-pink mb-4">屏蔽列表</h3>
              <p className="font-pixel-body text-xs text-gray-500 mb-3">
                被屏蔽的玩家消息将不会显示
              </p>
              <div className="flex items-center gap-2">
                <UserX size={16} className="text-gray-600" />
                <span className="font-pixel-body text-xs text-gray-600">暂无屏蔽</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
