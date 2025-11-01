import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fetchMock } from 'cloudflare:test';
import { useMCP } from './setup';

beforeAll(() => {
	fetchMock.activate();
	fetchMock.disableNetConnect();
});

afterAll(() => {
	fetchMock.assertNoPendingInterceptors();
});

describe('fetch', () => {
	it('fetches a plain text page', async () => {
		using mcp = await useMCP();

		fetchMock
			.get('http://fetch-test')
			.intercept({ path: '/' })
			.reply(200, 'success!');

		const result = await mcp.session.callTool('fetch', {
			url: 'http://fetch-test',
		});

		expect(result).toMatchObject({
			content: [
				{
					text: 'success!',
					type: 'text',
				},
			],
		});
	});

	it('turns html page to markdown', async () => {
		using mcp = await useMCP();

		fetchMock
			.get('http://fetch-test')
			.intercept({ path: '/' })
			.reply(
				200,
				`<html>
                    <body>
                        <h1>Hello World</h1>
                        <p>Hello TMCP</p>
                    </body>
                </html>`,
				{ headers: { 'Content-Type': 'text/html' } },
			);

		const result = await mcp.session.callTool('fetch', {
			url: 'http://fetch-test',
		});

		expect(result).toMatchSnapshot();
	});
});

describe('wikipedia', () => {
	beforeAll(() => {
		fetchMock.enableNetConnect();
	});

	afterAll(() => {
		fetchMock.disableNetConnect();
	});

	it('searches wikipedia', async () => {
		using mcp = await useMCP();

		const result = await mcp.session.callTool('search-wikipedia', {
			query: 'British Rail Class 444',
		});

		expect(result).toMatchSnapshot();
	});

	it('fetches page', async () => {
		using mcp = await useMCP();

		const result = await mcp.session.callTool('fetch-wikipedia-page', {
			id: 1487548,
		});

		expect(result).toMatchSnapshot();
	});
});
