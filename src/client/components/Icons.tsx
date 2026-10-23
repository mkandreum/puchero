import type { SVGProps } from 'react';

const base = (p: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p
});

export const IconSun = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconPot = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 10h16v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
    <path d="M2 10h2M20 10h2M9 6c0-1 1-1.5 1-2.5M14 6c0-1 1-1.5 1-2.5" />
  </svg>
);
export const IconFlame = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-7.5z" />
  </svg>
);
export const IconUser = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
);
export const IconDice = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
    <circle cx="8.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="15.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="8.5" r="1" fill="currentColor" />
    <circle cx="8.5" cy="15.5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </svg>
);
export const IconArrow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconCheck = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 12l5 5L20 6" />
  </svg>
);
export const IconTrash = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
  </svg>
);
export const IconCalendar = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </svg>
);
export const IconHeart = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill={filled ? 'currentColor' : 'none'} />
  </svg>
);
export const IconShare = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 13v5.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V13" />
  </svg>
);
export const IconSearch = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </svg>
);
export const IconDrop = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)}>
    <path d="M12 3.5c3 4 6 7.2 6 10.7a6 6 0 0 1-12 0c0-3.5 3-6.7 6-10.7z" fill={filled ? 'currentColor' : 'none'} />
  </svg>
);
export const IconBell = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />
  </svg>
);
export const IconTimer = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <circle cx="12" cy="13.5" r="7" />
    <path d="M12 9.5v4l2.5 2M10 3h4" />
  </svg>
);
export const IconThumb = ({ down, filled, ...p }: SVGProps<SVGSVGElement> & { down?: boolean; filled?: boolean }) => (
  <svg {...base(p)} style={{ ...(p.style || {}), transform: down ? 'scaleY(-1)' : undefined }}>
    <path d="M7 10.5v9H4.5v-9zM7 10.5l4-7.5c1.5 0 2.5 1 2.2 2.6L12.6 9h5.2a2 2 0 0 1 2 2.4l-1.3 6.4a2 2 0 0 1-2 1.7H7" fill={filled ? 'currentColor' : 'none'} />
  </svg>
);
export const IconPlus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconMinus = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);
export const IconCamera = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.4-2h4.6l1.4 2h1.8A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);
export const IconRepeat = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M4 12a7 7 0 0 1 12-5l2.5 2.5M18.5 4v5.5H13M20 12a7 7 0 0 1-12 5l-2.5-2.5M5.5 20v-5.5H11" />
  </svg>
);
export const IconSnow = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  </svg>
);
export const IconPlay = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </svg>
);
export const IconPause = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M8 5v14M16 5v14" />
  </svg>
);
export const IconX = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconCart = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M3 4h2.5l2 11h10.5l2-8H7" />
    <circle cx="9.5" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </svg>
);
export const IconTrophy = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6H4.5a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M8.5 20.5h7M9.5 17h5v3.5h-5z" />
  </svg>
);
export const IconSwap = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base(p)}>
    <path d="M7 4 4 7l3 3M4 7h12M17 20l3-3-3-3M20 17H8" />
  </svg>
);
