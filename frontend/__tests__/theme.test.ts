import { THEME_PALETTES, COLORS } from '../src/styles/theme';

describe('Theme System', () => {
  it('should have complete dark and light palettes with map tokens', () => {
    expect(THEME_PALETTES.dark).toBeDefined();
    expect(THEME_PALETTES.light).toBeDefined();

    // Verify dark map style
    expect(THEME_PALETTES.dark.mapStyleUrl).toContain('dark-matter');
    expect(THEME_PALETTES.dark.isDark).toBe(true);

    // Verify light map style
    expect(THEME_PALETTES.light.mapStyleUrl).toContain('positron');
    expect(THEME_PALETTES.light.isDark).toBe(false);

    // Verify route line colors exist and differ for contrast
    expect(THEME_PALETTES.dark.mapRouteColor).toBe('#38BDF8');
    expect(THEME_PALETTES.light.mapRouteColor).toBe('#2563EB');

    // Verify backward compatible COLORS
    expect(COLORS.bgDark).toBe(THEME_PALETTES.dark.bgDark);
  });
});
