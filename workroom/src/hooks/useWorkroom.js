import { useEffect, useRef, useState, useCallback } from "react";
import io from "socket.io-client";
import { apiFetch } from "../lib/fetch";
import {
  MAX_FILE_MB,
  getSenderId,
} from "../components/workroom/messageUtils";

const API_BASE = import.meta.env?.VITE_API_BASE || "http://localhost:5000";
const TYPING_IDLE_MS = 900;
const REMOTE_TYPING_VISIBLE_MS = 1400;

const uuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const parseJsonSafe = async (res) => {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await res.json();
  const txt = await res.text();
  throw new Error(`Unexpected ${res.status} ${res.statusText}: ${txt.slice(0, 200)}`);
};

const dedupeMessages = (messages) => {
  const seenById = new Set();
  const seenByTemp = new Set();
  const out = [];

  for (const msg of messages) {
    const id = msg?._id || "";
    const tempId = msg?.clientTempId || "";

    if (id && seenById.has(id)) continue;
    if (tempId && seenByTemp.has(tempId)) continue;

    if (id) seenById.add(id);
    if (tempId) seenByTemp.add(tempId);
    out.push(msg);
  }

  return out;
};

const mergeMessage = (prev, incoming, meId) => {
  if (!incoming) return prev;

  const senderId = String(getSenderId(incoming) || "");
  const isMine = meId && senderId === String(meId);

  const normalized = isMine && (!incoming.sender || typeof incoming.sender === "string")
    ? {
        ...incoming,
        senderId: incoming.senderId || meId,
        sender: {
          _id: meId,
          name: incoming.senderName || "You",
        },
      }
    : incoming;

  const incomingId = normalized?._id;
  const incomingTempId = normalized?.clientTempId;

  const updated = [...prev];

  if (incomingId) {
    const byIdIdx = updated.findIndex((m) => m?._id && m._id === incomingId);
    if (byIdIdx !== -1) {
      updated[byIdIdx] = { ...updated[byIdIdx], ...normalized, __pending: false };
      return updated;
    }
  }

  if (incomingTempId) {
    const byTempIdx = updated.findIndex((m) => m?.clientTempId && m.clientTempId === incomingTempId);
    if (byTempIdx !== -1) {
      updated[byTempIdx] = { ...updated[byTempIdx], ...normalized, __pending: false };
      return updated;
    }
  }

  updated.push(normalized);
  return updated;
};

