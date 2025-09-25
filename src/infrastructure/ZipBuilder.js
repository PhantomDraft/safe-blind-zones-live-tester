export class ZipBuilder {
  constructor() {
    this.entries = [];
  }

  addFile(name, data, date = new Date()) {
    if (!(data instanceof Uint8Array)) {
      throw new TypeError('ZipBuilder.addFile expects Uint8Array data.');
    }
    this.entries.push({ name, data, date });
  }

  addTextFile(name, content, date = new Date()) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(content);
    this.addFile(name, bytes, date);
  }

  build() {
    let offset = 0;
    const parts = [];
    const centralDirectoryParts = [];

    this.entries.forEach(entry => {
      const nameBytes = ZipBuilder.encodeUtf8(entry.name);
      const dataBytes = entry.data;
      const { time, date } = ZipBuilder.dateToDos(entry.date);
      const crc32 = ZipBuilder.crc32(dataBytes);
      const localHeaderOffset = offset;
      const localHeader = ZipBuilder.createLocalHeader({
        nameBytes,
        dataBytes,
        time,
        date,
        crc32
      });
      parts.push(localHeader);
      offset += localHeader.length;
      parts.push(dataBytes);
      offset += dataBytes.length;
      const centralHeader = ZipBuilder.createCentralHeader({
        nameBytes,
        dataBytes,
        time,
        date,
        crc32,
        localHeaderOffset
      });
      centralDirectoryParts.push(centralHeader);
    });

    const centralDirectoryOffset = offset;
    centralDirectoryParts.forEach(part => {
      parts.push(part);
      offset += part.length;
    });
    const centralDirectorySize = centralDirectoryParts.reduce((sum, part) => sum + part.length, 0);
    const endRecord = ZipBuilder.createEndRecord({
      entryCount: this.entries.length,
      centralDirectorySize,
      centralDirectoryOffset
    });
    parts.push(endRecord);
    return ZipBuilder.concat(parts);
  }

  static createLocalHeader({ nameBytes, dataBytes, time, date, crc32 }) {
    const header = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(header.buffer);
    let offset = 0;
    view.setUint32(offset, 0x04034b50, true);
    offset += 4;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, date, true);
    offset += 2;
    view.setUint32(offset, crc32 >>> 0, true);
    offset += 4;
    view.setUint32(offset, dataBytes.length, true);
    offset += 4;
    view.setUint32(offset, dataBytes.length, true);
    offset += 4;
    view.setUint16(offset, nameBytes.length, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    header.set(nameBytes, 30);
    return header;
  }

  static createCentralHeader({ nameBytes, dataBytes, time, date, crc32, localHeaderOffset }) {
    const header = new Uint8Array(46 + nameBytes.length);
    const view = new DataView(header.buffer);
    let offset = 0;
    view.setUint32(offset, 0x02014b50, true);
    offset += 4;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, 20, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, time, true);
    offset += 2;
    view.setUint16(offset, date, true);
    offset += 2;
    view.setUint32(offset, crc32 >>> 0, true);
    offset += 4;
    view.setUint32(offset, dataBytes.length, true);
    offset += 4;
    view.setUint32(offset, dataBytes.length, true);
    offset += 4;
    view.setUint16(offset, nameBytes.length, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint32(offset, 0, true);
    offset += 4;
    view.setUint32(offset, localHeaderOffset, true);
    header.set(nameBytes, 46);
    return header;
  }

  static createEndRecord({ entryCount, centralDirectorySize, centralDirectoryOffset }) {
    const header = new Uint8Array(22);
    const view = new DataView(header.buffer);
    let offset = 0;
    view.setUint32(offset, 0x06054b50, true);
    offset += 4;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, 0, true);
    offset += 2;
    view.setUint16(offset, entryCount, true);
    offset += 2;
    view.setUint16(offset, entryCount, true);
    offset += 2;
    view.setUint32(offset, centralDirectorySize, true);
    offset += 4;
    view.setUint32(offset, centralDirectoryOffset, true);
    offset += 4;
    view.setUint16(offset, 0, true);
    return header;
  }

  static concat(chunks) {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.length;
    });
    return result;
  }

  static encodeUtf8(value) {
    const encoder = new TextEncoder();
    return encoder.encode(value);
  }

  static dateToDos(date) {
    const safeDate = date instanceof Date ? date : new Date();
    let year = safeDate.getFullYear();
    if (year < 1980) {
      year = 1980;
    }
    const dosYear = year - 1980;
    const dosMonth = safeDate.getMonth() + 1;
    const dosDay = safeDate.getDate();
    const dosHour = safeDate.getHours();
    const dosMinute = safeDate.getMinutes();
    const dosSecond = Math.floor(safeDate.getSeconds() / 2);
    const time = (dosHour << 11) | (dosMinute << 5) | dosSecond;
    const dateValue = (dosYear << 9) | (dosMonth << 5) | dosDay;
    return { time, date: dateValue };
  }

  static crc32(data) {
    let crc = 0xffffffff;
    const table = ZipBuilder.getCrcTable();
    for (let i = 0; i < data.length; i += 1) {
      const byte = data[i];
      crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  static getCrcTable() {
    if (!ZipBuilder.crcTable) {
      ZipBuilder.crcTable = ZipBuilder.createCrcTable();
    }
    return ZipBuilder.crcTable;
  }

  static createCrcTable() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let crc = i;
      for (let j = 0; j < 8; j += 1) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ 0xedb88320;
        } else {
          crc >>>= 1;
        }
      }
      table[i] = crc >>> 0;
    }
    return table;
  }
}
