import { CreateExtensionServiceWorkerMLCEngine } from '@mlc-ai/web-llm';
import { debug, debugVerbose } from './debug';
import { BUNDLED_MODEL_ID, getBundledEngineConfig } from './model';
import {
	looksLikeNonRewrite,
	RETRY_SYSTEM,
	shapeErroringInput,
	stripRewriteFiller,
	wrapRewriteUserMessage,
} from './rewrite';

export const WEBLLM_PORT_NAME = 'web_llm_service_worker';

interface StandardPrompt {
  system_prompt: string;
}

let standardPromptPromise: Promise<string> | null = null;

let enginePromise: ReturnType<typeof CreateExtensionServiceWorkerMLCEngine> | null = null;
let loadedModelId: string | null = null;

export async function stopParaphrasing(): Promise<void> {
	if (!enginePromise) {
		debug('webllm: interrupt skipped, no engine');
		return;
	}

	try {
		debug('webllm: interrupt');
		const engine = await enginePromise;
		await engine.interruptGenerate();
	} catch (cause) {
		debug('webllm: interrupt failed', cause);
		return;
	}
}

export async function paraphraseText(text: string, modelId: string = BUNDLED_MODEL_ID): Promise<string> {
	const resolvedModelId = BUNDLED_MODEL_ID;
	if (modelId !== resolvedModelId) {
		debug('webllm: ignore requested model', modelId);
	}

	if (!enginePromise || loadedModelId !== resolvedModelId) {
		debug('webllm: create engine', resolvedModelId);
		loadedModelId = resolvedModelId;
		enginePromise = CreateExtensionServiceWorkerMLCEngine(
			resolvedModelId,
			getBundledEngineConfig(),
		);
	} else {
		debug('webllm: reuse engine', resolvedModelId);
	}

	const currentEnginePromise = enginePromise;

	try {
		const engine = await currentEnginePromise;
		const systemPrompt = await getStandardSystemPrompt();
		debug('webllm: prompt loaded', { length: systemPrompt.length });
		debugVerbose('webllm: prompt', systemPrompt);
		const wrapped = wrapRewriteUserMessage(text);
		debug('webllm: generate', {
			modelId: resolvedModelId,
			temperature: 0,
			top_p: 0.9,
			max_tokens: 512,
			inputLength: text.length,
		});
		debugVerbose('webllm: input', wrapped);
		let output = await completeRewrite(engine, systemPrompt, wrapped);
		debug('webllm: response', { outputLength: output.length });
		debugVerbose('webllm: response text', output);

		if (looksLikeNonRewrite(output, text)) {
			debug('webllm: non-rewrite detected, retrying');
			const shaped = wrapRewriteUserMessage(shapeErroringInput(text));
			const strictPrompt = `${RETRY_SYSTEM}\n\n${systemPrompt}`;
			debugVerbose('webllm: retry input', shaped);
			output = await completeRewrite(engine, strictPrompt, shaped);
			debug('webllm: retry response', { outputLength: output.length });
			debugVerbose('webllm: retry response text', output);

			if (looksLikeNonRewrite(output, text)) {
				const cleaned = stripRewriteFiller(output);
				if (cleaned && !looksLikeNonRewrite(cleaned, text)) {
					debug('webllm: accepted cleaned retry');
					return cleaned;
				}

				throw new Error(
					'The local model explained instead of rewriting. Try a shorter prompt or a larger model.',
				);
			}
		}

		return output;
	} catch (cause) {
		if (enginePromise === currentEnginePromise) {
			debug('webllm: reset engine after error', cause);
			enginePromise = null;
			loadedModelId = null;
		}

		throw cause;
	}
}

async function getStandardSystemPrompt(): Promise<string> {
	if (!standardPromptPromise) {
		standardPromptPromise = fetch(getExtensionUrl('/prompts/standard.json'))
			.then(async (response) => {
				if (!response.ok) {
					debug('webllm: prompt load failed', response.status);
					throw new Error(`Unable to load the standard prompt (${response.status}).`);
				}

				const prompt = (await response.json()) as StandardPrompt;
				if (!prompt.system_prompt?.trim()) {
					debug('webllm: prompt missing system_prompt');
					throw new Error('The standard prompt does not contain a system prompt.');
				}

				return prompt.system_prompt;
			});
	}

	return standardPromptPromise;
}

async function completeRewrite(
	engine: Awaited<ReturnType<typeof CreateExtensionServiceWorkerMLCEngine>>,
	systemPrompt: string,
	userContent: string,
): Promise<string> {
	await engine.resetChat();

	try {
		const response = await engine.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				{ role: 'user', content: userContent },
			],
			temperature: 0,
			top_p: 0.9,
			max_tokens: 512,
		});

		const content = response.choices[0]?.message.content;
		if (typeof content !== 'string' || !content.trim()) {
			debug('webllm: empty response');
			throw new Error('The local model returned no paraphrased text.');
		}

		return content.trim();
	} finally {
		try {
			await engine.resetChat();
		} catch (cause) {
			debug('webllm: reset after call failed', cause);
		}
	}
}

function getExtensionUrl(path: string): string {
	const runtime = (globalThis as typeof globalThis & {
		chrome?: { runtime?: { getURL: (resourcePath: string) => string } };
	}).chrome?.runtime;

	if (!runtime) {
		throw new Error('Extension runtime is unavailable.');
	}

	return runtime.getURL(path);
}
