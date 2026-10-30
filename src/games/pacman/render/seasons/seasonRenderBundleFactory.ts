import type { SeasonData } from '../../logic/level/SeasonCatalog';
import type { SeasonRenderBundle } from '../contracts/SeasonRenderBundle';
import { SecretRenderBundle } from './secret/SecretRenderBundle';

export interface SeasonBundleRequest {
	readonly season: SeasonData;
	readonly secret: boolean;
	readonly level: number;
}

/**
 * Bundle for the levels still drawn tile by tile: only the secret level now. The four
 * seasons are meadow themes (`meadow/MeadowLevelRenderer`).
 */
export function seasonRenderBundleFor(request: SeasonBundleRequest): SeasonRenderBundle {
	if (!request || !request.season) {
		console.error('seasonRenderBundleFor', 'missing request or season', request);
		throw new Error('seasonRenderBundleFor: missing request or season');
	}
	if (request.secret) {
		return new SecretRenderBundle();
	}
	console.error('seasonRenderBundleFor', 'unknown season', request.season.name);
	throw new Error(`seasonRenderBundleFor: unknown season ${request.season.name}`);
}
