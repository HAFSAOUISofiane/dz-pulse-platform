interface DzPulseLogoProps {
  size?: number;
  className?: string;
}

export function DzPulseLogo({ size = 32, className = "" }: DzPulseLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DzPulse logo"
    >
      {/* Geometric pulse mark: horizontal baseline with a sharp upward pulse spike */}
      <rect x="2" y="15" width="5" height="2" rx="1" fill="currentColor" className="text-primary" style={{ color: "hsl(153, 60%, 25%)" }} />
      <polyline
        points="7,16 10,16 12,8 15,22 18,12 20,16 25,16"
        stroke="hsl(153, 60%, 25%)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="25" y="15" width="5" height="2" rx="1" fill="currentColor" style={{ color: "hsl(153, 60%, 25%)" }} />
    </svg>
  );
}
