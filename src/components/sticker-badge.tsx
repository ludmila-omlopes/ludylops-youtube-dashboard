type StickerVariant =
  | "star"
  | "heart"
  | "spark"
  | "flower"
  | "bolt"
  | "burst";

const stickerStyles: Record<
  StickerVariant,
  {
    fill: string;
    shadow: string;
    accent: string;
    inner?: string;
  }
> = {
  star: {
    fill: "var(--color-yellow)",
    shadow: "var(--color-ticker-bg)",
    accent: "var(--color-accent-ink)",
  },
  heart: {
    fill: "var(--color-pink)",
    shadow: "var(--color-pink-hot)",
    accent: "var(--color-accent-ink)",
  },
  spark: {
    fill: "var(--color-paper-pink)",
    shadow: "var(--color-purple-mid)",
    accent: "var(--color-accent-ink)",
  },
  flower: {
    fill: "var(--color-sky)",
    shadow: "var(--color-blue)",
    accent: "var(--color-accent-ink)",
    inner: "var(--color-purple)",
  },
  bolt: {
    fill: "var(--color-yellow)",
    shadow: "var(--color-ticker-bg)",
    accent: "var(--color-accent-ink)",
  },
  burst: {
    fill: "var(--color-paper-warm)",
    shadow: "var(--color-yellow)",
    accent: "var(--color-accent-ink)",
  },
};

function StickerShape({
  variant,
  fill,
  accent,
  shadow,
  inner,
}: {
  variant: StickerVariant;
  fill: string;
  accent: string;
  shadow: string;
  inner?: string;
}) {
  if (variant === "star") {
    return (
      <>
        <path
          d="M50 7 61 33 89 36 68 55 74 83 50 68 26 83 32 55 11 36 39 33Z"
          fill={shadow}
          stroke={accent}
          strokeWidth="2.5"
          transform="translate(3 4)"
        />
        <path
          d="M50 7 61 33 89 36 68 55 74 83 50 68 26 83 32 55 11 36 39 33Z"
          fill={fill}
          stroke={accent}
          strokeWidth="2.5"
        />
      </>
    );
  }

  if (variant === "heart") {
    return (
      <>
        <path
          d="M50 83 17 49C8 39 8 23 21 15c10-6 22-2 29 7 7-9 19-13 29-7 13 8 13 24 4 34Z"
          fill={shadow}
          stroke={accent}
          strokeWidth="2.5"
          transform="translate(3 4)"
        />
        <path
          d="M50 83 17 49C8 39 8 23 21 15c10-6 22-2 29 7 7-9 19-13 29-7 13 8 13 24 4 34Z"
          fill={fill}
          stroke={accent}
          strokeWidth="2.5"
        />
      </>
    );
  }

  if (variant === "spark") {
    return (
      <>
        <path
          d="M49 8c3 17 10 24 25 27-15 3-22 10-25 27-3-17-10-24-25-27 15-3 22-10 25-27Zm25 35c1 8 4 12 12 13-8 1-11 5-12 13-1-8-4-12-12-13 8-1 11-5 12-13Zm-49 8c1 8 4 12 12 13-8 1-11 5-12 13-1-8-4-12-12-13 8-1 11-5 12-13Z"
          fill={shadow}
          stroke={accent}
          strokeWidth="2.5"
          transform="translate(3 4)"
        />
        <path
          d="M49 8c3 17 10 24 25 27-15 3-22 10-25 27-3-17-10-24-25-27 15-3 22-10 25-27Zm25 35c1 8 4 12 12 13-8 1-11 5-12 13-1-8-4-12-12-13 8-1 11-5 12-13Zm-49 8c1 8 4 12 12 13-8 1-11 5-12 13-1-8-4-12-12-13 8-1 11-5 12-13Z"
          fill={fill}
          stroke={accent}
          strokeWidth="2.5"
        />
      </>
    );
  }

  if (variant === "flower") {
    return (
      <>
        <g transform="translate(3 4)">
          <circle cx="50" cy="22" r="13" fill={shadow} stroke={accent} strokeWidth="2.5" />
          <circle cx="26" cy="42" r="13" fill={shadow} stroke={accent} strokeWidth="2.5" />
          <circle cx="74" cy="42" r="13" fill={shadow} stroke={accent} strokeWidth="2.5" />
          <circle cx="35" cy="69" r="13" fill={shadow} stroke={accent} strokeWidth="2.5" />
          <circle cx="65" cy="69" r="13" fill={shadow} stroke={accent} strokeWidth="2.5" />
          <circle cx="50" cy="48" r="12" fill={inner} stroke={accent} strokeWidth="2.5" />
        </g>
        <circle cx="50" cy="22" r="13" fill={fill} stroke={accent} strokeWidth="2.5" />
        <circle cx="26" cy="42" r="13" fill={fill} stroke={accent} strokeWidth="2.5" />
        <circle cx="74" cy="42" r="13" fill={fill} stroke={accent} strokeWidth="2.5" />
        <circle cx="35" cy="69" r="13" fill={fill} stroke={accent} strokeWidth="2.5" />
        <circle cx="65" cy="69" r="13" fill={fill} stroke={accent} strokeWidth="2.5" />
        <circle cx="50" cy="48" r="12" fill={inner} stroke={accent} strokeWidth="2.5" />
      </>
    );
  }

  if (variant === "bolt") {
    return (
      <>
        <path
          d="M54 8 22 52h20l-8 34 44-52H58l8-26Z"
          fill={shadow}
          stroke={accent}
          strokeWidth="2.5"
          strokeLinejoin="round"
          transform="translate(3 4)"
        />
        <path
          d="M54 8 22 52h20l-8 34 44-52H58l8-26Z"
          fill={fill}
          stroke={accent}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </>
    );
  }

  return (
    <>
      <path
        d="M50 8 59 25 78 18 74 37 92 43 78 56 92 72 72 75 74 94 56 86 50 100 42 86 24 94 27 75 8 72 22 56 8 43 26 37 22 18 41 25Z"
        fill={shadow}
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
        transform="translate(3 4)"
      />
      <path
        d="M50 8 59 25 78 18 74 37 92 43 78 56 92 72 72 75 74 94 56 86 50 100 42 86 24 94 27 75 8 72 22 56 8 43 26 37 22 18 41 25Z"
        fill={fill}
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <text
        x="50"
        y="61"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="18"
        fill={accent}
      >
        TOP
      </text>
    </>
  );
}

export function StickerBadge({
  variant,
  className = "",
  label,
}: {
  variant: StickerVariant;
  className?: string;
  label?: string;
}) {
  const { fill, shadow, accent, inner } = stickerStyles[variant];

  return (
    <div
      className={`pointer-events-none inline-flex items-center justify-center ${className}`}
      aria-hidden={label ? undefined : "true"}
      aria-label={label}
    >
      <svg viewBox="0 0 100 104" className="h-full w-full" fill="none">
        <StickerShape
          variant={variant}
          fill={fill}
          shadow={shadow}
          accent={accent}
          inner={inner}
        />
      </svg>
    </div>
  );
}
