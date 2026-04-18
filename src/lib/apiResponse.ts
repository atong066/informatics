export type ApiResponseBody<TData = unknown> = {
  message?: string;
  data?: TData;
  errors?: Record<string, string[]>;
};

function cleanHtmlResponse(text: string) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getNonJsonMessage(response: Response, text: string, fallbackMessage: string) {
  if (response.status === 413) {
    return 'This request is too large for the server to accept. Use a smaller recording or end without uploading one.';
  }

  if (response.status === 404) {
    return 'The API endpoint was not found. Restart the backend server, then try again.';
  }

  if (response.status >= 500) {
    return 'The server returned an unexpected error. Check the backend terminal, then try again.';
  }

  const cleanedText = cleanHtmlResponse(text);

  return cleanedText
    ? `${fallbackMessage} ${cleanedText.slice(0, 180)}`
    : fallbackMessage;
}

export async function readApiResponse<TResponse extends ApiResponseBody>(
  response: Response,
  fallbackMessage: string,
) {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

  if (contentType.includes('application/json')) {
    try {
      return await response.json() as TResponse;
    } catch {
      return { message: fallbackMessage } as TResponse;
    }
  }

  const text = await response.text().catch(() => '');

  return {
    message: getNonJsonMessage(response, text, fallbackMessage),
  } as TResponse;
}
