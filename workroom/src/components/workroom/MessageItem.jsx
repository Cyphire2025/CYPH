import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getMessageText,
  normalizeAttachments,
  getTimestamp,
  getSenderName,
  getSenderId,
} from "./messageUtils";

const bubbleClass = (mine) =>
  mine
    ? "rounded-2xl rounded-br-md border border-blue-500/20 bg-gradient-to-br from-blue-600 to-indigo-600 text-white"
    : "rounded-2xl rounded-bl-md border border-slate-200 bg-white text-slate-800";

export default function MessageItem({ item, prevItem, meId }) {
  const senderId = getSenderId(item);
  const prevSenderId = prevItem ? getSenderId(prevItem) : null;
  const mine = String(senderId || "") === String(meId || "");
  const isChain = String(senderId || "") === String(prevSenderId || "");

  const ts = getTimestamp(item);
  const date = ts ? new Date(ts) : null;
  const text = getMessageText(item);
  const attachments = normalizeAttachments(item);

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} ${isChain ? "mt-1" : "mt-3"}`}>
      <div className="max-w-[84%] sm:max-w-[70%]">
        {!isChain && !mine && (
          <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {getSenderName(item)}
          </p>
        )}

        <div className={`px-3.5 py-2.5 shadow-sm ${bubbleClass(mine)}`}>
          {text ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text}</p> : null}

          {attachments.length > 0 ? (
            <div className="mt-2 space-y-2">
              {attachments.map((att, idx) => (
                <div key={`${att.url}-${idx}`} className="overflow-hidden rounded-lg border border-black/10 bg-black/5">
                  {att.type === "image" ? (
                    <a href={att.url} target="_blank" rel="noreferrer">
                      <img src={att.url} alt={att.name || "attachment"} className="max-h-64 w-full object-cover" loading="lazy" />
                    </a>
                  ) : (
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate px-3 py-2 text-xs font-medium hover:bg-black/5"
                    >
                      {att.name || "Download attachment"}
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}>
            <span>
              {date && !Number.isNaN(date.getTime())
                ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : ""}
            </span>
            {mine && item.__pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {mine && item.__failed ? <AlertCircle className="h-3.5 w-3.5 text-red-300" /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
