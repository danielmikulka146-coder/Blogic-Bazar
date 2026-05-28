"use client";

type Props = {
  size?: number;
  /** Kept for back-compat with old callers — má-li ho někdo, prostě ignorujeme. */
  withTagline?: boolean;
};

export function BlogicLogoHalftone({ size = 28 }: Props) {
  const W = 345;
  const H = 110;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={(W / H) * size}
      height={size}
      role="img"
      aria-label="Blogic"
      style={{ display: "block" }}
    >
      <defs>
        <pattern id="bl-halftone" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.7" fill="#1a1a1a" />
        </pattern>
      </defs>
      <text
        x="0"
        y="92"
        fontSize="115"
        fontWeight="800"
        fontFamily="ui-sans-serif, -apple-system, system-ui, sans-serif"
        letterSpacing="-5"
        fill="#FF5722"
      >
        b
      </text>
      <text
        x="62"
        y="92"
        fontSize="115"
        fontWeight="800"
        fontFamily="ui-sans-serif, -apple-system, system-ui, sans-serif"
        letterSpacing="-5"
        fill="url(#bl-halftone)"
      >
        log
      </text>
      <rect x="240" y="36" width="16" height="60" rx="6" fill="url(#bl-halftone)" />
      <circle cx="248" cy="22" r="11" fill="#FF5722" />
      <text
        x="262"
        y="92"
        fontSize="115"
        fontWeight="800"
        fontFamily="ui-sans-serif, -apple-system, system-ui, sans-serif"
        letterSpacing="-5"
        fill="url(#bl-halftone)"
      >
        c
      </text>
    </svg>
  );
}
