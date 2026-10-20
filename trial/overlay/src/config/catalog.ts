// Catalogue of apps the launcher knows how to show without any privileged access.
//
// A sideloaded web app on webOS 6 is not allowed to list installed apps, and it
// cannot read other apps' icon files, so we ship our own list and icon copies
// (public/icons/apps/<id>.png). At runtime the catalogue is filtered with
// applicationManager/getAppLoadStatus, which *is* permitted, so only apps that
// actually exist on the TV are offered. Entries without an icon fall back to a
// monogram tile in their brand colour.
//
// The list is deliberately broad and international: an entry for an app a TV
// doesn't have costs nothing. To add apps, change the defaults, or both, without
// editing this file, create src/config/catalog.local.ts (git-ignored); see
// catalog.local.example.ts.

export interface CatalogApp {
	id: string;
	title: string;
	/** file name under icons/apps/ (omit for a monogram tile) */
	icon?: string;
	/** monogram background when there is no icon */
	color?: string;
}

/** Shape of the optional src/config/catalog.local.ts. */
export interface LocalCatalog {
	/** extra apps, or replacements for entries with the same id */
	EXTRA_APPS?: CatalogApp[];
	/** replaces DEFAULT_APP_IDS */
	DEFAULT_APP_IDS?: string[];
}

const BASE_CATALOG: CatalogApp[] = [
	{id: "com.disney.disneyplus-prod", title: "Disney+"},
	{id: "com.apple.appletv", title: "Apple TV"},
	{id: "com.apple.applemusic", title: "Apple Music"},
	{id: "hulu", title: "Hulu"},
	{id: "org.jellyfin.webos", title: "Jellyfin"},
	{id: "com.wbd.stream", title: "HBO Max"},
	{id: "com.peacock.tv", title: "Peacock"},
	{id: "com.tubitv.ott.tubi", title: "Tubi"},

	{id: 'youtube.leanback.v4', title: 'YouTube', icon: 'youtube.leanback.v4.png'},
	{id: 'netflix', title: 'Netflix', color: '#b1060f'},
	{id: 'amazon', title: 'Prime Video', icon: 'amazon.png'},
	{id: 'cdp-30', title: 'Plex', icon: 'cdp-30.png'},
	{id: 'com.webos.app.browser', title: 'Browser', icon: 'com.webos.app.browser.png'},
	{id: 'com.webos.app.mediadiscovery', title: 'Media Player', icon: 'com.webos.app.mediadiscovery.png'},
	{id: 'org.webosbrew.hbchannel', title: 'Homebrew', icon: 'org.webosbrew.hbchannel.png'}
];

/** Apps shown on a fresh install, in row order. Anything not installed is skipped. */
const BASE_DEFAULT_APP_IDS: string[] = [
	'youtube.leanback.v4', 'netflix', 'amazon', 'cdp-30'
];

// Vite resolves this at build time; it's an empty object when the file doesn't exist.
const localModules = import.meta.glob<LocalCatalog>('./catalog.local.ts', {eager: true});
const local: LocalCatalog = localModules['./catalog.local.ts'] || {};

function mergeCatalog (base: CatalogApp[], extra: CatalogApp[]): CatalogApp[] {
	const extraIds = extra.map((a) => a.id);
	return base.filter((a) => extraIds.indexOf(a.id) === -1).concat(extra);
}

export const APP_CATALOG: CatalogApp[] = mergeCatalog(BASE_CATALOG, local.EXTRA_APPS || []);
export const DEFAULT_APP_IDS: string[] = local.DEFAULT_APP_IDS || BASE_DEFAULT_APP_IDS;
