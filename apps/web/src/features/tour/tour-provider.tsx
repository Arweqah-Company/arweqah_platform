import type { TourDto, TourId } from '@arweqah-platform/shared';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import type { FeatureModule } from '@/core/feature';
import { playSteps, type OwnedStep } from './play-steps';
import { PlayerContext, TourContext, type TourControls, type TourPlayer } from './tour-context';
import { useTourAction, useTourQuery } from './tour.api';
import { TourStage } from './tour-stage';
import { useAutoStart } from './use-auto-start';
import { useTourRunner } from './use-tour-runner';
import { WhatsNew } from './whats-new';

interface Props {
  /** The app's features: each one's `tour` steps are played, with its own i18n namespace for the wording. */
  features: Pick<FeatureModule, 'id' | 'tour' | 'nav'>[];
  /** Opens or closes the phone's side drawer. */
  setDrawer: (open: boolean) => void;
  children: ReactNode;
}

/** Esc skips; the arrows go on and back, mirrored in right-to-left. */
function useTourKeys(active: boolean, player: TourPlayer, rtl: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') player.skip();
      else if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) player.next();
      else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft') && player.index > 0) player.back();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, player, rtl]);
}

/** Runs the welcome tours of the signed-in layout: starts them, shows the current step, and records how each one ended. */
export function TourProvider({ features, setDrawer, children }: Props) {
  const { t, i18n } = useTranslation();
  const me = useMe().data;
  const { can } = usePermissions();
  const signedIn = !!me;
  const adminOn = !!me?.adminMode.active;
  const owners = useMemo(() => new Map<string, OwnedStep>(features.flatMap((f) => (f.tour ?? []).map((ui): [string, OwnedStep] => [ui.key, { ui, ns: f.id }]))), [features]);
  const [menu, setMenu] = useState(false);
  const [nav, setNav] = useState<string | null>(null);
  const navLabels = useMemo(() => new Map(features.flatMap((f) => (f.nav ?? []).filter((n) => !n.hideFromMenu).map((n): [string, string] => [n.to, n.labelKey]))), [features]);
  const record = useTourAction();
  const onEnd = useCallback((tour: TourId, how: 'completed' | 'skipped') => void record(tour, how === 'completed' ? 'complete' : 'skip'), [record]);
  const runner = useTourRunner({ setDrawer, setAccountMenu: setMenu, setNav, onEnd });
  const general = useTourQuery('general', signedIn);
  const admin = useTourQuery('admin', adminOn);

  const begin = useCallback((tour: TourId, dto: TourDto, onlyNew: boolean) => runner.start(tour, playSteps(dto, owners, { onlyNew, lang: i18n.language, t, allowed: can, navLabel: (route) => (navLabels.has(route) ? t(navLabels.get(route)!) : undefined) })), [runner.start, owners, navLabels, can, i18n.language, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const offer = useAutoStart({ data: { general: general.data, admin: admin.data }, running: !!runner.run, begin, dismiss: (tour) => void record(tour, 'skip') });
  const restart = useCallback(async (tour: TourId) => begin(tour, await record(tour, 'restart'), false), [begin, record]);

  const player: TourPlayer = { index: runner.run?.index ?? 0, total: runner.run?.steps.length ?? 0, next: runner.next, back: runner.back, skip: runner.skip };
  useTourKeys(!!runner.run, player, i18n.dir() === 'rtl');
  const defaultText = useCallback((key: string, lang: 'ar' | 'en') => {
    const owned = owners.get(key);
    const fixed = owned && i18n.getFixedT(lang, owned.ns);
    return fixed ? { title: fixed(`tour.${key}.title`), body: fixed(`tour.${key}.body`) } : null;
  }, [owners, i18n]);
  const controls: TourControls = useMemo(() => ({ accountMenuForced: menu, navForced: nav, restart, defaultText }), [menu, nav, restart, defaultText]);
  return (
    <TourContext.Provider value={controls}>
      {children}
      {runner.run && runner.ready && runner.current && (
        <PlayerContext.Provider value={player}>
          <TourStage key={`${runner.run.tour}:${runner.current.key}`} step={runner.current} />
        </PlayerContext.Provider>
      )}
      {offer.whatsNew && <WhatsNew count={offer.whatsNew.count} onStart={() => offer.start(offer.whatsNew!.tour)} onLater={() => offer.later(offer.whatsNew!.tour)} />}
    </TourContext.Provider>
  );
}
