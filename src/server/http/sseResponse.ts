export type SseSink = Readonly<{
  send: (id: number, data: unknown) => void;
  comment: (text: string) => void;
  close: () => void;
}>;

/** Sets up the stream and returns a cleanup function, called once when the stream ends. */
export type SseStart = (sink: SseSink) => Promise<() => void>;

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

/** A Server-Sent Events response that cleans up when the client goes away or the stream ends. */
export function sseResponse(start: SseStart, signal: AbortSignal): Response {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const finish = (): void => {
        if (closed) return;
        closed = true;
        cleanup?.();
        controller.close();
      };
      const write = (chunk: string): void => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const sink: SseSink = {
        send: (id, data) => write(`id: ${id}\ndata: ${JSON.stringify(data)}\n\n`),
        comment: (text) => write(`: ${text.replace(/\n/g, ' ')}\n\n`),
        close: finish,
      };
      signal.addEventListener('abort', finish, { once: true });
      cleanup = await start(sink);
      if (closed) cleanup();
    },
    cancel() {
      closed = true;
      cleanup?.();
    },
  });
  return new Response(stream, { headers: SSE_HEADERS });
}
