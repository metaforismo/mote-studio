import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('Mote Studio', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('changes shape and color, then restores the default mote', () => {
    render(<App />)

    const softShape = screen.getByRole('button', {
      name: 'Soft: Organic and uneven',
    })
    const skyColor = screen.getByRole('button', { name: 'Sky' })
    fireEvent.click(softShape)
    fireEvent.click(skyColor)

    expect(softShape).toHaveAttribute('aria-pressed', 'true')
    expect(skyColor).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))

    expect(
      screen.getByRole('button', { name: 'Orb: Balanced and calm' }),
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
