#!/usr/bin/env node

import { serveStdio } from '@modelcontextprotocol/server/stdio'
import { createMoteServer } from './server.js'

const handle = serveStdio(createMoteServer)

const shutdown = () => {
  void handle.close().finally(() => process.exit(0))
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
