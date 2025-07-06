

// IMPORTANT: This file acts as a server-side proxy for endpoint health checks,
// avoiding client-side CORS issues.

export default async function handler(req: any, res: any) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST', 'OPTIONS']);
        return res.status(405).json({ success: false, message: 'Method Not Allowed' });
    }

    const { endpointUri } = req.body;

    if (typeof endpointUri !== 'string' || !endpointUri.startsWith('https://')) {
        return res.status(400).json({ success: false, message: 'Parâmetro "endpointUri" inválido ou ausente.' });
    }

    try {
        const response = await fetch(endpointUri, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
            return res.status(200).json({ success: false, message: `Falha na verificação. O endpoint respondeu com status ${response.status}.` });
        }
        if (!response.headers.has('x-hub-signature-256')) {
            return res.status(200).json({ success: false, message: "Falha: Respondeu com 200 OK, mas o cabeçalho 'X-Hub-Signature-256' está ausente." });
        }
        return res.status(200).json({ success: true, message: 'Verificação do endpoint bem-sucedida!' });
    } catch (error: any) {
        let errorMessage = 'Falha ao conectar ao endpoint.';
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            errorMessage = 'Falha ao conectar: A requisição expirou (timeout).';
        }
        return res.status(200).json({ success: false, message: errorMessage });
    }
}
