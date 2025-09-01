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
import { Plus, Edit, Trash2, Eye, EyeOff, Megaphone } from 'lucide-react';
import { Announcement } from '@/hooks/useAnnouncements';


interface AnnouncementManagerProps {
  announcements: Announcement[];
  onAnnouncementsChange: (announcements: Announcement[]) => void;
  exportData?: () => string | null;
  importData?: (jsonData: string) => boolean;
  restoreFromBackup?: () => boolean;
  resetAnnouncements?: () => boolean;
}

const AnnouncementManager: React.FC<AnnouncementManagerProps> = ({ 
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
    </Card>
  );
};

export default AnnouncementManager;