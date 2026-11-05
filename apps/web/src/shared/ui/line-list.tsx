/** A short bulleted list of lines (charter outputs, duties, qualifications); renders nothing when empty. */
export function LineList({ items }: { items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex list-disc flex-col gap-1 ps-5 text-sm marker:text-muted">
      {items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
    </ul>
  );
}
