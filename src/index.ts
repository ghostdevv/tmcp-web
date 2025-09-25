import { DurableObjectSessionManager } from '@tmcp/session-manager-durable-objects';
// import { version } from '../package.json' with { type: 'json' };
import { fetchWikipediaPage, searchWikipedia } from './wikipedia';
import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { HttpTransport } from '@tmcp/transport-http';
import { McpServer } from 'tmcp';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(
	{ name: 'fetch', version: '0.2.0', description: 'Fetch URLs and return as markdown' },
	{
		adapter,
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

			const contentType = response.headers.get('content-type');
			let result = await response.text();

			if (contentType === 'text/html') {
				const md = NodeHtmlMarkdown.translate(result);
				result = md;
			}

			return { content: [{ type: 'text', text: result }] };
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

const transport = new HttpTransport(server, {
	sessionManager: new DurableObjectSessionManager(),
});

export { SyncLayer } from '@tmcp/session-manager-durable-objects';

export default {
	async fetch(request: Request) {
		const response = await transport.respond(request);
		if (!response) {
			return new Response('Not Found', { status: 404 });
		}
		return response;
	},
};
