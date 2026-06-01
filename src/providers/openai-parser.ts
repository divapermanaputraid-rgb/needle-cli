export function parseOpenAIResponse(text: string, providerName: string, statusCode: number) {
  if (statusCode < 200 || statusCode >= 300) {
    let errorMessage = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error?.message) errorMessage = parsed.error.message;
    } catch (e) {
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error?.message) {
              errorMessage = parsed.error.message;
              break;
            }
          } catch (e2) {}
        }
      }
    }
    throw new Error(`Provider ${providerName} request failed: ${statusCode} ${errorMessage}`);
  }

  let isSSE = false;
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('data:')) {
      isSSE = true;
      break;
    }
  }

  if (!isSSE) {
    try {
      const data = JSON.parse(text);
      if (data.error?.message) {
        throw new Error(`Provider ${providerName} request failed: ${statusCode} ${data.error.message}`);
      }
      if (!data.choices || !Array.isArray(data.choices)) {
        throw new Error(`Provider ${providerName} returned an invalid chat response: missing choices.`);
      }
      if (data.choices.length === 0) {
        throw new Error(`Provider ${providerName} returned an empty chat response.`);
      }
      const content = data.choices[0]?.message?.content ?? data.choices[0]?.text;
      if (typeof content !== 'string') {
        throw new Error(`Provider ${providerName} returned an invalid message content.`);
      }
      return {
        content,
        usage: data.usage ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      };
    } catch (e) {
      if (e instanceof Error && e.message.startsWith(`Provider ${providerName}`)) {
        throw e;
      }
      throw new Error(`Provider ${providerName} returned an invalid chat response.`);
    }
  }

  let fullContent = '';
  let foundAnyContent = false;
  let usage: any = undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('data:')) continue;
    
    const dataStr = trimmed.slice(5).trim();
    if (dataStr === '[DONE]') break;

    let data;
    try {
      data = JSON.parse(dataStr);
    } catch (e) {
      throw new Error(`Provider ${providerName} returned an invalid chat response.`);
    }

    if (data.error?.message) {
      throw new Error(`Provider ${providerName} request failed: ${statusCode} ${data.error.message}`);
    }

    if (data.usage) {
      usage = data.usage;
    }

    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const choice = data.choices[0];
      const contentChunk = choice.delta?.content ?? choice.message?.content ?? choice.text;
      if (typeof contentChunk === 'string') {
        fullContent += contentChunk;
        foundAnyContent = true;
      }
    }
  }

  if (!foundAnyContent) {
    throw new Error(`Provider ${providerName} returned an empty chat response.`);
  }

  return {
    content: fullContent,
    usage: usage ? {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
    } : undefined,
  };
}