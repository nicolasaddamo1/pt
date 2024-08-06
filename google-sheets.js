import { google } from 'googleapis';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config(); // Cargar las variables de entorno

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = process.env.TOKEN_PATH || 'token.json'; // Usar la variable de entorno

// Carga las credenciales desde el archivo credentials.json
async function loadCredentials() {
  const content = await fs.readFile('credentials.json');
  return JSON.parse(content);
}

// Guarda el token en el archivo token.json
async function saveToken(token) {
  await fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token de autorización guardado en', TOKEN_PATH);
}

// Genera la URL de autorización
function getAuthUrl(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  return authUrl;
}

// Intercambia el código de autorización por un token
async function exchangeCodeForToken(oAuth2Client, code) {
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await saveToken(tokens);
}

// Autoriza al cliente utilizando el token almacenado o solicita uno nuevo si no existe
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

export { getAuthUrl, exchangeCodeForToken, authorize };
