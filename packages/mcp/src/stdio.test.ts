// @vitest-environment node

import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { describe, expect, it } from 'vitest'

const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url))

describe('Mote MCP stdio entry point', () => {
  it('negotiates the protocol and serves tools through a child process', async () => {
    const client = new Client(
      { name: 'mote-stdio-test-client', version: '0.1.0' },
      { versionNegotiation: { mode: 'auto' } },
    )
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [cliPath],
      stderr: 'pipe',
    })

    try {
      await client.connect(transport)
      const { tools } = await client.listTools()
      const result = await client.callTool({
        name: 'create_mote',
        arguments: { seed: 'stdio-proof', animated: false },
      })

      expect(tools).toHaveLength(5)
      expect(result.isError).not.toBe(true)
      expect(result.structuredContent).toMatchObject({
        seed: 'stdio-proof',
        mimeType: 'image/svg+xml',
        animated: false,
      })
    } finally {
      await client.close()
    }
  }, 15_000)
})
