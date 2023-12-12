require("dotenv").config();

const http = require("http");
const crypto = require("crypto");
const handler = require("./handler");

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Collect data chunks
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString(); // Convert Buffer to string
  });

  // Once all data is received
  req.on("end", async () => {
    // console.log(body); // Log the complete body
    if (process.env.LINEAR_WEBHOOK_SIGNING_SECRET) {
      const signature = crypto
        .createHmac("sha256", process.env.LINEAR_WEBHOOK_SIGNING_SECRET)
        .update(body)
        .digest("hex");

      if (signature !== req.headers["linear-signature"]) {
        console.error("webhook signature is invalid");

        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "webhook signature is invalid" }));

        return;
      }
    }

    console.log("new webhook event");

    try {
      const result = await handler({ body });

      console.log("handler successfully finished with result", result);

      // Send a response back to the client
      res.writeHead(result.statusCode, { "Content-Type": "application/json" });
      res.end(result.body);
    } catch (e) {
      console.error("Webhook error", e);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ e }));
    }
  });
});

const PORT = process.env.LISTEN_PORT || 3000;
server.listen(PORT, () => console.log(`Server up and running on port ${PORT}`));
