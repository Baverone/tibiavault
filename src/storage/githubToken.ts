// A chave do GitHub que deixa este aparelho gravar o histórico dos skills
// (20/11/2026). Fica só no browser onde o André a colou: nunca vai para o
// repositório nem para outro sítio. Sem localStorage (janela privada) não há
// chave e o botão diz que falta.
const KEY = 'tibiavault:github-token';

export function getGithubToken(): string | null {
  try {
    const value = localStorage.getItem(KEY);
    return value && value.trim() !== '' ? value.trim() : null;
  } catch {
    return null;
  }
}

export function setGithubToken(token: string | null): void {
  try {
    if (token && token.trim() !== '') localStorage.setItem(KEY, token.trim());
    else localStorage.removeItem(KEY);
  } catch {
    // Sem armazenamento a chave vive só até fechar a página — nada a fazer.
  }
}
