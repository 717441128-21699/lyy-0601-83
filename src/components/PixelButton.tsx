import { motion } from 'framer-motion';
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { cn } from '../lib/utils';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: ReactNode;
}

export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  ({ variant = 'primary', className, children, ...props }, ref) => {
    const variants = {
      primary: 'text-pixel-blue hover:text-pixel-pink border-pixel-blue',
      secondary: 'text-pixel-pink hover:text-pixel-blue border-pixel-pink',
      danger: 'text-pixel-red hover:text-pixel-orange border-pixel-red',
      success: 'text-pixel-green hover:text-pixel-yellow border-pixel-green',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'pixel-btn transition-transform hover:-translate-y-0.5 active:translate-y-0',
          variants[variant],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

PixelButton.displayName = 'PixelButton';
