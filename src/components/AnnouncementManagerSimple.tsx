import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Download, Upload, RotateCcw, Megaphone } from 'lucide-react';
import { Announcement } from '@/hooks/useAnnouncements';


interface AnnouncementManagerSimpleProps {
  announcements: Announcement[];
  onAnnouncementsChange: (announcements: Announcement[]) => void;
  exportData?: () => string | null;
  importData?: (jsonData: string) => boolean;
  restoreFromBackup?: () => boolean;
  resetAnnouncements?: () => boolean;
}

const AnnouncementManagerSimple: React.FC<AnnouncementManagerSimpleProps> = ({ 
  announcements, 
  onAnnouncementsChange,
  exportData,
  importData,
  restoreFromBackup,
  resetAnnouncements
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [importJsonData, setImportJsonData] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'média' as 'alta' | 'média' | 'baixa'
  });
  
  const { toast } = useToast();

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "⚠️ Campos Obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    if (editingAnnouncement) {
      // Editar comunicado existente
      const updatedAnnouncements = announcements.map(ann => 
        ann.id === editingAnnouncement.id 
          ? { ...ann, ...formData, date: dateStr, updatedAt: now.toISOString() }
          : ann
      );
      const success = onAnnouncementsChange(updatedAnnouncements);
      
      if (success !== false) {
        toast({
          title: "✅ Comunicado Atualizado",
          description: `"${formData.title}" foi atualizado com sucesso.`,
        });
      } else {
        toast({
          title: "❌ Erro ao Atualizar",
          description: "Falha ao salvar as alterações. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Criar novo comunicado
      const newAnnouncement: Announcement = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...formData,
        title: formData.title.trim(),
        content: formData.content.trim(),
        date: dateStr,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      const success = onAnnouncementsChange([newAnnouncement, ...announcements]);
      
      if (success !== false) {
        toast({
          title: "✅ Comunicado Criado",
          description: `"${newAnnouncement.title}" foi adicionado com sucesso.`,
        });
      } else {
        toast({
          title: "❌ Erro ao Criar",
          description: "Falha ao salvar o comunicado. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }

    // Reset form
    setFormData({ title: '', content: '', priority: 'média' });
    setEditingAnnouncement(null);
    setIsCreateOpen(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority
    });
    setIsCreateOpen(true);
  };

  const handleDelete = (id: string) => {
    const announcementToDelete = announcements.find(ann => ann.id === id);
    const updatedAnnouncements = announcements.filter(ann => ann.id !== id);
    const success = onAnnouncementsChange(updatedAnnouncements);
    
    if (success !== false) {
      toast({
        title: "🗑️ Comunicado Removido",
        description: `"${announcementToDelete?.title || 'Comunicado'}" foi excluído com sucesso.`,
      });
    } else {
      toast({
        title: "❌ Erro ao Excluir",
        description: "Falha ao remover o comunicado. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Funções administrativas
  const handleExportData = () => {
    if (!exportData) {
      toast({
        title: "❌ Função Indisponível",
        description: "Exportação não está disponível.",
        variant: "destructive",
      });
      return;
    }

    try {
      const data = exportData();
      if (data) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `torp-comunicados-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "📥 Backup Exportado",
          description: "Arquivo de backup baixado com sucesso.",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erro na Exportação",
        description: "Falha ao gerar o arquivo de backup.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = () => {
    if (!importData || !importJsonData.trim()) {
      toast({
        title: "❌ Dados Inválidos",
        description: "Cole os dados JSON válidos para importar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const success = importData(importJsonData);
      if (success) {
        toast({
          title: "📤 Dados Importados",
          description: "Comunicados importados com sucesso.",
        });
        setImportJsonData('');
      } else {
        toast({
          title: "❌ Erro na Importação",
          description: "Falha ao importar os dados. Verifique o formato.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Formato Inválido",
        description: "Os dados fornecidos não estão em formato JSON válido.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreBackup = () => {
    if (!restoreFromBackup) {
      toast({
        title: "❌ Função Indisponível",
        description: "Restauração não está disponível.",
        variant: "destructive",
      });
      return;
    }

    const success = restoreFromBackup();
    if (success) {
      toast({
        title: "🔄 Backup Restaurado",
        description: "Dados restaurados do backup com sucesso.",
      });
    } else {
      toast({
        title: "❌ Erro na Restauração",
        description: "Falha ao restaurar do backup.",
        variant: "destructive",
      });
    }
  };

  const handleResetToDefault = () => {
    if (!resetAnnouncements) {
      toast({
        title: "❌ Função Indisponível",
        description: "Reset não está disponível.",
        variant: "destructive",
      });
      return;
    }

    const success = resetAnnouncements();
    if (success) {
      toast({
        title: "🔄 Dados Resetados",
        description: "Comunicados restaurados para os dados padrão.",
      });
    } else {
      toast({
        title: "❌ Erro no Reset",
        description: "Falha ao resetar os dados.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'hsl(var(--destructive))';
      case 'média': return 'hsl(var(--warning))';
      case 'baixa': return 'hsl(var(--success))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta': return '🔴 Alta';
      case 'média': return '🟡 Média';
      case 'baixa': return '🟢 Baixa';
      default: return '⚪ Normal';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Gerenciar Comunicados</h2>
            <p className="text-muted-foreground">
              {announcements.length} comunicado{announcements.length !== 1 ? 's' : ''} cadastrado{announcements.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* Botões de Administração */}
          <Button onClick={handleExportData} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={handleRestoreBackup} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Restaurar
          </Button>
          
          {/* Botão Adicionar */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Comunicado
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl" aria-describedby="create-announcement-description">
              <div id="create-announcement-description" className="sr-only">
                Formulário para criar ou editar comunicado
              </div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  {editingAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Digite o título do comunicado"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Digite o conteúdo do comunicado"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(value: 'alta' | 'média' | 'baixa') => setFormData({ ...formData, priority: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">🟢 Baixa</SelectItem>
                      <SelectItem value="média">🟡 Média</SelectItem>
                      <SelectItem value="alta">🔴 Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} className="flex-1">
                    {editingAnnouncement ? 'Atualizar' : 'Criar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsCreateOpen(false);
                      setEditingAnnouncement(null);
                      setFormData({ title: '', content: '', priority: 'média' });
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seções de Administração */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seção de Importação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5" />
              Importar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={importJsonData}
              onChange={(e) => setImportJsonData(e.target.value)}
              placeholder="Cole aqui os dados JSON do backup..."
              rows={4}
              className="font-mono text-sm"
            />
            <Button onClick={handleImportData} size="sm" className="w-full gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </Button>
          </CardContent>
        </Card>

        {/* Seção de Reset */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-red-700">
              <RotateCcw className="h-5 w-5" />
              Reset de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-600">
              ⚠️ Esta ação irá restaurar todos os comunicados para os dados padrão da empresa.
            </p>
            <Button 
              onClick={handleResetToDefault} 
              variant="destructive" 
              size="sm" 
              className="w-full gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Resetar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Comunicados */}
      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-muted-foreground">
              Não há comunicados cadastrados.
            </p>
          </Card>
        ) : (
          announcements.map((announcement) => (
            <Card key={announcement.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{announcement.title}</h3>
                    <Badge 
                      variant="secondary" 
                      className="text-xs"
                      style={{ 
                        backgroundColor: `${getPriorityColor(announcement.priority)}15`,
                        color: getPriorityColor(announcement.priority),
                        border: `1px solid ${getPriorityColor(announcement.priority)}40`
                      }}
                    >
                      {getPriorityIcon(announcement.priority)}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-sm mb-2">
                    {announcement.content}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {announcement.date}
                    </span>
                    {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        Editado
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(announcement)}
                    className="gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(announcement.id)}
                    className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnouncementManagerSimple;