#!/usr/bin/env node
import { KanbanServer } from './server.js';

const server = new KanbanServer();
server.run().catch(console.error);
