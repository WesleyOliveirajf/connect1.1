import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Eye, EyeOff, Megaphone } from 'lucide-react';
import { useAnnouncements, type Announcement } from '@/hooks/useAnnouncements';


const AnnouncementManager: React.FC = () => {
  const { 
    announcements, 
    addAnnouncement, 
    updateAnnouncement, 
    deleteAnnouncement,
    exportData,
    importData 
  } = useAnnouncements();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showAllAnnouncements, setShowAllAnnouncements] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'média' as 'alta' | 'média' | 'baixa'
  });
  
  const { toast } = useToast();



  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "⚠️ Campos Obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (editingAnnouncement) {
      // Editar comunicado existente
      const success = await updateAnnouncement(editingAnnouncement.id, {
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
      });
      
      if (success) {
        setEditingAnnouncement(null);
        setIsCreateOpen(false);
      }
    } else {
      // Criar novo comunicado
      const success = await addAnnouncement({
        title: formData.title.trim(),
        content: formData.content.trim(),
        priority: formData.priority,
      });
      
      if (success) {
        setIsCreateOpen(false);
      }
    }

    // Reset form
    setFormData({ title: '', content: '', priority: 'média' });
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

  const handleDelete = async (id: string) => {
    const announcement = announcements.find(ann => ann.id === id);
    if (announcement) {
      setAnnouncementToDelete(announcement);
    }
  };

  const confirmDelete = async () => {
    if (announcementToDelete) {
      await deleteAnnouncement(announcementToDelete.id);
      setAnnouncementToDelete(null);
    }
  };



  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'hsl(var(--announcement-accent))';
      case 'média': return 'hsl(var(--directory-accent))';
      case 'baixa': return 'hsl(var(--lunch-accent))';
      default: return 'hsl(var(--muted-foreground))';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta': return '🔴';
      case 'média': return '🟡';
      case 'baixa': return '🟢';
      default: return '⚪';
    }
  };

  const getAnimationClass = (index: number) => {
    return `animate-slide-up-delay-${index}`;
  };

  return (
    <Card className="gradient-card shadow-card hover:shadow-hover hover:shadow-glow transition-all duration-500 p-8 group animate-slide-up">
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ 
              background: `linear-gradient(135deg, hsl(var(--announcement-accent) / 0.1) 0%, hsl(var(--announcement-accent) / 0.05) 100%)`,
              border: `1px solid hsl(var(--announcement-accent) / 0.2)`
            }}>
              <Megaphone className="h-6 w-6" style={{ color: 'hsl(var(--announcement-accent))' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-card-foreground mb-4">Comunicados Torp</h2>
              <p className="text-sm text-muted-foreground">
                {announcements.length} comunicado{announcements.length !== 1 ? 's' : ''} ativo{announcements.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Botão Adicionar Comunicado */}
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Adicionar Comunicado
            </Button>
            
            {/* Controles de Visualização */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllAnnouncements(!showAllAnnouncements)}
              className="gap-1 px-2 py-1 text-xs"
            >
              {showAllAnnouncements ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {showAllAnnouncements ? 'Menos' : 'Todos'}
            </Button>
          </div>
        </div>
      </div>


      
      {/* Lista de Comunicados */}
      <div className="space-y-4">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-muted-foreground">
              Não há comunicados recentes para exibir.
            </p>
          </div>
        ) : (
          (showAllAnnouncements ? announcements : announcements.slice(0, 4)).map((announcement, index) => (
            <div key={announcement.id} 
                 className={`group/item p-5 rounded-xl gradient-secondary hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-border ${getAnimationClass(index)}`}>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-secondary-foreground text-lg group-hover/item:text-foreground transition-colors line-clamp-2">
                    {announcement.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="secondary" 
                      className="text-xs font-semibold px-2 py-1 shadow-sm flex-shrink-0"
                      style={{ 
                        backgroundColor: `${getPriorityColor(announcement.priority)}15`,
                        color: getPriorityColor(announcement.priority),
                        border: `1px solid ${getPriorityColor(announcement.priority)}40`
                      }}
                    >
                      {getPriorityIcon(announcement.priority)}
                    </Badge>
                    
                    {/* Botões de Ação */}
                    <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                        title="Editar comunicado"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(announcement.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                        title="Excluir comunicado"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm line-clamp-3">
                  {announcement.content}
                </p>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-1 rounded-lg">
                    {announcement.date}
                  </span>
                  {announcement.updatedAt && announcement.updatedAt !== announcement.createdAt && (
                    <span className="text-xs text-muted-foreground font-medium">
                      Editado
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog de Criação/Edição */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              {editingAnnouncement ? 'Editar Comunicado' : 'Novo Comunicado'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do comunicado"
              />
            </div>

            {/* Conteúdo */}
            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Digite o conteúdo do comunicado"
                rows={4}
              />
            </div>

            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: 'alta' | 'média' | 'baixa') => 
                  setFormData(prev => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">🔴 Alta</SelectItem>
                  <SelectItem value="média">🟡 Média</SelectItem>
                  <SelectItem value="baixa">🟢 Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                className="flex-1 gap-2"
                disabled={!formData.title.trim() || !formData.content.trim()}
              >
                <Plus className="h-4 w-4" />
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

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!announcementToDelete} onOpenChange={() => setAnnouncementToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-500" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o comunicado <strong>"{announcementToDelete?.title}"</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AnnouncementManager;