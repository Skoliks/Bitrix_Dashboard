interface WritableNodeResponse {
  writeHead(status: number, headers: Record<string, string>): unknown
  end(chunk?: Uint8Array): unknown
}

export const writeWebResponse = async (
  webResponse: Response,
  nodeResponse: WritableNodeResponse
): Promise<void> => {
  nodeResponse.writeHead(webResponse.status, Object.fromEntries(webResponse.headers.entries()))

  if (!webResponse.body) {
    nodeResponse.end()
    return
  }

  nodeResponse.end(Buffer.from(await webResponse.arrayBuffer()))
}
