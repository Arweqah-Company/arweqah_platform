import { MessagesSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';

/** The Microsoft Teams link that opens a chat with a person by their work e-mail (FR-154): a plain link, no Graph API and nothing sent by the platform. */
export const teamsChatUrl = (email: string): string => `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email.trim())}`;

/** «Chat on Teams»: a secondary button that opens the chat in a new tab; renders nothing without an e-mail. The caller wraps it in `<Can permission=directory.contact_teams>`. */
export function TeamsChatButton({ email }: { email: string | null | undefined }) {
  const { t } = useTranslation();
  if (!email?.trim()) return null;
  return (
    <Button asChild variant="secondary">
      <a href={teamsChatUrl(email)} target="_blank" rel="noopener noreferrer"><MessagesSquare className="size-4" aria-hidden />{t('actions.chatOnTeams')}</a>
    </Button>
  );
}
