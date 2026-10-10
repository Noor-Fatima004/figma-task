import { ZipArchive } from "archiver";

type CellValue = string | number;

const escapeXml = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function columnName(index: number) {
  let name = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(((value - 1) % 26) + 65) + name;
  }
  return name;
}

function cellXml(value: CellValue, reference: string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `<c r="${reference}"><v>${value}</v></c>`;
  }
  const text = escapeXml(String(value));
  return `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${text}</t></is></c>`;
}

export async function createInvoiceExcel(
  headers: string[],
  rows: CellValue[][]
): Promise<Buffer> {
  const allRows = [headers, ...rows];
  const sheetRows = allRows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((value, columnIndex) =>
            cellXml(value, `${columnName(columnIndex)}${rowIndex + 1}`)
          )
          .join("")}</row>`
    )
    .join("");
  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`;
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  const result = new Promise<Buffer>((resolve, reject) => {
    archive.on("data", (chunk: Buffer) => chunks.push(chunk));
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));
  });
  archive.append(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
    { name: "[Content_Types].xml" }
  );
  archive.append(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    { name: "_rels/.rels" }
  );
  archive.append(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Invoices" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    { name: "xl/workbook.xml" }
  );
  archive.append(
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    { name: "xl/_rels/workbook.xml.rels" }
  );
  archive.append(worksheet, { name: "xl/worksheets/sheet1.xml" });
  await archive.finalize();
  return result;
}
