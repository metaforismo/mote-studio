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

    expect(screen.getByRole('tab', { name: 'rig' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByText('Face pose')).toBeInTheDocument()
  })

  it('applies a state pose and exposes continuous face controls', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'rig' }))
    fireEvent.click(screen.getByRole('button', { name: /Thinking:/ }))

    expect(screen.getByText('Thinking state selected')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Turn' })).toHaveValue('-14')

    fireEvent.change(screen.getByRole('slider', { name: 'Spacing' }), {
      target: { value: '1.31' },
    })
    expect(screen.getByRole('slider', { name: 'Spacing' })).toHaveValue('1.31')

    const gazePad = screen.getByRole('button', { name: /Eye direction:/ })
    fireEvent.keyDown(gazePad, { key: 'Home' })
    expect(gazePad).toHaveAccessibleName(/center, middle/)
  })

  it('clips projected eyes to the current silhouette', () => {
    render(<App />)

    const eyeLayer = document.querySelector('[data-eye-layer="clipped"]')
    expect(eyeLayer).toBeInTheDocument()
    expect(eyeLayer?.getAttribute('clip-path')).toMatch(/^url\(#.+\)$/)
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
