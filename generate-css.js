const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Caminhos
const inputCssPath = path.join(__dirname, 'src', 'input.css');
const outputCssPath = path.join(__dirname, 'dist', 'output.css');
const distDir = path.join(__dirname, 'dist');

// Criar diretório dist se não existir
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  console.log(`Diretório ${distDir} criado com sucesso.`);
}

try {
  // Verificar se o arquivo de entrada existe
  if (!fs.existsSync(inputCssPath)) {
    console.error(`Erro: O arquivo ${inputCssPath} não foi encontrado.`);
    process.exit(1);
  }

  // Comando para gerar o CSS do Tailwind
  const command = `npx tailwindcss -i ${inputCssPath} -o ${outputCssPath} --minify`;
  
  console.log(`Executando: ${command}`);
  
  // Executar o comando
  execSync(command, { stdio: 'inherit' });
  
  console.log(`Arquivo CSS gerado com sucesso em: ${outputCssPath}`);
} catch (error) {
  console.error('Erro ao gerar o arquivo CSS:', error);
  process.exit(1);
}
