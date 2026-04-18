export const theme = {
  colors: {
    background: "#F3FAFF",
    surface: "#ffffff",
    surfaceMuted: "#E8F1FF",
    surfaceStrong: "#072B61",
    panel: "#F8FBFF",
    cardBorder: "#C7D7EE",
    divider: "#D7E3F5",
    text: "#10213A",
    textMuted: "#5B6E8A",
    textOnDark: "#F5FAFF",
    primary: "#0052CC",
    primaryStrong: "#003F9E",
    accent: "#FF7A00",
    accentMuted: "#FFF1E4",
    successBg: "#E9F2FF",
    successText: "#0052CC",
    warningBg: "#FFF3E8",
    warningText: "#B25900",
    dangerBg: "#FFF0F0",
    dangerText: "#C62828",
    neutralBg: "#EEF2F7",
    neutralText: "#5F6B7A",
    inputBg: "#FFFFFF",
    inputBorder: "#BFCFE6",
    inputBorderFocus: "#0052CC",
    scannerFrame: "#0B1F3A"
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 14
  },
  fonts: {
    heading: "PublicSans_800ExtraBold",
    headingStrong: "PublicSans_700Bold",
    ui: "Inter_600SemiBold",
    body: "Inter_400Regular",
    bodyStrong: "Inter_700Bold",
    mono: "Courier"
  },
  shadow: {
    shadowColor: "#072B61",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3
  }
} as const;
