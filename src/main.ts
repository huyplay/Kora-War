import { gameSession } from './services/game-session';
await gameSession.initialize();
await import('./app/bootstrap');
