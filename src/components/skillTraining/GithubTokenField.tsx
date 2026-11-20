import { useId, useState } from 'react';

interface GithubTokenFieldProps {
  hasToken: boolean;
  setToken: (token: string | null) => void;
}

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

/**
 * A chave do GitHub deste aparelho (20/11/2026). É o André que a cria e cola:
 * fine-grained, só para o Baverone/tibiavault, com Contents: read and write.
 */
export function GithubTokenField({ hasToken, setToken }: GithubTokenFieldProps) {
  const [draft, setDraft] = useState('');
  const [open, setOpen] = useState(!hasToken);
  const id = useId();

  if (hasToken && !open) {
    return (
      <p className="nota skills-token">
        Este aparelho tem a chave do GitHub para gravar.{' '}
        <button type="button" className="btn sm" onClick={() => setOpen(true)}>
          Trocar
        </button>{' '}
        <button type="button" className="btn sm" onClick={() => setToken(null)}>
          Tirar
        </button>
      </p>
    );
  }

  return (
    <div className="skills-token">
      <p className="nota">
        Para gravar as leituras, este aparelho precisa de uma chave do GitHub (só uma vez por aparelho). Cria-a em{' '}
        <a href={TOKEN_URL} target="_blank" rel="noreferrer">
          github.com → Fine-grained token
        </a>
        : <b>Repository access</b> → só o <code>Baverone/tibiavault</code>; <b>Permissions</b> → <b>Contents</b>:{' '}
        <i>Read and write</i>. Cola-a aqui; fica só neste browser.
      </p>
      <div className="hunt-form__field" style={{ maxWidth: 420 }}>
        <label htmlFor={`${id}-token`}>Chave do GitHub</label>
        <input
          id={`${id}-token`}
          type="password"
          autoComplete="off"
          placeholder="github_pat_…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </div>
      <p>
        <button
          type="button"
          className="btn sm"
          disabled={draft.trim() === ''}
          onClick={() => {
            setToken(draft);
            setDraft('');
            setOpen(false);
          }}
        >
          Guardar a chave
        </button>
        {hasToken && (
          <>
            {' '}
            <button type="button" className="btn sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </>
        )}
      </p>
    </div>
  );
}
