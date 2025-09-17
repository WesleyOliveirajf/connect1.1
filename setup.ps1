# Script de Setup Automático - Connect 1.1
# Este script configura automaticamente o ambiente de desenvolvimento

Write-Host "🚀 Iniciando setup do Connect 1.1..." -ForegroundColor Green

# Verificar se o Node.js está instalado
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js não encontrado. Instale o Node.js primeiro." -ForegroundColor Red
    exit 1
}

# Verificar se o npm está instalado
try {
    $npmVersion = npm --version
    Write-Host "✅ npm encontrado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm não encontrado." -ForegroundColor Red
    exit 1
}

# Copiar .env.example para .env se não existir
if (-not (Test-Path ".env")) {
    Write-Host "📋 Copiando .env.example para .env..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Arquivo .env criado com configurações padrão" -ForegroundColor Green
} else {
    Write-Host "✅ Arquivo .env já existe" -ForegroundColor Green
}

# Instalar dependências
Write-Host "📦 Instalando dependências..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependências instaladas com sucesso" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao instalar dependências" -ForegroundColor Red
    exit 1
}

# Verificar se a chave Groq está configurada
$envContent = Get-Content ".env" -Raw
if ($envContent -match "VITE_GROQ_API_KEY=your_groq_api_key_here") {
    Write-Host "⚠️  Configure a chave Groq no arquivo .env" -ForegroundColor Yellow
    Write-Host "   Substitua 'your_groq_api_key_here' pela sua chave da Groq" -ForegroundColor Gray
    Write-Host "   Obtenha sua chave em: https://console.groq.com/keys" -ForegroundColor Gray
} elseif ($envContent -match "VITE_GROQ_API_KEY=gsk_") {
    Write-Host "✅ Chave Groq configurada" -ForegroundColor Green
} else {
    Write-Host "⚠️  Chave Groq não encontrada no .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Setup concluído com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Para iniciar o projeto:" -ForegroundColor Cyan
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Para acessar:" -ForegroundColor Cyan
Write-Host "  http://localhost:8080" -ForegroundColor White
Write-Host ""
Write-Host "Funcionalidades disponíveis:" -ForegroundColor Cyan
Write-Host "  ✅ Chatbot com IA (Groq)" -ForegroundColor White
Write-Host "  ✅ RAG (busca em dados internos)" -ForegroundColor White
Write-Host "  ✅ Diretório de funcionários" -ForegroundColor White
Write-Host "  ✅ Sistema de comunicados" -ForegroundColor White
Write-Host "  ✅ PWA (Progressive Web App)" -ForegroundColor White