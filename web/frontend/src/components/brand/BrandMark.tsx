interface BrandMarkProps {
  size?: number;
  rounded?: number;
  withGlow?: boolean;
}

export default function BrandMark({
  size = 48,
  rounded = 18,
  withGlow = true,
}: BrandMarkProps) {
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden bg-[#050505]"
      style={{
        width: size,
        height: size,
        borderRadius: rounded,
        boxShadow: withGlow
          ? '0 18px 34px rgba(10, 18, 14, 0.24), inset 0 0 0 1px rgba(255,255,255,0.04)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.72}
        height={size * 0.72}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="brandmark-glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.168 0 0 0 0 0.827 0 0 0 0 0.596 0 0 0 0.55 0"
            />
            <feBlend in="SourceGraphic" />
          </filter>
          <filter id="brandmark-glow-blue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="0 0 0 0 0.341 0 0 0 0 0.592 0 0 0 0 0.984 0 0 0 0.48 0"
            />
            <feBlend in="SourceGraphic" />
          </filter>
        </defs>

        <g filter="url(#brandmark-glow-blue)">
          <path
            d="M60 86V60"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M60 60L28 74"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M60 60L92 74"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M28 74L18 64"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M28 74L20 82"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M92 74L102 64"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M92 74L100 82"
            stroke="#4F8FFF"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </g>

        <g filter="url(#brandmark-glow-green)">
          <path
            d="M60 86V28"
            stroke="#28D39A"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M60 28L44 44"
            stroke="#28D39A"
            strokeWidth="18"
            strokeLinecap="round"
          />
          <path
            d="M60 28L76 44"
            stroke="#28D39A"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </g>

        <circle cx="60" cy="92" r="15" fill="white" />
        <circle cx="60" cy="92" r="5.5" fill="#050505" />
      </svg>
    </div>
  );
}
