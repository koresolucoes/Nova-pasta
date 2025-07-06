
import type { SheetContact } from '../types';
import { parseCsv } from './contactService';

/**
 * Fetches and parses a Google Sheet published as a CSV.
 * It can automatically convert an editor URL to a CSV export URL.
 * Validates for 'nome' and 'telefone' columns.
 * @param sheetUrl The public URL of the Google Sheet (either editor or published as CSV).
 * @returns A promise that resolves to an array of SheetContact objects.
 */
export async function fetchAndParseSheet(sheetUrl: string): Promise<SheetContact[]> {
    if (!sheetUrl) {
        throw new Error('A URL da planilha é obrigatória.');
    }

    let csvExportUrl = sheetUrl;
    
    // Regex to match a standard Google Sheets editor URL and extract ID and GID
    const editUrlRegex = /https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)\/edit.*?(#gid=(\d+))?/;
    const match = sheetUrl.match(editUrlRegex);

    // If it's an editor URL, convert it to a direct CSV export URL.
    if (match) {
        const sheetId = match[1];
        const gid = match[3] || '0'; // If gid (sheet tab id) is not present, default to the first sheet.
        csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } else if (!sheetUrl.includes('/export?format=csv') && !sheetUrl.includes('/pub?output=csv')) {
        // If it's not a known export/publish URL, instruct the user.
        throw new Error('URL inválida. Use a URL de edição da sua planilha ou a URL de "Publicar na web" como CSV.');
    }

    try {
        const response = await fetch(csvExportUrl);
        
        if (!response.ok) {
            throw new Error(`Falha ao buscar a planilha (Status: ${response.status}). Verifique se a URL está correta e se a planilha é pública ('Qualquer pessoa com o link').`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/csv')) {
             throw new Error('A URL não retornou um arquivo CSV. Isso pode acontecer se a planilha não estiver compartilhada publicamente ou se a URL for de uma página de login do Google.');
        }

        let csvText = await response.text();
        if (!csvText.trim()) {
             throw new Error('A planilha está vazia ou não pôde ser lida.');
        }

        // Remove Byte Order Mark (BOM) if present, which can interfere with header parsing.
        if (csvText.charCodeAt(0) === 0xFEFF) {
            csvText = csvText.substring(1);
        }

        const parsedData = parseCsv(csvText);

        if (parsedData.length === 0) {
            throw new Error('Nenhum dado encontrado na planilha. Verifique se a planilha tem um cabeçalho e pelo menos uma linha de dados.');
        }

        const headers = Object.keys(parsedData[0]);
        const requiredHeaders = ['nome', 'telefone'];

        if (!requiredHeaders.every(rh => headers.includes(rh))) {
            throw new Error(`A planilha deve conter as colunas "nome" e "telefone". Verifique os cabeçalhos. Cabeçalhos encontrados: [${headers.join(', ')}]`);
        }

        return parsedData.map(row => ({
            name: row.nome,
            phone: row.telefone,
            ...row // include other columns like status, data_envio
        })).filter(contact => contact.name && contact.phone); // Filter out rows with empty required fields

    } catch (error) {
        console.error("Erro ao processar a planilha do Google Sheets:", error);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Ocorreu um erro desconhecido ao processar a planilha.');
    }
}
