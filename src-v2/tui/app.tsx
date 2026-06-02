import React, { useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

export interface AppProps {
  status: string;
  logs: string[];
  onSubmit: (text: string) => void;
}

export const App: React.FC<AppProps> = ({ status, logs, onSubmit }) => {
  const [query, setQuery] = useState("");

  const handleSubmit = (value: string) => {
    setQuery("");
    onSubmit(value);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box flexDirection="column">
        {logs.map((log, index) => (
          <Text key={index} dimColor>
            {`  > ${log}`}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text bold> {status}</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="green">❯ </Text>
        <TextInput 
          value={query} 
          onChange={setQuery} 
          onSubmit={handleSubmit} 
          placeholder="Type a task or command (e.g. /provider openai, /exit)..."
        />
      </Box>
    </Box>
  );
};
