import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Mote Studio', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('changes shape, eye expression, and color, then restores defaults', () => {
    render(<App />)

    const pebbleShape = screen.getByRole('button', {
      name: 'Pebble: Grounded and soft',
    })
    const joyfulEyes = screen.getByRole('button', {
      name: '02 Joyful: Open and buoyant',
    })
    const skyColor = screen.getByRole('button', { name: 'Sky' })
    fireEvent.click(pebbleShape)
    fireEvent.click(joyfulEyes)
    fireEvent.click(skyColor)

    expect(pebbleShape).toHaveAttribute('aria-pressed', 'true')
    expect(joyfulEyes).toHaveAttribute('aria-pressed', 'true')
    expect(skyColor).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(
      screen.getByRole('button', { name: 'Blob: Balanced and organic' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('button', {
        name: '00 Neutral: Balanced and available',
      }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Tangerine' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('supports keyboard navigation between studio tabs', async () => {
    render(<App />)

    const botTab = screen.getByRole('tab', { name: 'bot' })
    botTab.focus()
    fireEvent.keyDown(botTab, { key: 'ArrowRight' })

    expect(screen.getByRole('tab', { name: 'generate' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByText('Motion character')).toBeInTheDocument()
  })

  it('offers the reference-derived face turn without background effects', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Turn' }))

    expect(screen.getByText('The mote turned its face')).toBeInTheDocument()
    expect(document.querySelector('ellipse')).not.toBeInTheDocument()
  })

  it('shows an inline validation error for unsupported uploads', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'upload' }))

    const input = await screen.findByLabelText('Choose an image texture')
    const invalidFile = new File(['not an image'], 'notes.txt', {
      type: 'text/plain',
    })
    fireEvent.change(input, { target: { files: [invalidFile] } })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose a PNG, JPEG, or WebP image.',
    )
  })
})
