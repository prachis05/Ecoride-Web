
const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const healthRoutes = require("../routes/health");

test("GET /health returns a healthy status", async () => {
    const app = express();
    app.use("/health", healthRoutes);

    const server = app.listen(0);

    try {
        const address = server.address();
        const response = await fetch(
            `http://127.0.0.1:${address.port}/health`
        );

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {
            status: "ok",
            service: "ecoride-backend"
        });
    } finally {
        await new Promise((resolve, reject) => {
            server.close((error) => {
                if (error) reject(error);
                else resolve();
            });
        });
    }
});
