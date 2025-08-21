// Gradient backgrounds (using your primary palette)
export const gradientBgBase = "bg-gradient-to-tr";
export const gradientBgPrimary = `${gradientBgBase} from-[var(--primary-color)] via-[var(--secondary-color)] to-[var(--tertiary-color)]`;
export const gradientBgAccent = `${gradientBgBase} from-[var(--accent)] via-yellow-600 to-yellow-500`;

// Backgrounds
export const colorsBgLight = {
  white: "bg-white text-black",
  primary: "bg-[var(--primary-color)] text-white",
  secondary: "bg-[var(--secondary-color)] text-white",
  tertiary: "bg-[var(--tertiary-color)] text-white",
  accent: "bg-[var(--accent)] text-black",
};

// Text
export const colorsText = {
  white: "text-black dark:text-slate-100",
  primary: "text-[var(--primary-color)]",
  secondary: "text-[var(--secondary-color)]",
  tertiary: "text-[var(--tertiary-color)]",
  accent: "text-[var(--accent)]",
  contrast: "dark:text-white",
};

// Outlines
export const colorsOutline = {
  primary: [colorsText.primary, "border-[var(--primary-color)]"],
  secondary: [colorsText.secondary, "border-[var(--secondary-color)]"],
  tertiary: [colorsText.tertiary, "border-[var(--tertiary-color)]"],
  accent: [colorsText.accent, "border-[var(--accent)]"],
};

// Dynamic Button Colors
export const getButtonColor = (
  color,
  isOutlined,
  hasHover,
  isActive = false
) => {
  const colors = {
    ring: {
      primary: "ring-[var(--primary-color)]/40",
      secondary: "ring-[var(--secondary-color)]/40",
      tertiary: "ring-[var(--tertiary-color)]/40",
      accent: "ring-[var(--accent)]/40",
    },
    active: {
      primary: "bg-[var(--tertiary-color)] text-white",
      secondary: "bg-[var(--primary-color)] text-white",
      tertiary: "bg-[var(--secondary-color)] text-white",
      accent: "bg-[var(--accent)] text-black",
    },
    bg: {
      primary: "bg-[var(--primary-color)] text-white",
      secondary: "bg-[var(--secondary-color)] text-white",
      tertiary: "bg-[var(--tertiary-color)] text-white",
      accent: "bg-[var(--accent)] text-black",
    },
    bgHover: {
      primary: "hover:bg-[var(--tertiary-color)]",
      secondary: "hover:bg-[var(--primary-color)]",
      tertiary: "hover:bg-[var(--secondary-color)]",
      accent: "hover:bg-yellow-600",
    },
    borders: {
      primary: "border-[var(--primary-color)]",
      secondary: "border-[var(--secondary-color)]",
      tertiary: "border-[var(--tertiary-color)]",
      accent: "border-[var(--accent)]",
    },
    text: {
      primary: "text-[var(--primary-color)]",
      secondary: "text-[var(--secondary-color)]",
      tertiary: "text-[var(--tertiary-color)]",
      accent: "text-[var(--accent)]",
    },
    outlineHover: {
      primary: "hover:bg-[var(--primary-color)] hover:text-white",
      secondary: "hover:bg-[var(--secondary-color)] hover:text-white",
      tertiary: "hover:bg-[var(--tertiary-color)] hover:text-white",
      accent: "hover:bg-[var(--accent)] hover:text-black",
    },
  };

  if (!colors.bg[color]) return color;

  const isOutlinedProcessed = isOutlined;
  const base = [colors.borders[color], colors.ring[color]];

  if (isActive) {
    base.push(colors.active[color]);
  } else {
    base.push(isOutlinedProcessed ? colors.text[color] : colors.bg[color]);
  }

  if (hasHover) {
    base.push(
      isOutlinedProcessed ? colors.outlineHover[color] : colors.bgHover[color]
    );
  }

  return base;
};
