import { ZodJsonSchemaAdapter } from '@tmcp/adapter-zod';
import { HttpTransport } from '@tmcp/transport-http';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { McpServer } from 'tmcp';
import { z } from 'zod';

const adapter = new ZodJsonSchemaAdapter();
const server = new McpServer(
	{ name: 'fetch', version: '0.1.0', description: 'Fetch URLs and return as markdown' },
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

const transport = new HttpTransport(server);

export default {
	async fetch(request: Request) {
		const response = await transport.respond(request);
		if (!response) {
			return new Response('Not Found', { status: 404 });
		}
		return response;
	},
};
