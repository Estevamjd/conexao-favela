import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './styles.css';

export const metadata: Metadata = {
  description: 'Painel operacional do Conexao Favela para guias, pagamentos e acessos.',
  icons: {
    icon: '/favicon.svg',
  },
  title: 'Conexao Favela Admin',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
