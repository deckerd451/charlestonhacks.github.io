import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppContent } from './components/AppContent';
import { mantineTheme } from './theme/mantineTheme';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={mantineTheme} defaultColorScheme="dark">
        <Notifications position="top-right" />
        <BrowserRouter basename="/app">
          <AppContent />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  );
}

export default App;
