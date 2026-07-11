'use client';

import Image from 'next/image';
import { Fighter } from '@/lib/types';

const BLUR_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const SIZE_CLASS: Record<number, string> = {
  24: 'w-6 h-6',
  32: 'w-8 h-8',
  40: 'w-10 h-10',
  44: 'w-11 h-11',
  48: 'w-12 h-12',
  56: 'w-14 h-14',
  80: 'w-20 h-20',
};

interface FighterAvatarProps {
  fighter: Pick<Fighter, 'name' | 'photo_url'>;
  size: 24 | 32 | 40 | 44 | 48 | 56 | 80;
  className?: string;
}

export function FighterAvatar({ fighter, size, className = '' }: FighterAvatarProps) {
  const initials = fighter.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('');
  const sizeClass = SIZE_CLASS[size] ?? 'w-12 h-12';

  return (
    <div
      className={`relative rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0 ${sizeClass} ${className}`}
    >
      <span className="text-zinc-500 font-black text-[9px] select-none">{initials}</span>
      {fighter.photo_url && (
        <Image
          src={fighter.photo_url}
          alt={fighter.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          placeholder="blur"
          blurDataURL={BLUR_URL}
        />
      )}
    </div>
  );
}
