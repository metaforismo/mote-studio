// @vitest-environment node

import { Client, InMemoryTransport } from '@modelcontextprotocol/client'
import type { McpServer } from '@modelcontextprotocol/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMoteServer } from './server.js'

describe('Mote MCP server', () => {
  let server: McpServer
  let client: Client

  beforeEach(async () => {
    server = createMoteServer()
    client = new Client({ name: 'mote-test-client', version: '0.1.0' })
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    await client.connect(clientTransport)
  })

  afterEach(async () => {
    await client.close()
    await server.close()
  })

  it('advertises a small, focused read-only tool surface', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(({ name }) => name)).toEqual([
      'list_mote_presets',
      'create_mote',
      'render_mote_svg',
    ])
    expect(tools.every((tool) => tool.annotations?.readOnlyHint)).toBe(true)
  })

  it('returns reproducible structured output for a stable seed', async () => {
    const first = await client.callTool({
      name: 'create_mote',
      arguments: { seed: 'quiet-signal', animated: true },
    })
    const second = await client.callTool({
      name: 'create_mote',
      arguments: { seed: 'quiet-signal', animated: true },
    })

    expect(first.isError).not.toBe(true)
    expect(first.structuredContent).toEqual(second.structuredContent)
    expect(first.structuredContent).toMatchObject({
      seed: 'quiet-signal',
      mimeType: 'image/svg+xml',
      animated: true,
    })
  })

  it('rejects invalid colors before a tool handler runs', async () => {
    const result = await client.callTool({
      name: 'render_mote_svg',
      arguments: { shapeId: 'orb', color: 'orange' },
    })
    expect(result.isError).toBe(true)
  })
})
