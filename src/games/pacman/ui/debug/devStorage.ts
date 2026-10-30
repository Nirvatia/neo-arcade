/** Per-viewer dev panel memory (window positions, open groups). Never required to work. */
export function loadDev<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(`pacman.dev.${key}`);
		return raw === null ? fallback : (JSON.parse(raw) as T);
	} catch {
		return fallback;
	}
}

export function saveDev(key: string, value: unknown): void {
	try {
		localStorage.setItem(`pacman.dev.${key}`, JSON.stringify(value));
	} catch {
		// storage blocked or full: the panels just forget
	}
}
