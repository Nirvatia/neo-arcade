import type { GameProfile } from '../../logic/HypnosisService';

export interface CutsceneFrame {
	readonly width: number;
	readonly height: number;
	readonly tileSize: number;
	readonly progress: number;
	readonly profile: GameProfile;
	readonly background: string;
}

export interface Cutscene {
	draw(ctx: CanvasRenderingContext2D, frame: CutsceneFrame): void;
}