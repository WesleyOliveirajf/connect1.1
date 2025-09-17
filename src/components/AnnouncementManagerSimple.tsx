import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Announcement } from "@/hooks/useAnnouncements";
import React, { useState, useEffect, useRef } from "react";

interface AnnouncementManagerSimpleProps {
  announcements: Announcement[];
  onAnnouncementsChange: (announcements: Announcement[]) => void;
}

const AnnouncementManagerSimple: React.FC<AnnouncementManagerSimpleProps> = ({
  announcements,
  onAnnouncementsChange,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] =
    useState<Announcement | null>(null);
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDialogOpen) {
      const timeoutId = setTimeout(() => {
        setCurrentAnnouncement(null);
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isDialogOpen]);

  const resetForm = () => {
    setCurrentAnnouncement(null);
    setIsDialogOpen(false);
  };

  const handleSave = () => {
    if (!currentAnnouncement || !currentAnnouncement.title.trim() || !currentAnnouncement.content.trim()) {
      toast({
        title: "⚠️ Campos Obrigatórios",
        description: "Título e conteúdo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const now = new Date();
    let updatedAnnouncements;

    if (currentAnnouncement.id) {
      updatedAnnouncements = announcements.map((ann) =>
        ann.id === currentAnnouncement.id
          ? { ...currentAnnouncement, updatedAt: now.toISOString() }
          : ann
      );
      toast({
        title: "✅ Comunicado Atualizado",
        description: `"${currentAnnouncement.title}" foi atualizado com sucesso.`,
      });
    } else {
      const newAnnouncement: Announcement = {
        ...currentAnnouncement,
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        date: now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
      };
      updatedAnnouncements = [newAnnouncement, ...announcements];
      toast({
        title: "✅ Comunicado Criado",
        description: `"${newAnnouncement.title}" foi adicionado com sucesso.`,
      });
    }

    onAnnouncementsChange(updatedAnnouncements);
    setIsSaving(false);
    resetForm();
  };

  const handleEdit = (announcement: Announcement) => {
    if (isDialogOpen) {
      setIsDialogOpen(false);
      setTimeout(() => {
        setCurrentAnnouncement(announcement);
        setIsDialogOpen(true);
      }, 150);
    } else {
      setCurrentAnnouncement(announcement);
      setIsDialogOpen(true);
    }
  };

  const handleDelete = (id: string) => {
    const announcementToDelete = announcements.find((ann) => ann.id === id);
    if (announcementToDelete) {
      onAnnouncementsChange(announcements.filter((ann) => ann.id !== id));
      toast({
        title: "🗑️ Comunicado Removido",
        description: `"${announcementToDelete.title}" foi excluído com sucesso.`,
      });
    }
  };

  const handleCreate = () => {
    setCurrentAnnouncement({
      id: "",
      title: "",
      content: "",
      priority: "baixa",
      date: "",
      createdAt: "",
      updatedAt: ""
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Gerenciador de Comunicados</h2>
        <Button onClick={handleCreate}>Novo Comunicado</Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent
          ref={dialogContentRef}
          className="sm:max-w-[600px] bg-gray-800 border-gray-700 text-white"
          onInteractOutside={(e) => {
            if (e.target instanceof HTMLElement && e.target.closest('[data-radix-select-content]')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {currentAnnouncement?.id ? "Editar Comunicado" : "Novo Comunicado"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right">
                Título
              </Label>
              <Input
                id="title"
                value={currentAnnouncement?.title || ""}
                onChange={(e) =>
                  setCurrentAnnouncement((prev) =>
                    prev ? { ...prev, title: e.target.value } : null
                  )
                }
                className="col-span-3 bg-gray-700 border-gray-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="content" className="text-right">
                Conteúdo
              </Label>
              <Textarea
                id="content"
                value={currentAnnouncement?.content || ""}
                onChange={(e) =>
                  setCurrentAnnouncement((prev) =>
                    prev ? { ...prev, content: e.target.value } : null
                  )
                }
                className="col-span-3 bg-gray-700 border-gray-600"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="priority" className="text-right">
                Prioridade
              </Label>
              <Select
                value={currentAnnouncement?.priority || "baixa"}
                onValueChange={(value) =>
                  setCurrentAnnouncement((prev) =>
                    prev ? { ...prev, priority: value } : null
                  )
                }
              >
                <SelectTrigger className="col-span-3 bg-gray-700 border-gray-600">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent container={dialogContentRef.current ?? undefined}>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {announcements.map((ann) => (
          <div key={ann.id} className="p-4 bg-gray-800 rounded-lg flex justify-between items-start">
            <div>
              <h3 className="font-bold">{ann.title}</h3>
              <p className="text-sm text-gray-400">{ann.content}</p>
              <div className="text-xs text-gray-500 mt-2">
                <span>Prioridade: {ann.priority}</span> | <span>Data: {ann.date}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleEdit(ann)}>
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(ann.id)}>
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementManagerSimple;