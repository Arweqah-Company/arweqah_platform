// Documentation diagrams: in a Mermaid sequence diagram a semicolon ends the message (the rest of the text becomes a statement and the diagram does not render).
// Message arrows: ->> -->> -> --> -x --x -) --) (each may end with + or - for activation).
const MESSAGE = /^\s*[^:]*?-{1,2}(?:>>|>|x|\))[+-]?[^:]*:(.*)$/;

/** True when the line is a sequence-diagram message whose text holds a ";". */
export const semicolonInMessage = (line) => MESSAGE.exec(line)?.[1].includes(';') ?? false;

/** The 1-based numbers of the lines of a Markdown text that hold such a message, inside a ```mermaid sequenceDiagram block. */
export function badMessageLines(markdown) {
  const bad = [];
  let state = 'outside'; // outside | mermaid | sequence
  markdown.split('\n').forEach((line, i) => {
    if (line.startsWith('```')) state = line.trim() === '```mermaid' ? 'mermaid' : 'outside';
    else if (state === 'mermaid' && line.trim() === 'sequenceDiagram') state = 'sequence';
    else if (state === 'sequence' && semicolonInMessage(line)) bad.push(i + 1);
  });
  return bad;
}
