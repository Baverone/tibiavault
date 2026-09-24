import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// A ORDEM importa: tokens → componentes da app → casca. A casca vem por último
// para ter a última palavra sobre o que é partilhado (o layout, os botões, os
// cartões) e a app continuar a mandar no que é dela.
import './styles/tokens.css';
import './styles/theme.css';
import './styles/shell.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
