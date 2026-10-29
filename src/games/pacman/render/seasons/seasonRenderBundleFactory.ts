import type { SeasonData } from '../../logic/SeasonCatalog';
import type { SeasonRenderBundle } from '../contracts/SeasonRenderBundle';
import { SpringRenderBundle } from './spring/SpringRenderBundle';
import { SummerRenderBundle } from './summer/SummerRenderBundle';
import { AutumnRenderBundle } from './autumn/AutumnRenderBundle';
import { WinterRenderBundle } from './winter/WinterRenderBundle';
import { SecretRenderBundle } from './secret/SecretRenderBundle';

export interface SeasonBundleRequest {
	readonly season: SeasonData;
	readonly secret: boolean;
	readonly level: number;
}

export function seasonRenderBundleFor(request: SeasonBundleRequest): SeasonRenderBundle {
	if (!request || !request.season) {
		console.error('seasonRenderBundleFor', 'missing request or season', request);
		throw new Error('seasonRenderBundleFor: missing request or season');
	}
	if (request.secret) {
		return new SecretRenderBundle(request.season.palette);
	}
	if (request.season.name === 'spring') {
		return new SpringRenderBundle(request.season.palette);
	}
	if (request.season.name === 'summer') {
		return new SummerRenderBundle(request.season.palette);
	}
	if (request.season.name === 'autumn') {
		return new AutumnRenderBundle(request.season.palette);
	}
	if (request.season.name === 'winter') {
		return new WinterRenderBundle(request.season.palette);
	}
	console.error('seasonRenderBundleFor', 'unknown season', request.season.name);
	throw new Error(`seasonRenderBundleFor: unknown season ${request.season.name}`);
}
