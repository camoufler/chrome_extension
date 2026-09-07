/* global console, process */

import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const promptsRepository = process.env.PROMPTS_REPO_PATH
  ? resolve(process.env.PROMPTS_REPO_PATH)
  : resolve(process.cwd(), '..', 'Prompts');
const sourcePrompt = resolve(promptsRepository, 'standard.json');
const targetDirectory = resolve(process.cwd(), 'public', 'prompts');
const targetPrompt = resolve(targetDirectory, 'standard.json');

execFileSync('git', ['-C', promptsRepository, 'pull', '--ff-only'], { stdio: 'inherit' });
mkdirSync(targetDirectory, { recursive: true });
copyFileSync(sourcePrompt, targetPrompt);
console.log(`Synced standard prompt from ${promptsRepository}`);