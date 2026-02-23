import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useWorkroom } from "../hooks/useWorkroom";

import Aurora from "../components/workroom/Aurora";
import WorkroomHeader from "../components/workroom/WorkroomHeader";
import MessageList from "../components/workroom/MessageList";
import MessageInput from "../components/workroom/MessageInput";
import { validateFiles } from "../components/workroom/messageUtils";

export default function WorkroomPage() {
  const { workroomId } = useParams();
  const navigate = useNavigate();

  const {
    me,
    meta,
    items,
    loading,
    sending,
    otherTyping,
    atBottom,
    isOnline,
    startScroll,
    setAtBottom,
    fetchMessages,
    sendMessage,
    emitTyping,
    stopTyping,
    finalizeWorkroom,
  } = useWorkroom(workroomId);

  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const listRef = useRef(null);

  const meId = me?._id;
  const bothFinalised = !!meta?.finalisedAt || (!!meta?.clientFinalised && !!meta?.workerFinalised);
  const canSend = text.trim().length > 0 || files.length > 0;

  useEffect(() => {
    if (!workroomId) return;
    if (meta?.role === "worker" && bothFinalised && !meta?.paymentRequested) {
      navigate(`/workroom/${workroomId}/payment`, { replace: true });
    }
  }, [meta?.role, meta?.paymentRequested, bothFinalised, workroomId, navigate]);

  useEffect(() => {
    if (!atBottom) return;
    startScroll(listRef, false);
  }, [items.length, atBottom, startScroll]);

  const onSend = async () => {
    if (!canSend || sending || bothFinalised) return;
    const ok = await sendMessage(text, files, listRef);
    if (ok) {
      setText("");
      setFiles([]);
    }
  };

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    setAtBottom(nearBottom);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer?.files || []);
    if (!dropped.length) return;
    const safe = validateFiles(dropped);
    if (safe.length) setFiles((prev) => [...prev, ...safe]);
  };

  const handleFileSelect = (e) => {
    const picked = Array.from(e.target.files || []);
    const safe = validateFiles(picked);
    if (safe.length) setFiles((prev) => [...prev, ...safe]);
    e.target.value = "";
  };

  const handleFinalize = async () => {
    if (finalizing || bothFinalised) return;
    setFinalizing(true);
    try {
      await finalizeWorkroom();
    } catch (err) {
      console.error(err);
      alert(err?.message || "Unable to finalize right now.");
    } finally {
      setFinalizing(false);
    }
  };

  if (meta?.paymentRequested) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 text-slate-900">
        <Aurora />
        <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-semibold">Task completed</h1>
          <p className="mt-2 text-sm text-slate-600">
            Workroom is closed and payout request has been submitted.
          </p>
          <button
            onClick={() => {
              if (window.location.hostname === "localhost") {
                window.location.href = "http://localhost:5173/dashboard";
                return;
              }
              window.location.href = "/dashboard";
            }}
            className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-slate-50 text-slate-900">
      <Aurora />

      <WorkroomHeader
        meta={meta}
        workroomId={workroomId}
        isOnline={isOnline}
        bothFinalised={bothFinalised}
        onRefresh={() => fetchMessages(true, listRef)}
        onFinalize={handleFinalize}
        finalizing={finalizing}
      />

      <main
        className={`relative mx-auto flex w-full max-w-6xl flex-1 overflow-hidden px-4 pb-4 pt-4 transition sm:px-6 ${
          dragOver ? "scale-[0.995]" : ""
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur-sm">
          <MessageList
            items={items}
            loading={loading}
            meId={meId}
            listRef={listRef}
            onScroll={handleScroll}
            atBottom={atBottom}
            scrollToBottom={() => startScroll(listRef)}
            typing={otherTyping}
          />

          <MessageInput
            text={text}
            setText={setText}
            files={files}
            setFiles={setFiles}
            onSend={onSend}
            sending={sending}
            canSend={canSend}
            onTyping={emitTyping}
            onStopTyping={stopTyping}
            onFileSelect={handleFileSelect}
            disabled={bothFinalised}
          />
        </div>
      </main>
    </div>
  );
}
