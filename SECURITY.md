# Guia de Segurança - Torp Huddle Space

## 🔒 Configuração Segura para Produção

### Variáveis de Ambiente Obrigatórias

Antes de fazer deploy em produção, configure as seguintes variáveis de ambiente:

```bash
# .env (nunca commitar este arquivo!)
VITE_ADMIN_PASSWORD=SuaSenhaSeguraMuitoForte!@#123
VITE_ENCRYPTION_SALT=SeuSaltUnicoAleatorio1234567890
```

### Gerando Valores Seguros

#### 1. Senha Administrativa
- **Mínimo 12 caracteres**
- Combine letras maiúsculas, minúsculas, números e símbolos
- Exemplo de geração: `openssl rand -base64 16`

#### 2. Salt de Criptografia
- **Valor único por instalação**
- Jamais reutilize entre ambientes
- Exemplo de geração: `openssl rand -hex 32`

## 🛡️ Funcionalidades de Segurança Implementadas

### Autenticação
- ✅ Senha não está mais hardcoded no código
- ✅ Sessões com timeout automático (30 minutos)
- ✅ Logs de tentativas de acesso inválidas
- ✅ Renovação automática de sessão por atividade

### Criptografia de Dados
- ✅ Dados sensíveis criptografados com AES
- ✅ Chave baseada em domínio + salt único
- ✅ Backup automático criptografado
- ✅ Fallback seguro para dados corrompidos

### Headers de Segurança (Vercel)
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ X-XSS-Protection: 1; mode=block
- ✅ Content-Security-Policy configurado
- ✅ Permissions-Policy restritivo

## 🔧 Lista de Verificação para Deploy

### Antes do Deploy
- [ ] Configurar `VITE_ADMIN_PASSWORD` com senha forte
- [ ] Configurar `VITE_ENCRYPTION_SALT` com valor único
- [ ] Verificar que .env não está no controle de versão
- [ ] Executar `npm audit` para vulnerabilidades
- [ ] Testar build: `npm run build`

### Pós-Deploy
- [ ] Testar login administrativo
- [ ] Verificar headers de segurança (F12 > Network)
- [ ] Confirmar criptografia dos dados (localStorage)
- [ ] Testar timeout de sessão (aguardar 30 min)

## 🚨 Monitoramento de Segurança

### Logs de Auditoria
O sistema registra automaticamente no console do navegador:
- Tentativas de login inválidas
- Criação/destruição de sessões
- Falhas de criptografia/descriptografia
- Uso de configurações padrão (inseguras)

### Alertas de Configuração
- ⚠️ Salt padrão sendo usado
- ⚠️ Senha padrão de desenvolvimento
- ⚠️ Dados corrompidos detectados

## 📋 Classificação Atual de Segurança

**Status: 🟢 ALTA** (após implementação completa)

### Melhorias Implementadas
1. ✅ **Crítico**: Senha hardcoded removida
2. ✅ **Crítico**: Dependências vulneráveis atualizadas  
3. ✅ **Médio**: Headers de segurança adicionados
4. ✅ **Médio**: Criptografia de dados implementada
5. ✅ **Médio**: Gerenciamento de sessão seguro

## 🔄 Próximos Passos (Opcional)

### Melhorias Futuras
- [ ] Implementar 2FA (autenticação de dois fatores)
- [ ] Rate limiting para tentativas de login
- [ ] Auditoria em arquivo/servidor remoto
- [ ] Notificações de segurança por email
- [ ] Backup automático criptografado em nuvem

## 📞 Contato de Segurança

Em caso de vulnerabilidades encontradas:
1. **NÃO** publique a vulnerabilidade
2. Entre em contato com a equipe de TI da Torp
3. Forneça detalhes técnicos por canal seguro

---

**🔒 Mantenha este documento atualizado com novas implementações de segurança**