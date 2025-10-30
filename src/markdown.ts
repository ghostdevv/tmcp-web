import { env } from 'cloudflare:workers';

export async function toMarkdownBatch(
	files: { key: string; contents: string; mime: string }[],
) {
	const results = await env.AI.toMarkdown(
		files.map((file) => ({
			name: `${file.key}`,
			blob: new Blob([file.contents], { type: file.mime }),
		})),
	);

	const resultsMap = new Map<string, ConversionResponse>();
	const errors: { key: string; error: string }[] = [];

	for (const result of results) {
		// const key = result.name.slice(0, -5);
		const key = result.name;

		if (result.format === 'error') {
			errors.push({ key, error: result.error });
		}

		resultsMap.set(key, result);
	}

	return {
		errors: errors.length === 0 ? null : errors,
		get(key: string) {
			const result = resultsMap.get(key);

			if (!result || result.format === 'error') {
				throw new Error(
					`unable to find conversion result for ${key}: "${result?.error}"`,
				);
			}

			return result.data;
		},
	};
}
