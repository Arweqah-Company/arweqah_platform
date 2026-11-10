import { crc32 } from 'node:zlib';

/** A minimal zip (stored, no compression) of the given entries: what an Office file is made of. */
function zip(entries: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const body = Buffer.from(text);
    const nameBytes = Buffer.from(name);
    const crc = crc32(body);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(body.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(body.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

/** The package's list of parts: the part that says "this is a Word document / a workbook" is what tells the two apart. */
const types = (part: string, contentType: string) =>
  `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="${part}" ContentType="${contentType}"/></Types>`;

export const DOCX = zip({
  '[Content_Types].xml': types('/word/document.xml', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'),
  '_rels/.rels': '<Relationships/>',
  'word/document.xml': '<w:document/>',
});
export const XLSX = zip({
  '[Content_Types].xml': types('/xl/workbook.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml'),
  '_rels/.rels': '<Relationships/>',
  'xl/workbook.xml': '<workbook/>',
});