export function useWorkroom(workroomId) {
  const [me, setMe] = useState(null);
  const [meta, setMeta] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [otherTyping, setOtherTyping] = useState({ active: false, name: "" });

  const socketRef = useRef(null);
  const meIdRef = useRef(null);
  const atBottomRef = useRef(true);
  const typingHideTimerRef = useRef(null);
  const localStopTypingTimerRef = useRef(null);

  useEffect(() => {
    meIdRef.current = me?._id || null;
  }, [me]);

  useEffect(() => {
    atBottomRef.current = atBottom;
  }, [atBottom]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const scrollToBottom = useCallback((ref, smooth = true) => {
    if (!ref?.current) return;
    requestAnimationFrame(() => {
      ref.current.scrollTo({
        top: ref.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
    });
  }, []);

  const fetchMeta = useCallback(async () => {
    if (!workroomId) return null;
    const res = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/meta`, { credentials: "include" });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.error || "Failed to load workroom meta");
    setMeta(data || null);
    return data;
  }, [workroomId]);

  const fetchMessages = useCallback(
    async (forceScroll = false, listRef) => {
      if (!workroomId) return;
      try {
        const r = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/messages`, {
          credentials: "include",
        });
        const d = await parseJsonSafe(r);
        const list = d.items || d.messages || d.data || [];

        setItems(dedupeMessages(Array.isArray(list) ? list : []));

        if ((forceScroll || atBottomRef.current) && listRef?.current) {
          setTimeout(() => scrollToBottom(listRef, !forceScroll), 20);
        }
      } catch (e) {
        console.warn("Message fetch error", e);
      } finally {
        setLoading(false);
      }
    },
    [workroomId, scrollToBottom]
  );

  useEffect(() => {
    if (!workroomId) return;
    let mounted = true;

    (async () => {
      try {
        const [meRes, metaRes] = await Promise.all([
          apiFetch(`${API_BASE}/api/auth/me`, { credentials: "include" }),
          apiFetch(`${API_BASE}/api/workrooms/${workroomId}/meta`, { credentials: "include" }),
        ]);

        const meData = await parseJsonSafe(meRes);
        const metaData = await parseJsonSafe(metaRes);

        if (!mounted) return;
        setMe(meData?.user || null);
        setMeta(metaData || null);
      } catch (err) {
        console.error("Meta fetch error", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [workroomId]);

  useEffect(() => {
    fetchMessages(true);
  }, [fetchMessages]);

  useEffect(() => {
    if (!workroomId) return;

    const socket = io(API_BASE, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 500,
    });

    socketRef.current = socket;

    const onConnect = () => {
      socket.emit("workroom:join", { workroomId });
    };

    const onJoined = () => {
      fetchMessages(false);
    };

    const onMessage = (msg) => {
      if (msg?.workroomId && String(msg.workroomId) !== String(workroomId)) return;

      setItems((prev) => dedupeMessages(mergeMessage(prev, msg, meIdRef.current)));
    };

    const onTyping = (payload) => {
      if (!payload || String(payload.workroomId) !== String(workroomId)) return;
      if (String(payload.userId || "") === String(meIdRef.current || "")) return;

      setOtherTyping({ active: true, name: payload.senderName || "Collaborator" });
      window.clearTimeout(typingHideTimerRef.current);
      typingHideTimerRef.current = window.setTimeout(() => {
        setOtherTyping({ active: false, name: "" });
      }, REMOTE_TYPING_VISIBLE_MS);
    };

    const onTypingStop = (payload) => {
      if (!payload || String(payload.workroomId) !== String(workroomId)) return;
      if (String(payload.userId || "") === String(meIdRef.current || "")) return;
      setOtherTyping({ active: false, name: "" });
      window.clearTimeout(typingHideTimerRef.current);
    };

    const onReaction = ({ messageId, reaction, senderId, senderName }) => {
      setItems((prev) => {
        const idx = prev.findIndex((m) => m._id === messageId || m.clientTempId === messageId);
        if (idx === -1) return prev;

        const next = [...prev];
        const msg = { ...next[idx] };
        const existing = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
        const rIdx = existing.findIndex((r) => String(r.senderId || r.userId) === String(senderId));

        if (!reaction) {
          if (rIdx >= 0) existing.splice(rIdx, 1);
        } else if (rIdx >= 0) {
          existing[rIdx] = { ...existing[rIdx], reaction, senderName };
        } else {
          existing.push({ senderId, senderName, reaction });
        }

        msg.reactions = existing;
        next[idx] = msg;
        return next;
      });
    };

    const onWorkroomFinalised = ({ finalisedAt }) => {
      setMeta((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          clientFinalised: true,
          workerFinalised: true,
          finalisedAt: finalisedAt || prev.finalisedAt || new Date().toISOString(),
        };
      });
      fetchMeta().catch(() => {});
    };

    const onMetaUpdate = (payload) => {
      if (!payload || String(payload.workroomId || "") !== String(workroomId)) return;
      setMeta((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          clientFinalised: !!payload.clientFinalised,
          workerFinalised: !!payload.workerFinalised,
          finalisedAt: payload.finalisedAt || prev.finalisedAt || null,
        };
      });
    };

    socket.on("connect", onConnect);
    socket.on("joined", onJoined);
    socket.on("message:new", onMessage);
    socket.on("typing", onTyping);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:reaction", onReaction);
    socket.on("workroom:finalised", onWorkroomFinalised);
    socket.on("workroom:meta", onMetaUpdate);

    return () => {
      window.clearTimeout(typingHideTimerRef.current);
      window.clearTimeout(localStopTypingTimerRef.current);
      socket.off("connect", onConnect);
      socket.off("joined", onJoined);
      socket.off("message:new", onMessage);
      socket.off("typing", onTyping);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:reaction", onReaction);
      socket.off("workroom:finalised", onWorkroomFinalised);
      socket.off("workroom:meta", onMetaUpdate);
      socket.disconnect();
    };
  }, [workroomId, fetchMessages, fetchMeta]);

  const stopTyping = useCallback(() => {
    if (!socketRef.current || !workroomId) return;
    socketRef.current.emit("typing:stop", { workroomId, userId: meIdRef.current });
  }, [workroomId]);

  const emitTyping = useCallback(() => {
    if (!socketRef.current || !workroomId || !meIdRef.current) return;
    socketRef.current.emit("typing", { workroomId, userId: meIdRef.current });
    window.clearTimeout(localStopTypingTimerRef.current);
    localStopTypingTimerRef.current = window.setTimeout(() => {
      stopTyping();
    }, TYPING_IDLE_MS);
  }, [workroomId, stopTyping]);

  const sendMessage = async (text, files, listRef) => {
    if (sending) return false;
    if (!meIdRef.current) return false;

    const trimmed = (text || "").trim();
    const accepted = (Array.isArray(files) ? files : []).filter(
      (f) => (f?.size || 0) / (1024 * 1024) <= MAX_FILE_MB
    );

    if (!trimmed && accepted.length === 0) return false;

    const clientTempId = uuid();
    const optimistic = {
      _id: `pending:${clientTempId}`,
      clientTempId,
      __pending: true,
      text: trimmed,
      attachments: accepted.map((file) => ({
        url: URL.createObjectURL(file),
        name: file.name,
        type: file.type?.startsWith("image/") ? "image" : "file",
      })),
      senderId: meIdRef.current,
      sender: {
        _id: meIdRef.current,
        name: me?.name || "You",
      },
      createdAt: new Date().toISOString(),
    };

    setItems((prev) => dedupeMessages([...prev, optimistic]));
    if (atBottomRef.current && listRef?.current) scrollToBottom(listRef);

    setSending(true);
    stopTyping();

    try {
      const form = new FormData();
      if (trimmed) form.append("text", trimmed);
      form.append("clientTempId", clientTempId);
      for (const file of accepted) form.append("attachments", file);

      const res = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/messages`, {
        method: "POST",
        body: form,
      });

      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.error || "Failed to send message");

      const serverMsg = data?.item || data?.message || data?.data || data?.msg;
      if (serverMsg) {
        setItems((prev) => dedupeMessages(mergeMessage(prev, serverMsg, meIdRef.current)));
      }

      return true;
    } catch (err) {
      console.error("Send failed", err);
      setItems((prev) =>
        prev.map((msg) => {
          if (msg.clientTempId === clientTempId) {
            return { ...msg, __pending: false, __failed: true };
          }
          return msg;
        })
      );
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendReaction = useCallback(
    (messageId, reaction) => {
      if (!socketRef.current || !meIdRef.current) return;

      setItems((prev) => {
        const idx = prev.findIndex((m) => m._id === messageId || m.clientTempId === messageId);
        if (idx === -1) return prev;

        const next = [...prev];
        const msg = { ...next[idx] };
        const existing = Array.isArray(msg.reactions) ? [...msg.reactions] : [];
        const rIdx = existing.findIndex((r) => String(r.senderId || r.userId) === String(meIdRef.current));

        if (rIdx >= 0 && existing[rIdx].reaction === reaction) {
          existing.splice(rIdx, 1);
          socketRef.current.emit("message:react", {
            workroomId,
            messageId,
            reaction: null,
          });
        } else if (rIdx >= 0) {
          existing[rIdx] = { ...existing[rIdx], reaction };
          socketRef.current.emit("message:react", {
            workroomId,
            messageId,
            reaction,
          });
        } else {
          existing.push({ senderId: meIdRef.current, senderName: me?.name || "You", reaction });
          socketRef.current.emit("message:react", {
            workroomId,
            messageId,
            reaction,
          });
        }

        msg.reactions = existing;
        next[idx] = msg;
        return next;
      });
    },
    [workroomId, me]
  );

  const finalizeWorkroom = useCallback(async () => {
    const res = await apiFetch(`${API_BASE}/api/workrooms/${workroomId}/finalise`, { method: "POST" });
    const data = await parseJsonSafe(res);
    if (!res.ok) throw new Error(data?.error || "Unable to finalize workroom");

    setMeta((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        clientFinalised: !!data?.clientFinalised,
        workerFinalised: !!data?.workerFinalised,
        finalisedAt: data?.finalisedAt || prev.finalisedAt || null,
      };
    });

    return data;
  }, [workroomId]);

  return {
    me,
    meta,
    setMeta,
    items,
    loading,
    sending,
    otherTyping,
    atBottom,
    isOnline,
    startScroll: scrollToBottom,
    setAtBottom,
    fetchMessages,
    fetchMeta,
    sendMessage,
    emitTyping,
    stopTyping,
    finalizeWorkroom,
    sendReaction,
  };
}
