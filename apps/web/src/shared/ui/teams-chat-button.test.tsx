import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TeamsChatButton, teamsChatUrl } from './teams-chat-button';

describe('Chat on Teams (FR-154)', () => {
  it('builds the Teams chat link from the work e-mail, encoded', () => {
    expect(teamsChatUrl('sara@arweqah.sa')).toBe('https://teams.microsoft.com/l/chat/0/0?users=sara%40arweqah.sa');
    expect(teamsChatUrl('  a+b@arweqah.sa ')).toBe('https://teams.microsoft.com/l/chat/0/0?users=a%2Bb%40arweqah.sa');
  });

  it('opens the chat in a new tab without leaking the opener', () => {
    render(<TeamsChatButton email="sara@arweqah.sa" />);
    const link = screen.getByRole('link', { name: /Teams/ });
    expect(link).toHaveAttribute('href', 'https://teams.microsoft.com/l/chat/0/0?users=sara%40arweqah.sa');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders nothing without an e-mail', () => {
    const { container } = render(<><TeamsChatButton email={null} /><TeamsChatButton email="  " /></>);
    expect(container).toBeEmptyDOMElement();
  });
});
