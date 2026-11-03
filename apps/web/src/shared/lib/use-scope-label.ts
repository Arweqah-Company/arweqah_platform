import { baseScopeOf, scopeDepth, type PermissionScope } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';

/** The words for how far a permission reaches: «their unit», «their unit and one level below», …, «their unit and below», «their whole company». */
export function useScopeLabel(): (scope: PermissionScope) => string {
  const { t } = useTranslation();
  return (scope) => {
    const depth = scopeDepth(scope);
    return typeof depth === 'number' && depth > 0 ? t(`scope.depth${depth}`) : t(`scope.${baseScopeOf(scope)}`);
  };
}
