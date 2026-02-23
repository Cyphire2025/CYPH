
export const MAX_FILE_MB = 25;
export const DANGEROUS_EXT = /\.(html?|svg|php|exe|sh|bat|cmd|js|mjs|jsx|ts|tsx)$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov)$/i;

export const validateFiles = (fileList) => {
    const accepted = [];
    const rejected = [];
    for (const f of fileList) {
        const name = (f.name || "").toLowerCase();
        const sizeMB = f.size / (1024 * 1024);
        if (DANGEROUS_EXT.test(name)) {
            rejected.push({ f, reason: "Dangerous file type" });
            continue;
        }
        if (sizeMB > MAX_FILE_MB) {
            rejected.push({ f, reason: `Exceeds ${MAX_FILE_MB}MB` });
            continue;
        }
        accepted.push(f);
    }
    if (rejected.length) {
        const detail = rejected.slice(0, 3).map((r) => `${r.f.name}: ${r.reason}`).join("\n");
        alert(`Some files were rejected:\n${detail}${rejected.length > 3 ? "\n..." : ""}`);
    }
    return accepted;
};

export const firstOf = (obj, keys) => {
    for (const k of keys) {
        const v = obj?.[k];
        if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
};

export const guessType = (att) => {
    const str = `${att?.type || ""} ${att?.name || ""}`.toLowerCase();
    if (str.includes("image") || IMAGE_EXT.test(str)) return "image";
    if (str.includes("video") || VIDEO_EXT.test(str)) return "video";
    return "file";
};

export const normalizeAttachments = (m) => {
    let atts = firstOf(m, ["attachments", "files", "media", "assets", "uploads"]) || [];
    if (!Array.isArray(atts)) atts = [atts];
    return atts
        .map((a) => {
            if (typeof a === "string") {
                const name = a.split("/").pop();
                return { url: a, name, type: guessType({ name }) };
            }
            const url = firstOf(a, ["url", "path", "location", "secure_url", "src", "href"]);
            const name = a?.name || (typeof url === "string" ? url.split("/").pop() : undefined);
            const type = guessType({ type: a?.type, name });
            if (!url) return null;
            return { url, name, type };
        })
        .filter(Boolean);
};


export const getSenderId = (m) => {
    if (!m) return undefined;
    // Direct ID properties
    const direct = firstOf(m, ["senderId", "userId", "authorId"]);
    if (direct) return direct;

    // Nested object with _id
    if (m.sender?._id) return m.sender._id;
    if (m.user?._id) return m.user._id;
    if (m.author?._id) return m.author._id;

    // Direct string ID in sender field (e.g. unpopulated mongoose ref)
    if (typeof m.sender === "string") return m.sender;
    if (typeof m.user === "string") return m.user;

    return undefined;
};

export const getSenderName = (m, fallback = "Collaborator") => {
    if (!m) return fallback;
    return (
        firstOf(m.sender, ["name", "displayName", "username", "fullName"]) ||
        firstOf(m.user, ["name", "username"]) ||
        firstOf(m.author, ["name"]) ||
        firstOf(m, ["senderName", "name"]) ||
        fallback
    );
};

export const getMessageText = (m) =>
    firstOf(m, ["text", "content", "message", "body", "msg", "caption"]);

export const getTimestamp = (m) =>
    firstOf(m, ["createdAt", "created_at", "timestamp", "time", "createdOn", "created_on", "date"]);
