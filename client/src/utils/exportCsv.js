export function exportToCsv(filename, rows, columns) {
  // columns: array of { key, header }
  const headers = columns.map(c => c.header);
  const keys = columns.map(c => c.key);

  const escapeCsv = (val) => {
    if (val === null || typeof val === 'undefined') return '';
    let s = String(val);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const lines = [];
  lines.push(headers.join(','));
  for (const row of rows) {
    const line = keys.map(k => escapeCsv(row[k]));
    lines.push(line.join(','));
  }

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


