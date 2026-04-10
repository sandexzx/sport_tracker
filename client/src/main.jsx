import './styles/tokens.css';
import './styles/global.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient.js';
import App from './App.jsx';
import UpdatePrompt from './components/ui/UpdatePrompt.jsx';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <UpdatePrompt />
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
