import type { SeasonData } from '../../logic/level/SeasonCatalog';
import type { SeasonRenderBundle } from '../contracts/SeasonRenderBundle';
import { SpringRenderBundle } from './spring/SpringRenderBundle';
import { SummerRenderBundle } from './summer/SummerRenderBundle';
import { AutumnRenderBundle } from './autumn/AutumnRenderBundle';
import { SecretRenderBundle } from './secret/SecretRenderBundle';

export interface SeasonBundleRequest {
	readonly season: SeasonData;
	readonly secret: boolean;
	readonly level: number;
}

/**
 * Bundles for the seasons still drawn tile by tile. Winter has its own renderer
 * (`winter/WinterLevelRenderer`); the secret level keeps a bundle even though it is a
 * winter season by name.
 */
export function seasonRenderBundleFor(request: SeasonBundleRequest): SeasonRenderBundle {
	if (!request || !request.season) {
		console.error('seasonRenderBundleFor', 'missing request or season', request);
		throw new Error('seasonRenderBundleFor: missing request or season');
	}
	if (request.secret) {
		return new SecretRenderBundle();
	}
	if (request.season.name === 'spring') {
		return new SpringRenderBundle();
	}
	if (request.season.name === 'summer') {
		return new SummerRenderBundle();
	}
	if (request.season.name === 'autumn') {
		return new AutumnRenderBundle();
	}
	console.error('seasonRenderBundleFor', 'unknown season', request.season.name);
	throw new Error(`seasonRenderBundleFor: unknown season ${request.season.name}`);
}
