export class ExportService {
  /**
   * Generates RFC-4180 compliant CSV content with UTF-8 BOM for universal Excel & Sheets compatibility
   */
  static generateCsv(headers: string[], rows: (string | number)[][]): string {
    const sanitize = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headerLine = headers.map(sanitize).join(',');
    const rowLines = rows.map((r) => r.map(sanitize).join(','));
    return '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  }

  /**
   * Generates native Microsoft Excel Spreadsheet XML (opens in MS Excel with formatted styles)
   */
  static generateExcelXml(sheetName: string, headers: string[], rows: (string | number)[][]): string {
    const sanitize = (val: any) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const headerRow = headers
      .map(
        (h) =>
          `<Cell ss:StyleID="Header"><Data ss:Type="String">${sanitize(h)}</Data></Cell>`
      )
      .join('');

    const dataRows = rows
      .map((row) => {
        const cells = row
          .map((cell) => {
            const type = typeof cell === 'number' ? 'Number' : 'String';
            return `<Cell><Data ss:Type="${type}">${sanitize(cell)}</Data></Cell>`;
          })
          .join('');
        return `<Row>${cells}</Row>`;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Segoe UI" ss:Size="10" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Segoe UI" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sanitize(sheetName)}">
  <Table>
   <Row ss:Height="24">${headerRow}</Row>
   ${dataRows}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  /**
   * Generates a printable HTML document designed for print/PDF export
   */
  static generatePrintableHtml(
    title: string,
    subtitle: string,
    headers: string[],
    rows: (string | number)[][]
  ): string {
    const sanitize = (val: any) =>
      String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const thead = headers.map((h) => `<th>${sanitize(h)}</th>`).join('');
    const tbody = rows
      .map((r) => `<tr>${r.map((c) => `<td>${sanitize(c)}</td>`).join('')}</tr>`)
      .join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${sanitize(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; color: #1e293b; font-size: 11px; }
    .header { margin-bottom: 20px; border-bottom: 2px solid #6366f1; padding-bottom: 12px; }
    .header h1 { margin: 0 0 4px 0; font-size: 20px; color: #1e1b4b; }
    .header p { margin: 0; color: #64748b; font-size: 12px; }
    .meta { font-size: 10px; color: #94a3b8; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { background: #4f46e5; color: #ffffff; font-weight: 600; text-align: left; padding: 7px 10px; border: 1px solid #4338ca; }
    td { padding: 6px 10px; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${sanitize(title)}</h1>
    <p>${sanitize(subtitle)}</p>
    <div class="meta">Generated: ${new Date().toLocaleString()} | Official University Record</div>
  </div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="footer">CampusPulse College Event Management System &bull; Confidential</div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;
  }
}
