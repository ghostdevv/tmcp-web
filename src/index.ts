import { DurableObjectStreamSessionManager } from '@tmcp/session-manager-durable-objects';
import { HttpTransport } from '@tmcp/transport-http';
import { server } from './mcp';

const transport = new HttpTransport(server, {
	sessionManager: {
		streams: new DurableObjectStreamSessionManager(),
	},
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
