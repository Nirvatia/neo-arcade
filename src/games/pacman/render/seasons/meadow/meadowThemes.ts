import type { MeadowTheme } from './MeadowTheme';
import { winterTheme } from '../winter/winterTheme';
import { springTheme } from '../spring/springTheme';
import { summerTheme } from '../summer/summerTheme';
import { autumnTheme } from '../autumn/autumnTheme';

const THEMES: Readonly<Record<string, MeadowTheme>> = {
	spring: springTheme,
	summer: summerTheme,
	autumn: autumnTheme,
	winter: winterTheme
};

/** The meadow theme of a season, or null when the season is drawn another way. */
export function meadowThemeFor(season: string): MeadowTheme | null {
	return THEMES[season] ?? null;
}
