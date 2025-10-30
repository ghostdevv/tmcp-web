import { toMarkdownBatch } from './markdown';

interface SearchResult {
	pageid: number;
	title: string;
	snippet: string;
}

interface SearchResponse {
	query: {
		search: SearchResult[];
	};
}

export async function searchWikipedia(query: string) {
	const url = new URL('https://en.wikipedia.org/w/api.php');
	url.searchParams.append('action', 'query');
	url.searchParams.append('format', 'json');
	url.searchParams.append('formatversion', '2');
	url.searchParams.append('list', 'search');
	url.searchParams.append('srsearch', query);

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'tmcp-fetch/0.1.0',
		},
	});

	const data: SearchResponse = await response.json();

	const converted = await toMarkdownBatch(
		data.query.search.flatMap((result) => [
			{
				key: `${result.pageid}-title`,
				contents: result.title,
				mime: 'text/html',
			},
			{
				key: `${result.pageid}-snippet`,
				contents: result.snippet,
				mime: 'text/html',
			},
		]),
	);

	if (converted.errors) {
		throw new Error(
			`unable to convert search results to markdown: "${JSON.stringify(converted.errors)}"`,
		);
	}

	return data.query.search.map((result) => ({
		pageId: result.pageid,
		title: converted.get(`${result.pageid}-title`),
		snippet: converted.get(`${result.pageid}-snippet`),
	}));
}

interface MissingPage {
	missing: true;
}

interface Page {
	pageid: number;
	title: string;
	extract: string;
}

interface PageResponse {
	query: {
		pages: (Page | MissingPage)[];
	};
}

export async function fetchWikipediaPage(id: number) {
	const url = new URL('https://en.wikipedia.org/w/api.php');
	url.searchParams.append('action', 'query');
	url.searchParams.append('prop', 'extracts');
	url.searchParams.append('explaintext', '1');
	url.searchParams.append('pageids', `${id}`);
	url.searchParams.append('format', 'json');
	url.searchParams.append('formatversion', '2');

	const response = await fetch(url, {
		headers: {
			'User-Agent': 'tmcp-fetch/0.1.0',
		},
	});

	const data: PageResponse = await response.json();

	const page = data.query.pages
		.filter((page): page is Page => !('missing' in page))
		.find((page) => page.pageid === id);

	if (!page) {
		throw new Error(`Page with ID ${id} not found`);
	}

	return {
		title: page.title,
		content: page.extract,
	};
}
