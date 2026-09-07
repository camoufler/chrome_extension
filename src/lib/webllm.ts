import { CreateExtensionServiceWorkerMLCEngine } from '@mlc-ai/web-llm';

export const WEBLLM_PORT_NAME = 'web_llm_service_worker';

interface StandardPrompt {
  system_prompt: string;
}

let standardPromptPromise: Promise<string> | null = null;

let enginePromise: ReturnType<typeof CreateExtensionServiceWorkerMLCEngine> | null = null;
let loadedModelId: string | null = null;

export async function stopParaphrasing(): Promise<void> {
	if (!enginePromise) {
		return;
	}

	try {
		const engine = await enginePromise;
		await engine.interruptGenerate();
	} catch {
		return;
	}
}

export async function paraphraseText(text: string, modelId: string): Promise<string> {
	if (!enginePromise || loadedModelId !== modelId) {
		loadedModelId = modelId;
		enginePromise = CreateExtensionServiceWorkerMLCEngine(modelId);
	}

	const currentEnginePromise = enginePromise;

	try {
		const engine = await currentEnginePromise;
		const systemPrompt = await getStandardSystemPrompt();
		await engine.resetChat();
		const response = await engine.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: systemPrompt,
				},
				{ role: 'user', content: text },
			],
			temperature: 0,
			top_p: 0.9,
			max_tokens: 512,
		});

		const content = response.choices[0]?.message.content;
		if (typeof content !== 'string' || !content.trim()) {
			throw new Error('The local model returned no paraphrased text.');
		}

		return content.trim();
	} catch (cause) {
		if (enginePromise === currentEnginePromise) {
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
					throw new Error(`Unable to load the standard prompt (${response.status}).`);
				}

				const prompt = (await response.json()) as StandardPrompt;
				if (!prompt.system_prompt?.trim()) {
					throw new Error('The standard prompt does not contain a system prompt.');
				}

				return prompt.system_prompt;
			});
	}

	return standardPromptPromise;
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
