import type { AgentLinkDto } from '@arweqah-platform/shared';
import { ArrowUpRight, BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useNavItems } from '@/core/navigation';
import { Badge, Button } from '@/shared/ui';

/**
 * The buttons under an explanation (FR-153): the section of the user manual that says it, and the page itself when the section is about a page.
 * The server only sends sections its search found for this person; the page button shows only while the page is in their menu now
 * (their permission, a page not hidden from them, admin mode when the page needs it).
 */
export function MessageLinks({ links, onNavigate }: { links: AgentLinkDto[]; onNavigate: () => void }) {
  const { t } = useTranslation('agentChat');
  const nav = useNavItems();
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link) => {
        const page = link.page ? nav.find((item) => item.pageKey === link.page) : undefined;
        return (
          <span key={link.sectionId} className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="secondary">
              <Link to={`/docs?s=${encodeURIComponent(link.sectionId)}`} onClick={onNavigate}>
                <BookOpen className="size-4" aria-hidden />
                {t('links.manual', { title: link.title })}
              </Link>
            </Button>
            {page && (
              <Button asChild size="sm" variant="tint">
                <Link to={page.to} onClick={onNavigate}>
                  <ArrowUpRight className="size-4 rtl:-scale-x-100" aria-hidden />
                  {t('links.page', { title: link.title })}
                </Link>
              </Button>
            )}
            {page?.requiresAdminMode && <Badge tone="info">{t('links.adminMode')}</Badge>}
          </span>
        );
      })}
    </div>
  );
}
