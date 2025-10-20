import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

declare var Sentry: any;

// Sentry Integration: Initialize Sentry for error tracking and performance monitoring.
// Replace the DSN with your actual Sentry DSN.
if (typeof Sentry !== 'undefined') {
  Sentry.init({
    dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0', // <-- PASTE YOUR DSN HERE
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of transactions for performance monitoring.
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
  });
}


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppWithSentry = typeof Sentry !== 'undefined' ? Sentry.withErrorBoundary(App) : App;

root.render(
  <React.StrictMode>
    <AppWithSentry />
  </React.StrictMode>
);