interface KorexLogoProps {
  size?: number;
  accentColor?: string;
  armColor?: string;
  className?: string;
}

export function KorexIsotipo({
  size = 32,
  accentColor = '#00D4A8',
  armColor = '#F9FAFB',
  className,
}: KorexLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KOREX"
    >
      <rect x="2"  y="5"  width="30" height="90" rx="9.5" fill={accentColor} />
      <rect x="38" y="27" width="14" height="68" rx="5.5" fill={accentColor} />
      <line x1="33" y1="43" x2="97" y2="5"  stroke={armColor} strokeWidth="13" strokeLinecap="round" />
      <line x1="33" y1="52" x2="97" y2="95" stroke={armColor} strokeWidth="13" strokeLinecap="round" />
    </svg>
  );
}

interface KorexWordmarkProps {
  size?: number;
  accentColor?: string;
  armColor?: string;
  textColor?: string;
  className?: string;
}

export function KorexWordmark({
  size = 32,
  accentColor = '#00D4A8',
  armColor = '#F9FAFB',
  textColor = '#F3F4F6',
  className,
}: KorexWordmarkProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.34 }} className={className}>
      <KorexIsotipo size={size} accentColor={accentColor} armColor={armColor} />
      <span
        style={{
          fontFamily: "'Syne', sans-serif",
          fontWeight: 800,
          fontSize: size * 0.56,
          color: textColor,
          letterSpacing: '0.18em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        KOREX
      </span>
    </div>
  );
}
