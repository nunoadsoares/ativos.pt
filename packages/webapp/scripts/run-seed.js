// packages/webapp/scripts/run-seed.js
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper para obter o __dirname em módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌱 A iniciar o script de "seeding" da base de dados...');

try {
  // Constrói os caminhos de forma robusta a partir da localização deste script
  const dataWorkerDir = path.resolve(__dirname, '../../data-worker');
  const pythonScriptPath = path.join(dataWorkerDir, 'update_all.py');
  
  // Caminho para o executável Python dentro do ambiente virtual (venv)
  // Ajusta se o nome da tua pasta venv for diferente (ex: venv, .venv, etc.)
  const pythonExecutable = path.join(dataWorkerDir, '.venv', 'bin', 'python');

  console.log(`Diretório do worker: ${dataWorkerDir}`);
  console.log(`A executar o orquestrador Python: ${pythonExecutable} ${pythonScriptPath}`);

  // Executa o script update_all.py
  // O 'stdio: inherit' é muito importante para vermos o output do Python no log do GitHub Actions
  execSync(`${pythonExecutable} ${pythonScriptPath}`, {
    stdio: 'inherit',
    cwd: dataWorkerDir // Define o diretório de trabalho para o script Python
  });

  console.log('✅ "Seeding" da base de dados concluído com sucesso.');

} catch (error) {
  console.error('❌ Ocorreu um erro durante o "seeding" da base de dados:');
  console.error('Certifica-te que o ambiente virtual Python está em "packages/data-worker/.venv" e que as dependências (requirements.txt) estão instaladas no teu Dockerfile.');
  console.error(error);
  process.exit(1); // Termina o processo com um código de erro para o GitHub Actions saber que falhou
}