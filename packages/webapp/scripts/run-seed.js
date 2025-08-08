// packages/webapp/scripts/run-seed.js
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌱 A iniciar o script de "seeding" da base de dados...');

try {
  const dataWorkerDir = path.resolve(__dirname, '../../data-worker');
  const pythonScriptPath = path.join(dataWorkerDir, 'update_all.py');

  // ALTERAÇÃO AQUI: Em vez de um caminho fixo, usamos o comando global do servidor
  const pythonExecutable = 'python3';

  console.log(`Diretório do worker: ${dataWorkerDir}`);
  console.log(`A executar o orquestrador Python: ${pythonExecutable} ${pythonScriptPath}`);

  execSync(`${pythonExecutable} ${pythonScriptPath}`, {
    stdio: 'inherit',
    cwd: dataWorkerDir
  });

  console.log('✅ "Seeding" da base de dados concluído com sucesso.');

} catch (error) {
  console.error('❌ Ocorreu um erro durante o "seeding" da base de dados:');
  console.error(error);
  process.exit(1);
}