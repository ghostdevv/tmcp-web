import { fetchWikipediaPage, searchWikipedia } from './wikipedia';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { version } from '../package.json';
import { env } from 'cloudflare:workers';
import { McpServer } from 'tmcp';
import { z } from 'zod';

export const server = new McpServer(
	{ name: 'fetch', version, description: 'Fetch URLs and return as markdown' },
	{
		adapter: new ZodJsonSchemaAdapter(),
		capabilities: {
			logging: {},
			tools: {
				listChanged: true,
			},
			prompts: {
				listChanged: true,
			},
			resources: {
				subscribe: true,
				listChanged: true,
			},
		},
	},
);

server.tool(
	{
		name: 'fetch',
		description: 'Fetch URLs and return as markdown',
		schema: z.object({
			url: z.url().describe('The URL to fetch'),
		}),
	},
	async ({ url }) => {
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'tmcp-fetch/0.1.0',
				},
			});

			if (!response.ok) {
				return {
					isError: true,
					content: [
						{
							type: 'text',
							text: `failed to fetch with code ${response.status}`,
						},
					],
				};
			}

			const supportedMimes = await env.AI.toMarkdown().supported();
			const contentType = response.headers.get('content-type');

			if (
				!contentType ||
				!supportedMimes.some((s) => s.mimeType.toLowerCase() === contentType)
			) {
				return { content: [{ type: 'text', text: await response.text() }] };
			}

			const result = await env.AI.toMarkdown({
				name: 'fetched',
				blob: await response.blob(),
			});

			if (result.format === 'error') {
				return {
					isError: true,
					content: [{ type: 'text', text: result.error }],
				};
			}

			return { content: [{ type: 'text', text: result.data }] };
		} catch (e) {
			console.error(e);
			return {
				isError: true,
				content: [{ type: 'text', text: 'failed to fetch' }],
			};
		}
	},
);

server.tool(
	{
		name: 'search-wikipedia',
		description:
			'Search Wikipedia for relevant document names and summaries, which can be used to fetch the full document',
		schema: z.object({
			query: z.string().describe('The query to search for'),
		}),
	},
	async ({ query }) => {
		try {
			const results = await searchWikipedia(query);

			return {
				content: results.map((result) => ({
					type: 'text',
					text: `# ${result.title}\n\npage id: \`${result.pageId}\`\n\n## Snippet\n\n${result.snippet.trim()}`,
				})),
			};
		} catch (e) {
			console.error(e);
			return {
				isError: true,
				content: [{ type: 'text', text: 'failed to fetch' }],
			};
		}
	},
);

server.tool(
	{
		name: 'fetch-wikipedia-page',
		description: 'Fetch a Wikipedia page by its ID',
		schema: z.object({
			id: z.number().describe('The ID of the Wikipedia page'),
		}),
	},
	async ({ id }) => {
		try {
			const page = await fetchWikipediaPage(id);

			return {
				content: [{ type: 'text', text: page.content }],
			};
		} catch (e) {
			console.error(e);
			return {
				isError: true,
				content: [{ type: 'text', text: 'failed to fetch' }],
			};
		}
	},
);
