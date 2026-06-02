import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

export interface AppProps {
  status: string;
  logs: string[];
}

export const App: React.FC<AppProps> = ({ status, logs }) => {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text bold> {status}</Text>
      </Box>

      <Box flexDirection="column">
        {logs.map((log, index) => (
          <Text key={index} dimColor>
            {`  > ${log}`}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
