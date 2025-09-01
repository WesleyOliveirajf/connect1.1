# 📋 Guia Completo de Deploy - CONECT

## 🎯 Objetivo
Este guia detalha como fazer o deploy da aplicação CONECT no GitHub Pages.

## 📋 Pré-requisitos

- [ ] Conta no GitHub
- [ ] Git instalado localmente
- [ ] Node.js (versão 18+)
- [ ] Repositório GitHub criado: `https://github.com/WesleyOliveirajf/connect1.1`

## 🚀 Passo a Passo para Deploy

### 1. Preparar o Repositório Local

```bash
# Inicializar git (se ainda não foi feito)
git init

# Adicionar o repositório remoto
git remote add origin https://github.com/WesleyOliveirajf/connect1.1.git

# Verificar se o remote foi adicionado
git remote -v
```

### 2. Preparar os Arquivos para Deploy

```bash
# Adicionar todos os arquivos
git add .

# Fazer o commit inicial
git commit -m "feat: configuração inicial do projeto CONECT"

# Fazer push para a branch main
git push -u origin main
```

### 3. Configurar GitHub Pages

1. **Acesse o repositório no GitHub:**
   - Vá para `https://github.com/WesleyOliveirajf/connect1.1`

2. **Configurar Pages:**
   - Clique em "Settings" (Configurações)
   - No menu lateral, clique em "Pages"
   - Em "Source", selecione "GitHub Actions"
   - Salve as configurações

### 4. Verificar o Deploy

1. **Acompanhar o Workflow:**
   - Vá para a aba "Actions" no repositório
   - Verifique se o workflow "Deploy to GitHub Pages" está executando
   - Aguarde a conclusão (geralmente 2-5 minutos)

2. **Acessar a Aplicação:**
   - URL: `https://wesleyoliveirajf.github.io/connect1.1/`
   - A aplicação estará disponível após o deploy ser concluído

## 🔧 Configurações Técnicas

### Arquivos Importantes para Deploy

- **`.github/workflows/deploy.yml`** - Workflow de deploy automático
- **`vite.config.ts`** - Configuração do Vite com base path correto
- **`vercel.json`** - Configurações de segurança e redirecionamento
- **`package.json`** - Scripts de build

### Base Path Configurado

O projeto está configurado para usar `/connect1.1/` como base path no GitHub Pages.

## 🔄 Deploy de Atualizações

Para deployar novas versões:

```bash
# Fazer alterações no código
# ...

# Adicionar alterações
git add .

# Commit com mensagem descritiva
git commit -m "feat: nova funcionalidade X"

# Push para main (deploy automático)
git push origin main
```

## 🐛 Solução de Problemas

### Deploy Falhou
1. Verifique os logs na aba "Actions"
2. Certifique-se que o `package.json` tem o script `build`
3. Verifique se não há erros de TypeScript

### Página não Carrega
1. Verifique se o GitHub Pages está ativado
2. Confirme se o base path está correto no `vite.config.ts`
3. Aguarde alguns minutos para propagação

### Erro 404 em Rotas
1. O `vercel.json` já está configurado para SPA
2. Verifique se o arquivo está no repositório

## 📞 Suporte

Em caso de problemas:
1. Verifique os logs do GitHub Actions
2. Consulte a documentação do GitHub Pages
3. Revise as configurações do Vite

---

**✅ Checklist Final:**
- [ ] Código commitado e enviado para GitHub
- [ ] GitHub Pages configurado como "GitHub Actions"
- [ ] Workflow executado com sucesso
- [ ] Aplicação acessível em `https://wesleyoliveirajf.github.io/connect1.1/`