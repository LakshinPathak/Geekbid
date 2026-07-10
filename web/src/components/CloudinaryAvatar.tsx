"use client";
import { useState } from "react";
import { CldImage } from "next-cloudinary";

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, { px: number; text: string; indicator: string }> = {
  xs: { px: 24, text: 'text-[10px]', indicator: 'h-2 w-2' },
  sm: { px: 28, text: 'text-xs', indicator: 'h-2.5 w-2.5' },
  md: { px: 44, text: 'text-sm', indicator: 'h-3 w-3' },
  lg: { px: 80, text: 'text-2xl', indicator: 'h-4 w-4' },
  xl: { px: 96, text: 'text-3xl', indicator: 'h-5 w-5' },
};

type CloudinaryAvatarProps = {
  avatarUrl?: string | null;
  avatarInitial: string;
  size?: Size;
  className?: string;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
};

export default function CloudinaryAvatar({
  avatarUrl,
  avatarInitial,
  size = 'md',
  className = '',
  showOnlineIndicator = false,
  isOnline = false,
}: CloudinaryAvatarProps) {
  const { px, text, indicator } = SIZES[size];
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const externalImgFailed = !!avatarUrl && failedUrl === avatarUrl;

  const wrapperStyle: React.CSSProperties = {
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    flexShrink: 0,
  };

  if (avatarUrl && !externalImgFailed) {
    const isCloudinaryUrl = avatarUrl.includes('res.cloudinary.com');

    if (isCloudinaryUrl) {
      const parts = avatarUrl.split('/upload/');
      const afterUpload = parts[1] ?? '';
      const segments = afterUpload.split('/');
      const publicId = segments.slice(1).join('/').replace(/\.[^/.]+$/, '') || afterUpload.replace(/\.[^/.]+$/, '');

      return (
        <div style={wrapperStyle} className={`relative ${className}`}>
          <CldImage
            src={publicId || avatarUrl}
            width={px}
            height={px}
            crop="fill"
            gravity="face"
            quality="auto"
            format="auto"
            alt={avatarInitial}
            style={{ borderRadius: '50%', border: '0.5px solid rgba(75,63,143,0.22)', objectFit: 'cover' }}
          />
          {showOnlineIndicator && (
            <span
              className={`${indicator} rounded-full absolute bottom-0 right-0 border-2 border-[#fbfaf7] ${isOnline ? 'bg-green-400' : 'bg-[#6f6a7d]'}`}
            />
          )}
        </div>
      );
    } else {
      return (
        <div style={wrapperStyle} className={`relative ${className}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl}
            alt={avatarInitial}
            width={px}
            height={px}
            onError={() => setFailedUrl(avatarUrl)}
            style={{ borderRadius: '50%', border: '0.5px solid rgba(75,63,143,0.22)', objectFit: 'cover', width: px, height: px }}
          />
          {showOnlineIndicator && (
            <span
              className={`${indicator} rounded-full absolute bottom-0 right-0 border-2 border-[#fbfaf7] ${isOnline ? 'bg-green-400' : 'bg-[#6f6a7d]'}`}
            />
          )}
        </div>
      );
    }
  }

  return (
    <div
      style={{
        ...wrapperStyle,
        background: 'rgba(75,63,143,0.12)',
        border: '0.5px solid rgba(75,63,143,0.22)',
      }}
      className={className}
    >
      <span className={`font-bold text-[#4b3f8f] select-none ${text}`}>
        {avatarInitial || '?'}
      </span>
      {showOnlineIndicator && (
        <span
          className={`${indicator} rounded-full absolute bottom-0 right-0 border-2 border-[#fbfaf7] ${isOnline ? 'bg-green-400' : 'bg-[#6f6a7d]'}`}
        />
      )}
    </div>
  );
}
