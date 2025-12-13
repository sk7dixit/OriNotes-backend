const { Server } = require("socket.io");
const pool = require("./config/db");

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("🟢 User connected to socket:", socket.id);

        // Initial load of recent messages
        socket.on("joinChat", async () => {
            try {
                const res = await pool.query(
                    "SELECT id, user_id, username, message_text as text, created_at FROM chat_messages ORDER BY created_at ASC LIMIT 50"
                );
                // If query returns oldest first (ASC), client usually renders top-down. 
                socket.emit("chatHistory", res.rows);
            } catch (err) {
                console.error("Error fetching chat history:", err);
            }
        });

        socket.on("chatMessage", async (msg) => {
            console.log("📩 Received message:", msg);
            // msg = { text, username, userId }
            if (!msg.text || !msg.username) {
                console.warn("⚠️ Invalid message payload:", msg);
                return;
            }

            try {
                const result = await pool.query(
                    "INSERT INTO chat_messages (message_text, username, user_id) VALUES ($1, $2, $3) RETURNING id, user_id, username, message_text as text, created_at",
                    [msg.text, msg.username, msg.userId]
                );
                const savedMsg = result.rows[0];
                console.log("✅ Saved message:", savedMsg.id);

                // Broadcast to all clients
                io.emit("chatMessage", savedMsg);
            } catch (err) {
                console.error("❌ Error saving chat message:", err);
            }
        });

        // Admin: Delete single message
        socket.on("deleteMessage", async (messageId) => {
            console.log("🗑️ Request to delete message:", messageId);
            try {
                await pool.query("DELETE FROM chat_messages WHERE id = $1", [messageId]);
                io.emit("messageDeleted", messageId);
            } catch (err) {
                console.error("❌ Error deleting message:", err);
            }
        });

        // Admin: Clear all chat
        socket.on("clearChat", async () => {
            console.log("🔥 Request to clear ALL chat");
            try {
                await pool.query("TRUNCATE TABLE chat_messages");
                io.emit("chatCleared");
            } catch (err) {
                console.error("❌ Error clearing chat:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("🔴 User disconnected", socket.id);
        });
    });

    return io;
}

function getIo() {
    if (!io) {
        console.warn("Socket.io not initialized yet! Returning null.");
        return null;
    }
    return io;
}

module.exports = { initSocket, getIo };
