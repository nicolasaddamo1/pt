import Papa from 'papaparse';

const downloadCSV = (data) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'filtered_leads.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
export { downloadCSV };