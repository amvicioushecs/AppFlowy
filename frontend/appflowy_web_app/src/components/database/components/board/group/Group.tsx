import { useDatabaseContext, useRowsByGroup } from '@/application/database-yjs';
import { AFScroller } from '@/components/_shared/scroller';
import { useConditionsContext } from '@/components/database/components/conditions/context';
import { debounce } from 'lodash-es';
import React, { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Column } from '../column';

export interface GroupProps {
  groupId: string;
}

export const Group = ({ groupId }: GroupProps) => {
  const { columns, groupResult, fieldId, notFound } = useRowsByGroup(groupId);
  const { t } = useTranslation();
  const context = useDatabaseContext();
  const scrollLeft = context.scrollLeft;
  const ref = useRef<HTMLDivElement>(null);
  const maxHeightRef = useRef<number>(0);
  const conditionsContext = useConditionsContext();
  const expanded = conditionsContext?.expanded ?? false;
  const onRendered = context?.onRendered;
  const isDocumentBlock = context.isDocumentBlock;

  const handleRendered = useCallback((height: number) => {
    maxHeightRef.current = Math.max(maxHeightRef.current, height);

    onRendered?.(maxHeightRef.current);
  }, [onRendered]);

  useEffect(() => {
    const el = ref.current;

    if (!el || !isDocumentBlock) return;

    const onResize = debounce(() => {
      const conditionHeight = expanded ? el.closest('.appflowy-database')?.querySelector('.database-conditions')?.clientHeight || 0 : 0;

      handleRendered(conditionHeight + maxHeightRef.current);
    }, 100);

    onResize();

    return () => {
      onResize.cancel();
    };
  }, [isDocumentBlock, expanded, handleRendered, onRendered]);

  if (notFound) {
    return (
      <div className={'mt-[10%] flex h-full w-full flex-col items-center gap-2 text-text-caption'}>
        <div className={'text-sm font-medium'}>{t('board.noGroup')}</div>
        <div className={'text-xs'}>{t('board.noGroupDesc')}</div>
      </div>
    );
  }

  if (columns.length === 0 || !fieldId) return null;
  return (
    <AFScroller
      overflowYHidden
      className={`relative  h-full`}
    >
      <div
        ref={ref}
        className={'max-sm:!px-6 px-24 h-full'}
        style={{
          paddingInline: scrollLeft === undefined ? undefined : scrollLeft,
        }}
      >
        <div
          className="columns flex h-full w-fit min-w-full gap-4 py-4"
        >
          {columns.map((data) => (
            <Column
              key={data.id}
              id={data.id}
              fieldId={fieldId}
              rows={groupResult.get(data.id)}
              onRendered={handleRendered}
            />
          ))}
        </div>
      </div>
    </AFScroller>
  );
};

export default Group;
