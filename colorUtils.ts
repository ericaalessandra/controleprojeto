
/**
 * Utilitários de Cor para Acessibilidade (WCAG 2.1)
 */

export const getLuminance = (hex: string): number => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const a = [r, g, b].map((v) => {
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });

    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
};

export const getContrastRatio = (color1: string, color2: string): number => {
    const lum1 = getLuminance(color1);
    const lum2 = getLuminance(color2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    return (brightest + 0.05) / (darkest + 0.05);
};

export const adjustColorBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;

    return '#' + (0x1000000 +
        (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 0 ? 0 : B) : 255)
    ).toString(16).slice(1);
};

/**
 * Garante que a cor do texto tenha contraste suficiente contra o fundo.
 * Retorna uma versão ajustada da cor de fundo se o contraste for insuficiente.
 */
export const ensureContrast = (bgColor: string, fgColor: string = '#ffffff', threshold: number = 4.5): string => {
    let currentBg = bgColor;
    let ratio = getContrastRatio(currentBg, fgColor);

    // Se o contraste for baixo e o fundo for claro, escurecemos o fundo
    if (ratio < threshold) {
        const isBgLight = getLuminance(currentBg) > 0.5;
        let attempts = 0;
        while (ratio < threshold && attempts < 10) {
            currentBg = adjustColorBrightness(currentBg, isBgLight ? -10 : 10);
            ratio = getContrastRatio(currentBg, fgColor);
            attempts++;
        }
    }

    return currentBg;
};
