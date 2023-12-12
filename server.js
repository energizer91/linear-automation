require('dotenv').config();

const http = require('http');
const handler = require('./handler');

const server = http.createServer(async (req, res) => {
    if (req.method !== 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
    }

    // Collect data chunks
    let body = '';
    req.on('data', (chunk) => {
        body += chunk.toString(); // Convert Buffer to string
    });

    // Once all data is received
    req.on('end', async () => {
        console.log(body); // Log the complete body

        const result = await handler({ body });

        // Send a response back to the client
        res.writeHead(result.statusCode, { 'Content-Type': 'application/json' });
        res.end(result.body);
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server up and running on port ${PORT}`));