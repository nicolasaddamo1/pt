import React, { useState } from 'react';

const FilterForm = () => {
  const [role, setRole] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [cnae, setCnae] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`http://localhost:3000/download?role=${role}&industry=${industry}&country=${country}&cnae=${cnae}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Crear un enlace para descargar el archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'filtered_leads.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error('Error downloading the file:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Role:
          <input type="text" value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Industry:
          <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Country:
          <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          CNAE:
          <input type="text" value={cnae} onChange={(e) => setCnae(e.target.value)} />
        </label>
      </div>
      <button type="submit">Download</button>
    </form>
  );
};

export default FilterForm;
