import { tenant } from "@/lib/tenant";

interface KorexIsotipoProps {
  size?: number;
  showBackground?: boolean;
  className?: string;
}

export function KorexIsotipo({
  size = 40,
  className,
}: KorexIsotipoProps) {
  return (
    <img
      src={tenant.logoPath}
      alt={tenant.name}
      width={size}
      height={size}
      style={{ objectFit: "contain", display: "block" }}
      className={className}
    />
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
  className,
}: KorexWordmarkProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.3 }} className={className}>
      <KorexIsotipo size={size} />
      <span
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 800,
          fontSize: size * 0.56,
          color: textColor,
          letterSpacing: '0.18em',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {tenant.name}
      </span>
    </div>
  );
}
