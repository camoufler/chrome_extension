import { CreateExtensionServiceWorkerMLCEngine } from '@mlc-ai/web-llm';

export const WEBLLM_PORT_NAME = 'web_llm_service_worker';

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

	const engine = await enginePromise;
	await engine.resetChat();
	const response = await engine.chat.completions.create({
		messages: [
			{
				role: 'system',
				content:
					'Generate personality and use it to paraphrase the user text. ' +
					'You should maintain the original meaning while using your unique voice. ' +
                    'Return only the paraphrased text.',
			},
			{ role: 'user', content: text },
		],
		temperature: 0.7,
		max_tokens: 512,
	});

	const content = response.choices[0]?.message.content;
	if (typeof content !== 'string' || !content.trim()) {
		throw new Error('The local model returned no paraphrased text.');
	}

	return content.trim();
}
