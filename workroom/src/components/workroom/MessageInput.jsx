import React, { useEffect, useRef } from "react";
import { Paperclip, Loader2, Send, X } from "lucide-react";

export default function MessageInput({
  text,
  setText,
  files,
  setFiles,
  onSend,
  sending,
  canSend,
  onTyping,
  onStopTyping,
  onFileSelect,
  disabled,
}) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
  }, [text]);

  return (
    <div className="border-t border-slate-200 bg-white/95 px-4 py-3 sm:px-6">
      {files.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {files.map((file, idx) => {
            const isImage = file.type?.startsWith("image/");
            const preview = isImage ? URL.createObjectURL(file) : null;

            return (
              <div key={`${file.name}-${idx}`} className="group relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5">
                {isImage ? (
                  <img
                    src={preview}
                    alt={file.name}
                    className="h-8 w-8 rounded object-cover"
                    onLoad={() => preview && URL.revokeObjectURL(preview)}
                  />
                ) : (
                  <Paperclip className="h-4 w-4 text-slate-500" />
                )}
                <span className="max-w-[140px] truncate text-xs text-slate-600" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <label className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
          <Paperclip className="h-4 w-4" />
          <input type="file" multiple className="hidden" onChange={onFileSelect} disabled={disabled} />
        </label>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onBlur={() => onStopTyping?.()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder={disabled ? "Workroom finalized" : "Type a message..."}
          className="max-h-[140px] min-h-[42px] w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <button
          onClick={onSend}
          disabled={!canSend || sending || disabled}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
