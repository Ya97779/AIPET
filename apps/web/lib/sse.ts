export function streamSSE(
  url: string,
  formData: FormData,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
  const token = localStorage.getItem('token');
  let cancelled = false;
  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) { onError(`HTTP error: ${response.status}`); return; }
      const reader = response.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text') onChunk(data.content);
              if (data.type === 'done') { onDone(); return; }
              if (data.type === 'error') { onError(data.content); return; }
            } catch {}
          }
        }
      }
      onDone();
    })
    .catch((err) => { if (!cancelled) onError(err.message); });

  return () => { cancelled = true; controller.abort(); };
}
