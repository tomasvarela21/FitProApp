interface KorexIsotipoProps {
  size?: number;
  showBackground?: boolean;
  className?: string;
}

export function KorexIsotipo({
  size = 40,
  showBackground = true,
  className,
}: KorexIsotipoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="KOREX"
    >
      {/* Warm dark background */}
      {showBackground && <rect width="512" height="512" rx="112" fill="#18150d"/>}

      {/* K — left vertical bar */}
      <rect x="108" y="142" width="78" height="228" rx="39" fill="#f0c428"/>

      {/* K — upper arm */}
      <rect x="184" y="195" width="182" height="74" rx="37" fill="#f0c428"
            transform="rotate(-27 184 232)"/>

      {/* K — lower arm */}
      <rect x="184" y="243" width="182" height="74" rx="37" fill="#f0c428"
            transform="rotate(27 184 280)"/>

      {/* White chevron / arrow overlay */}
      <path
        d="M204 256 L316 150 L372 150 L274 256 L372 362 L316 362 Z"
        fill="#f0ece3"
      />

      {/* Dumbbell — bar */}
      <rect x="155" y="248" width="202" height="16" rx="8" fill="#1e1b12"/>
      {/* Left plate inner */}
      <rect x="152" y="232" width="22" height="48" rx="7" fill="#1e1b12"/>
      {/* Left plate outer */}
      <rect x="136" y="238" width="18" height="36" rx="5" fill="#1e1b12"/>
      {/* Right plate inner */}
      <rect x="338" y="232" width="22" height="48" rx="7" fill="#1e1b12"/>
      {/* Right plate outer */}
      <rect x="358" y="238" width="18" height="36" rx="5" fill="#1e1b12"/>

      {/* Person icon — inside upper chevron */}
      <circle cx="304" cy="186" r="17" fill="#1e1b12"/>
      <path d="M278 218 C278 201 330 201 330 218" fill="#1e1b12"/>

      {/* Calendar icon — inside lower chevron */}
      {/* Frame */}
      <rect x="280" y="298" width="66" height="54" rx="8" fill="none"
            stroke="#1e1b12" strokeWidth="5"/>
      {/* Top bar */}
      <line x1="280" y1="316" x2="346" y2="316" stroke="#1e1b12" strokeWidth="5"/>
      {/* Left hook */}
      <rect x="293" y="290" width="7" height="16" rx="3.5" fill="#1e1b12"/>
      {/* Right hook */}
      <rect x="326" y="290" width="7" height="16" rx="3.5" fill="#1e1b12"/>
      {/* Grid dots row 1 */}
      <rect x="291" y="325" width="8" height="8" rx="2" fill="#1e1b12"/>
      <rect x="308" y="325" width="8" height="8" rx="2" fill="#1e1b12"/>
      <rect x="325" y="325" width="8" height="8" rx="2" fill="#1e1b12"/>
      {/* Grid dots row 2 */}
      <rect x="291" y="339" width="8" height="8" rx="2" fill="#1e1b12"/>
      <rect x="308" y="339" width="8" height="8" rx="2" fill="#1e1b12"/>
      <rect x="325" y="339" width="8" height="8" rx="2" fill="#1e1b12"/>
    </svg>
  );
}

interface KorexWordmarkProps {
  size?: number;
  textColor?: string;
  showBackground?: boolean;
  className?: string;
}

export function KorexWordmark({
  size = 40,
  textColor = '#F3F4F6',
  showBackground = false,
  className,
}: KorexWordmarkProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }} className={className}>
      <KorexIsotipo size={size} showBackground={showBackground} />
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
