import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { PlayerService } from '../actors/PlayerService';
import { GhostService } from '../actors/GhostService';
import { ScoreModel } from './ScoreModel';
import { LevelProgress } from './LevelProgress';
import { CombatService } from '../rules/CombatService';
import { FruitService } from '../bonuses/FruitService';
import { GoldenEggService } from '../bonuses/GoldenEggService';
import { HypnosisService } from '../rules/HypnosisService';
import { SpawnLocator } from '../maze/SpawnLocator';
import { LairCodeService } from '../rules/LairCodeService';
import { EchoCloneService } from '../bonuses/EchoCloneService';
import { DoomBossService } from '../doom/DoomBossService';
import { DoomAbilityService } from '../doom/DoomAbilityService';
import { BossRewardService } from '../bonuses/BossRewardService';
import type { GameProfile } from '../rules/HypnosisService';
import type { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { seasonModifiers } from './SeasonCatalog';
import type { SeasonData } from './SeasonCatalog';

/** Boss and weapons of the hell level. */
export interface DoomSession {
	readonly boss: DoomBossService;
	readonly abilities: DoomAbilityService;
}

/**
 * Everything one level runs on, built together and never partially: the maze, the actors
 * and every rule service. A new session is built for every level; nothing in it survives
 * to the next one except what `LevelLoader` carries over explicitly (score, lives).
 */
export interface LevelSession {
	readonly season: SeasonData;
	readonly hell: boolean;
	readonly secret: boolean;
	readonly grid: GridService;
	readonly score: ScoreModel;
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly ghosts: GhostService;
	readonly combat: CombatService;
	readonly fruit: FruitService;
	readonly egg: GoldenEggService;
	readonly hypnosis: HypnosisService;
	readonly echo: EchoCloneService;
	readonly lairCode: LairCodeService;
	/** Present on the hell level only. */
	readonly doom: DoomSession | null;
	/** Boss levels only: the bonus life and the exit offered when the boss dies. */
	readonly bossReward: BossRewardService | null;
}

export interface LevelSessionRequest {
	readonly events: EventBus<PacmanEventMap>;
	readonly level: number;
	readonly profile: GameProfile;
	readonly season: SeasonData;
	readonly hell: boolean;
	readonly secret: boolean;
	readonly godMode: boolean;
}

export function buildLevelSession(request: LevelSessionRequest): LevelSession {
	const { events, level, profile, season, hell, secret } = request;
	const grid = new GridService(new GridModel(season.grid));
	if (hell) {
		grid.setLairOpen(true);
	}
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const locator = new SpawnLocator(grid, progress);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	const lairCode = new LairCodeService(level, events);
	const hypnosis = new HypnosisService(score, lairCode);
	const combat = new CombatService(player, ghosts, progress, score, events, hypnosis, lairCode);
	const fruit = new FruitService(profile, level, grid, locator, progress, score, events);
	const egg = new GoldenEggService(level, grid, lairCode, progress, events, score);
	const echo = new EchoCloneService(grid, progress, locator, events);
	let doom: DoomSession | null = null;
	if (hell) {
		const bossSpawn = grid.bossSpawn();
		if (!bossSpawn) {
			console.error('buildLevelSession', 'boss spawn tile DB is not found');
			throw new Error('buildLevelSession: boss spawn tile DB is not found');
		}
		const boss = new DoomBossService(grid, bossSpawn);
		const abilities = new DoomAbilityService(grid, boss);
		abilities.setGodMode(request.godMode);
		doom = { boss, abilities };
	}
	combat.setProfile(profile);
	combat.setHellMode(hell);
	player.setTrainMode(secret);
	ghosts.setTrainMode(secret);
	combat.setSecretMode(secret);
	const mods = seasonModifiers(season.name);
	combat.setPowerDuration(mods.powerDuration);
	fruit.setFruitDuration(mods.fruitDuration);
	ghosts.setSpeedModifier(mods.ghostSpeedModifier);
	player.setSpeedModifier(mods.playerSpeedModifier);
	return {
		season,
		hell,
		secret,
		grid,
		score,
		progress,
		player,
		ghosts,
		combat,
		fruit,
		egg,
		hypnosis,
		echo,
		lairCode,
		doom,
		bossReward: hell ? new BossRewardService(grid, events) : null
	};
}

/** Full reset at the start of a game or a fresh attempt. */
export function resetLevelSession(session: LevelSession): void {
	session.player.reset();
	session.progress.reset();
	session.ghosts.reset();
	session.combat.reset();
	session.fruit.reset();
	session.egg.reset();
	session.hypnosis.reset();
	session.echo.reset();
	session.doom?.boss.reset();
	session.doom?.abilities.reset();
	session.bossReward?.reset();
	session.lairCode.reset();
}

/** Reset after a level change: score and lives were carried over and must stay. */
export function resetForNextLevel(session: LevelSession): void {
	session.player.reset();
	session.progress.resetDots();
	session.ghosts.reset();
	session.fruit.reset();
	session.egg.reset();
	session.hypnosis.reset();
	session.echo.reset();
	session.doom?.boss.reset();
	session.doom?.abilities.reset();
	session.bossReward?.reset();
	session.combat.nextLevel();
}
