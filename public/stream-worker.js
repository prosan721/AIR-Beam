// Web Worker for Non-blocking Zero-Lag File Chunk Reading (Supports up to 30GB files)
self.onmessage = async (e) => {
  const { action, file, offset, chunkSize, chunkIndex, totalChunks } = e.data;

  if (action === 'READ_CHUNK') {
    try {
      const slice = file.slice(offset, offset + chunkSize);
      const arrayBuffer = await slice.arrayBuffer();

      // Send arrayBuffer back to main thread using Transferable Objects (0-copy memory transfer)
      self.postMessage({
        type: 'CHUNK_READY',
        chunkIndex,
        totalChunks,
        offset,
        size: arrayBuffer.byteLength,
        arrayBuffer
      }, [arrayBuffer]);
    } catch (err) {
      self.postMessage({
        type: 'CHUNK_ERROR',
        chunkIndex,
        error: err.message
      });
    }
  }
};
