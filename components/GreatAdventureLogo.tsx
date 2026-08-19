export function GreatAdventureLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 280 168"
      role="img"
      aria-label="Six Flags Great Adventure"
      className={className}
    >
      <path
        d="M28 78c28-46 196-46 224 0"
        fill="none"
        stroke="#f4a025"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M36 84c26-40 182-40 208 0"
        fill="none"
        stroke="#f2d44a"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M44 90c24-34 168-34 192 0"
        fill="none"
        stroke="#2f9a4a"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M52 96c22-28 154-28 176 0"
        fill="none"
        stroke="#5eb3e4"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {[40, 78, 116, 154, 192, 230].map((x, index) => (
        <polygon
          key={x}
          fill="#f2d44a"
          points="0,-8 2.4,-2.4 8,-2.2 3.4,1.6 5.2,7.4 0,4 -5.2,7.4 -3.4,1.6 -8,-2.2 -2.4,-2.4"
          transform={`translate(${x} ${18 + Math.abs(index - 2.5) * 4})`}
        />
      ))}
      <text
        x="140"
        y="58"
        textAnchor="middle"
        fill="#1c5fb8"
        fontSize="11"
        fontWeight="800"
        letterSpacing="4"
        fontFamily="var(--font-sans), ui-sans-serif, system-ui"
      >
        SIX FLAGS
      </text>
      <text
        x="140"
        y="118"
        textAnchor="middle"
        fill="#1c5fb8"
        fontSize="32"
        fontWeight="700"
        fontFamily="var(--font-display), ui-rounded, system-ui"
      >
        Great
      </text>
      <text
        x="140"
        y="150"
        textAnchor="middle"
        fill="#1c5fb8"
        fontSize="32"
        fontWeight="700"
        fontFamily="var(--font-display), ui-rounded, system-ui"
      >
        Adventure
      </text>
    </svg>
  );
}
