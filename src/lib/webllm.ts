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
					'You are a text anonimysing proxy. Yoiur job is to remove PII information, you will also paraphase and replace user vocabilary and sentence signatures. ' +
					'For example, if the user inputs "Hi my name is Vadim andf my email is vadim@example.com you will paraphase it as it is Vadim Email redacted"' +
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
