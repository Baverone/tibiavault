import { readingFromConfig } from '../../domain/skillsHistory';
import type { TrainableSkill } from '../../domain/skillTraining';
import type { SkillsHistoryState } from '../../hooks/useSkillsHistory';
import type { SkillTrainingConfig } from '../../storage/skillTrainingStorage';
import { GithubTokenField } from './GithubTokenField';

interface SaveReadingBarProps {
  config: SkillTrainingConfig;
  skills: TrainableSkill[];
  history: SkillsHistoryState;
}

const timeFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * O botão que grava os skills escritos na calculadora (20/11/2026). Só grava
 * quando se carrega — gravar a cada tecla enchia o histórico de lixo.
 */
export function SaveReadingBar({ config, skills, history }: SaveReadingBarProps) {
  const reading = readingFromConfig(config, skills, Date.now());
  const { saveStatus } = history;

  return (
    <div className="skills-save">
      <p>
        <button
          type="button"
          className="btn"
          disabled={!reading || !history.hasToken || saveStatus.kind === 'saving'}
          onClick={() => {
            const now = readingFromConfig(config, skills, Date.now());
            if (now) void history.saveReading(now);
          }}
        >
          {saveStatus.kind === 'saving' ? 'A gravar…' : 'Gravar leitura'}
        </button>{' '}
        {!reading && <span className="nota">Escreve o nível e a % de pelo menos um skill para gravar.</span>}
        {saveStatus.kind === 'saved' && (
          <span className="nota">Gravada às {timeFormatter.format(saveStatus.at)} — já aparece na Evolução dos skills.</span>
        )}
      </p>
      {saveStatus.kind === 'error' && <p className="field-error">Não gravou: {saveStatus.message}.</p>}
      <GithubTokenField hasToken={history.hasToken} setToken={history.setToken} />
    </div>
  );
}
