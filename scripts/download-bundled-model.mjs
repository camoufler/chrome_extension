/* global console, process */

import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const MODEL_ID = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
const HF_BASE = `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main`;
const WASM_NAME = 'Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm';
const WASM_URL =
  'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_84/base/' +
  WASM_NAME;
const SHARD_COUNT = 30;

const modelDir = resolve(process.cwd(), 'public', 'models', MODEL_ID, 'resolve', 'main');
const libDir = resolve(process.cwd(), 'public', 'models', 'libs');

const modelFiles = [
  ...Array.from({ length: SHARD_COUNT }, (_, index) => `params_shard_${index}.bin`),
  'ndarray-cache.json',
  'tensor-cache.json',
  'mlc-chat-config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'vocab.json',
  'merges.txt',
];

const downloads = [
  ...modelFiles.map((name) => ({
    url: `${HF_BASE}/${name}`,
    dest: resolve(modelDir, name),
  })),
  { url: WASM_URL, dest: resolve(libDir, WASM_NAME) },
];

async function fileExists(path) {
  try {
    const info = await stat(path);
    return info.isFile() && info.size > 0;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await fileExists(dest)) {
    console.log(`skip ${dest}`);
    return;
  }

  await mkdir(dirname(dest), { recursive: true });
  console.log(`download ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'camoufler-model-download',
    },
    redirect: 'follow',
  });

  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url} (${response.status})`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
}

const missing = [];
for (const item of downloads) {
  if (!(await fileExists(item.dest))) {
    missing.push(item);
  }
}

if (missing.length === 0) {
  console.log(`Bundled model already present: ${MODEL_ID}`);
  process.exit(0);
}

console.log(`Downloading ${missing.length} bundled model files…`);
for (const item of downloads) {
  await download(item.url, item.dest);
}
console.log(`Bundled model ready: ${MODEL_ID}`);
