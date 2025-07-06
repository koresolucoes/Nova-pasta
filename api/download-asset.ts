
// This proxy is dedicated to fetching content from Meta's asset download URLs, avoiding client-side CORS.
export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*'); // Adjust for production
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST', 'OPTIONS']);
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { downloadUrl } = req.body;

    if (typeof downloadUrl !== 'string' || !downloadUrl.startsWith('https://mmg.whatsapp.net')) {
        return res.status(400).json({ success: false, message: 'Parâmetro "downloadUrl" ausente ou inválido.' });
    }

    try {
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000), // 15-second timeout
        });

        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: `Falha ao buscar conteúdo do Flow no servidor da Meta: ${response.statusText}` });
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const responseText = await response.text();
            console.error("Meta download URL did not return JSON. Content-Type:", contentType, "Body:", responseText.slice(0, 500));
            const friendlyMessage = `O servidor da Meta não retornou JSON. Isso pode ocorrer se o flow não tiver conteúdo, a sessão da API tiver expirado, ou a URL de download for inválida. (Content-Type: ${contentType || 'N/A'})`;
            return res.status(502).json({ success: false, message: friendlyMessage }); // 502 Bad Gateway
        }

        const flowJson = await response.json();
        return res.status(200).json(flowJson);
    } catch (error: any) {
        let errorMessage = 'Falha genérica no proxy de download.';
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            errorMessage = 'A requisição para a Meta expirou (timeout).';
        } else if (error instanceof SyntaxError) {
            errorMessage = 'Falha ao processar a resposta da Meta. Não é um JSON válido.';
        }
        console.error("Error in download-asset proxy:", error);
        return res.status(500).json({ success: false, message: errorMessage });
    }
}
