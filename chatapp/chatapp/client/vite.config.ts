import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { proxy: {
    '/api': 'http://localhost:4000', '/uploads': 'http://localhost:4000',
    '/socket.io': { target: 'http://localhost:4000', ws: true },
  },
  //ONLY TIRN ON WHEN SETUP WEB TUNNELING OR IN CASE OF PORT FORWARDING
  allowedHosts: ['scarecrow-icy-absinthe.ngrok-free.dev'] 
},
});
