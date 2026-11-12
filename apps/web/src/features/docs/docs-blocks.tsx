import { Fragment } from 'react';
import type { Block, Inline } from './docs-access';

function Text({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, k) => {
        if (typeof n === 'string') return <Fragment key={k}>{n}</Fragment>;
        if ('code' in n) return <code key={k}>{n.code}</code>;
        if ('bold' in n) return <strong key={k}>{n.bold}</strong>;
        if ('perm' in n) return <span key={k} className="perm" title={n.perm.key}>{n.perm.label}</span>;
        return <img key={k} className="shot" loading="lazy" alt={n.img.alt} src={n.img.src} />;
      })}
    </>
  );
}

const Items = ({ items }: { items: Inline[][] }) => (
  <>{items.map((it, k) => <li key={k}><Text nodes={it} /></li>)}</>
);

function Table({ head, rows }: { head: Inline[][]; rows: Inline[][][] }) {
  return (
    <div className="tbl">
      <table>
        <thead><tr>{head.map((c, k) => <th key={k}><Text nodes={c} /></th>)}</tr></thead>
        <tbody>{rows.map((r, a) => <tr key={a}>{r.map((c, k) => <td key={k}><Text nodes={c} /></td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  if ('p' in block) return <p><Text nodes={block.p} /></p>;
  if ('h' in block) return block.h === 3 ? <h3><Text nodes={block.i} /></h3> : <h4><Text nodes={block.i} /></h4>;
  if ('ul' in block) return <ul><Items items={block.ul} /></ul>;
  if ('ol' in block) return <ol><Items items={block.ol} /></ol>;
  if ('note' in block) return <aside className="note">{block.note.map((p, k) => <p key={k}><Text nodes={p} /></p>)}</aside>;
  return <Table {...block.table} />;
}

/** Draws the manual's blocks as React elements (the build script writes data, never HTML). */
export function ManualBlocks({ blocks }: { blocks: Block[] }) {
  return <>{blocks.map((b, k) => <BlockView key={k} block={b} />)}</>;
}
