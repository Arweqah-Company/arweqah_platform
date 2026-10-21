import { FoundationSeeder } from './foundation.seeder';
import { runWithSeedApp } from './run-seeder';

runWithSeedApp(['log', 'warn', 'error'], (app) => app.get(FoundationSeeder, { strict: false }).run());
