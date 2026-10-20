// The TV's own apps, offered in Settings > Apps when "Show system apps" is on (launching them is allowed for any app).
import type {CatalogApp} from './catalog';

export const SYSTEM_APPS: CatalogApp[] = [
	{id: 'com.webos.app.livetv', title: 'Live TV', color: '#5d7b74'},
	{id: 'com.webos.app.lgchannels', title: 'LG Channels', color: '#f0402f'},
	{id: 'airplay', title: 'AirPlay', color: '#111111'},
	{id: 'com.webos.app.miracast', title: 'Screen Share', color: '#4458c8'},
	{id: 'com.webos.app.gameoptimizer', title: 'Game Optimizer', color: '#4d4e6c'},
	{id: 'com.palm.app.settings', title: 'TV Settings', color: '#4d4e6c'}
];
