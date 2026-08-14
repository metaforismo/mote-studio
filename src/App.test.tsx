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
    expect(await screen.findByText('Face performance')).toBeInTheDocument()
  })

  it('applies a state pose and exposes continuous face controls', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'rig' }))
    fireEvent.click(screen.getByRole('button', { name: /Thinking:/ }), {
      detail: 1,
    })

    expect(
      screen.getByText('Thinking face performance playing'),
    ).toBeInTheDocument()
    expect(document.querySelector('[data-pose-performance="thinking"]')).toBe(
      document.querySelector('svg[role="img"]'),
    )
    expect(
      document.querySelector('[data-rig-live-meter="turn"]'),
    ).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Turn' })).toHaveValue('-14')

    fireEvent.change(screen.getByRole('slider', { name: 'Spacing' }), {
      target: { value: '1.31' },
    })
    expect(screen.getByRole('slider', { name: 'Spacing' })).toHaveValue('1.31')

    const gazePad = screen.getByRole('button', { name: /Eye direction:/ })
    fireEvent.keyDown(gazePad, { key: 'Home' })
    expect(gazePad).toHaveAccessibleName(/center, middle/)
  })

  it('offers twelve distinct face performances', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'rig' }))

    expect(
      screen.getByRole('group', { name: 'Performance' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Surprised:/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Focused:/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Shy:/ })).toBeVisible()
    expect(screen.getByRole('button', { name: /Doubtful:/ })).toBeVisible()
  })

  it('keeps keyboard-initiated pose changes instant', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'rig' }))
    fireEvent.click(screen.getByRole('button', { name: /Listening:/ }), {
      detail: 0,
    })

    expect(screen.getByText('Listening state selected')).toBeInTheDocument()
    expect(document.querySelector('[data-pose-performance]')).toBeNull()
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

  it('builds animations from reusable expressions and advanced geometry', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'animate' }))

    expect(screen.getByRole('combobox', { name: 'Animation' })).toHaveValue(
      'animation-soft-scan',
    )
    expect(
      screen.getByRole('group', { name: 'Playback controls' }),
    ).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.getByRole('button', { name: 'Play' })).toBeVisible()
    fireEvent.click(screen.getByRole('tab', { name: 'Expressions' }))
    expect(screen.getByLabelText('Link left and right eye edits')).toBeChecked()
    fireEvent.click(screen.getByLabelText('Link left and right eye edits'))
    fireEvent.change(
      screen.getByRole('spinbutton', { name: 'left eye Width' }),
      {
        target: { value: '1.2' },
      },
    )
    expect(
      screen.getByRole('spinbutton', { name: 'right eye Width' }),
    ).toHaveValue(1)

    fireEvent.click(screen.getByRole('tab', { name: 'Geometry' }))
    fireEvent.click(screen.getByRole('button', { name: /Sphere/ }))
    expect(
      document.querySelector('[data-surface="sphere"]'),
    ).toBeInTheDocument()
  })

  it('creates avatar copies without eagerly copying shared behavior', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'animate' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Library' }))
    fireEvent.click(screen.getByRole('button', { name: 'New avatar' }))

    expect(screen.getByRole('button', { name: /Mote 2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(
      screen.getByText('This avatar is using shared behavior.'),
    ).toBeVisible()
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
