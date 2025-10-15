import { createServer } from 'vite';
import path from 'node:path';

const server = await createServer({
  root: path.resolve('.'),
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
  }
});

await server.listen();
console.log('vite dev started');
