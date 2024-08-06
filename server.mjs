import express from 'express';
import { google } from 'googleapis';
import { parse } from 'json2csv';
import { Readable } from 'stream';
import cors from 'cors';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config(); // Cargar las variables de entorno

const app = express();
const port = 3000;

app.use(cors());

// Configuración de autenticación
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']; // Usa solo permisos de lectura si solo necesitas leer datos
const TOKEN_PATH = process.env.TOKEN_PATH || 'token.json'; // Usar la variable de entorno

// Función para cargar credenciales
async function loadCredentials() {
  const content = await fs.readFile('credentials.json');
  return JSON.parse(content);
}

// Función para guardar el token
async function saveToken(token) {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
}

// Función para obtener URL de autorización
function getAuthUrl(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  return authUrl;
}

// Función para autorizar al cliente
async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = await fs.readFile(TOKEN_PATH);
    const tokenData = JSON.parse(token);

    if (tokenData.expiry_date < Date.now()) {
      console.log('Token expirado, solicitando uno nuevo.');
      const { tokens } = await oAuth2Client.refreshToken(tokenData.refresh_token);
      oAuth2Client.setCredentials(tokens);
      await saveToken(tokens);
    } else {
      oAuth2Client.setCredentials(tokenData);
    }
  } catch (error) {
    console.log('Token no encontrado o inválido, solicita uno nuevo.');
    const authUrl = getAuthUrl(oAuth2Client);
    console.log('Autoriza esta aplicación visitando esta URL:', authUrl);
    throw new Error('Authorization required');
  }
  return oAuth2Client;
}

// Endpoint para manejar la descarga
app.get('/download', async (req, res) => {
  try {
    // Obtén los filtros de la consulta
    const filters = {
      role: req.query.role || '',
      industry: req.query.industry || '',
      country: req.query.country || '',
      cnae: req.query.cnae || '',
      deliverable: req.query.deliverable || ''
    };

    console.log('Filtros recibidos:', filters);

    // Obtener datos desde Google Sheets
    async function getDataFromSheet() {
      const auth = await authorize();
      const sheets = google.sheets({ version: 'v4', auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID, // Usar la variable de entorno
        range: 'Hoja 1!A:R', // Ajusta el rango según tu hoja
      });

      if (!response.data || !response.data.values) {
        throw new Error('No data found in the specified range.');
      }

      return response.data.values;
    }

    const data = await getDataFromSheet();

    // Depuración: Imprime los datos obtenidos para verificar el formato
    console.log('Datos obtenidos de la hoja de cálculo:', data);

    // Filtrar los datos según los filtros proporcionados
    function filterData(data, filters) {
      console.log('Datos recibidos para filtrar:', data);
      return data.filter(row => {
        const roleMatches = !filters.role || (row[15] && row[15].toString() === filters.role);
        const industryMatches = !filters.industry || (row[11] && row[11].toString() === filters.industry);
        const countryMatches = !filters.country || (row[9] && row[9].toString() === filters.country);
        const cnaeMatches = !filters.cnae || (row[16] && row[16].toString() === filters.cnae);
        const deliverableMatches = !filters.deliverable || (row[0] && row[0].toString() === filters.deliverable);
    
        return roleMatches && industryMatches && countryMatches && cnaeMatches && deliverableMatches;
      });
    }

    const filteredData = filterData(data, filters);

    if (filteredData.length === 0) {
      console.log('No se encontraron datos con los filtros proporcionados:', filters);
      throw new Error('No data available for export');
    }

    console.log('Datos a exportar:', filteredData);

    // Convertir los datos filtrados a CSV
    const csv = parse(filteredData);

    // Crear un stream legible a partir del CSV
    const readable = Readable.from(csv);

    // Configurar la cabecera de la respuesta
    res.setHeader('Content-Disposition', 'attachment; filename=data.csv');
    res.setHeader('Content-Type', 'text/csv');

    // Enviar el CSV como respuesta
    readable.pipe(res);

  } catch (error) {
    console.error('Error en /download:', error);
    res.status(500).send('Error al generar el archivo');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
