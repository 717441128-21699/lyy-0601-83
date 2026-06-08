import { motion } from 'framer-motion';

interface PixelAvatarProps {
  src: string;
  size?: number;
  className?: string;
  online?: boolean;
}

export function PixelAvatar({ src, size = 48, className = '', online }: PixelAvatarProps) {
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full h-full border-2 border-pixel-blue overflow-hidden"
        style={{
          imageRendering: 'pixelated',
          boxShadow: '2px 2px 0 0 rgba(0, 212, 255, 0.5)',
        }}
      >
        <img
          src={src}
          alt="avatar"
          className="w-full h-full pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
      </motion.div>
      {online !== undefined && (
        <div
          className={`absolute -bottom-1 -right-1 w-3 h-3 border-2 border-pixel-purple ${
            online ? 'bg-pixel-green' : 'bg-gray-600'
          }`}
        />
      )}
    </div>
  );
}
