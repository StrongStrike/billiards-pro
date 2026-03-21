import { cn } from "@/lib/utils";

export function TableIllustration({
  accentColor,
  dimmed = false,
  className,
}: {
  accentColor: string;
  dimmed?: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 200"
      className={cn("h-auto w-full drop-shadow-[0_10px_14px_rgba(0,0,0,0.3)]", className)}
      role="img"
      aria-label="Billiard table illustration"
    >
      <defs>
        <linearGradient id={`felt-${accentColor}`} x1="0%" x2="100%">
          <stop offset="0%" stopColor={dimmed ? "#5f6c79" : "#0f8d68"} />
          <stop offset="100%" stopColor={dimmed ? "#7b8897" : accentColor} />
        </linearGradient>
        <linearGradient id={`wood-${accentColor}`} x1="0%" x2="100%">
          <stop offset="0%" stopColor="#3a2416" />
          <stop offset="100%" stopColor="#6c4124" />
        </linearGradient>
      </defs>
      <g transform="translate(20 20)">
        <polygon points="40 10 240 10 280 44 82 44" fill={`url(#wood-${accentColor})`} />
        <polygon points="36 18 236 18 270 46 72 46" fill={`url(#felt-${accentColor})`} />
        <polygon points="72 46 270 46 242 132 46 132" fill={`url(#wood-${accentColor})`} />
        <polygon points="80 54 256 54 232 122 58 122" fill={`url(#felt-${accentColor})`} />
        <line x1="170" y1="56" x2="212" y2="118" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
        <line x1="200" y1="70" x2="144" y2="110" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
        <circle cx="148" cy="98" r="6" fill="white" />
        <circle cx="112" cy="92" r="5" fill="#f59e0b" />
        <circle cx="124" cy="98" r="5" fill="#22c55e" />
        <circle cx="136" cy="92" r="5" fill="#38bdf8" />
        <rect x="56" y="126" width="16" height="36" rx="4" fill="#151515" />
        <rect x="118" y="126" width="16" height="36" rx="4" fill="#151515" />
        <rect x="208" y="126" width="16" height="36" rx="4" fill="#151515" />
        <rect x="246" y="126" width="16" height="36" rx="4" fill="#151515" />
      </g>
    </svg>
  );
}
