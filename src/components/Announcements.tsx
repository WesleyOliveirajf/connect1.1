import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown, ChevronUp } from "lucide-react";
import { useStaggerAnimation } from "@/hooks/useStaggerAnimation";
import { useState } from "react";

type Announcement = {
  title: string;
  content: string;
  priority: 'alta' | 'média' | 'baixa';
  date: string;
};

const Announcements = () => {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };
  
  // Lista de comunicados limpa - todos os comunicados anteriores foram removidos
  const announcements: Announcement[] = [];

  // Mostrar apenas os 4 últimos comunicados
  const recentAnnouncements = announcements.slice(0, 4);
  
  const { getAnimationClass } = useStaggerAnimation(recentAnnouncements.length, 100);

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

  return (
    <Card className="gradient-card shadow-card hover:shadow-hover hover:shadow-glow transition-all duration-500 p-8 group animate-slide-up">
      <div className="flex items-center mb-8">
        <div className="relative">
          <div className="p-4 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300" 
               style={{ 
                 background: `linear-gradient(135deg, hsl(var(--announcement-accent) / 0.1) 0%, hsl(var(--announcement-accent) / 0.05) 100%)`,
                 border: `1px solid hsl(var(--announcement-accent) / 0.2)`
               }}>
            <Megaphone className="h-7 w-7" style={{ color: 'hsl(var(--announcement-accent))' }} />
          </div>
          <div className="absolute -inset-1 rounded-xl opacity-30 blur-sm" 
               style={{ background: `hsl(var(--announcement-accent))` }}></div>
        </div>
        <div className="ml-6">
          <h2 className="text-3xl font-bold text-card-foreground mb-4">Comunicados</h2>
          <p className="text-muted-foreground">Últimas informações importantes</p>
        </div>
      </div>
      
      <div className="space-y-4">
        {recentAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum comunicado encontrado</h3>
            <p className="text-muted-foreground">
              Não há comunicados recentes para exibir.
            </p>
          </div>
        ) : (
          recentAnnouncements.map((announcement, index) => (
          <div key={index} 
               className={`group/item p-5 rounded-xl gradient-secondary hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-border ${getAnimationClass(index)}`}>
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-start gap-3">
                <h3 className="font-bold text-secondary-foreground text-lg group-hover/item:text-foreground transition-colors line-clamp-2">
                  {announcement.title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-semibold px-2 py-1 shadow-sm"
                    style={{ 
                      backgroundColor: `${getPriorityColor(announcement.priority)}15`,
                      color: getPriorityColor(announcement.priority),
                      border: `1px solid ${getPriorityColor(announcement.priority)}40`
                    }}
                  >
                    {getPriorityIcon(announcement.priority)}
                  </Badge>
                </div>
              </div>
              <div className="text-muted-foreground leading-relaxed text-sm">
                <p className={expandedItems.has(index) ? "" : "line-clamp-3"}>
                  {announcement.content}
                </p>
                {announcement.content.length > 100 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(index)}
                    className="mt-2 h-auto p-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expandedItems.has(index) ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Ler menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Continue lendo
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground font-medium bg-muted/30 px-2 py-1 rounded-lg">
                  {announcement.date}
                </span>
              </div>
            </div>
          </div>
        ))
        )}
      </div>
    </Card>
  );
};

export default Announcements;