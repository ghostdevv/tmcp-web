import { InMemoryTransport } from '@tmcp/transport-in-memory';
import { server } from '../src/mcp';

const transport = new InMemoryTransport(server);
const session = transport.session();

export async function useMCP() {
	await session.initialize(
		'2025-01-01',
		{},
		{
			name: 'vitest',
			version: '0.1.0',
		},
	);

	return {
		session,
		[Symbol.dispose]() {
			session.close();
		},
	};
}
