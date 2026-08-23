import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('Composant App', () => {
  it('s\'affiche correctement sans erreur', () => {
    render(<App />);
    // Remplacez le texte par un élément visible dans votre application
    expect(document.body).toBeDefined();
  });
});
