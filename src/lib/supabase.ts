import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jsqyskuogcnmfmfntkwk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzcXlza3VvZ2NubWZtZm50a3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyMTY0MDIsImV4cCI6MjA3Mzc5MjQwMn0.vKIIsDot57cEY9hR-CS0s_nftEH5H4JtnYkXiKAVc48';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Tipos para o banco de dados
export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string;
          name: string;
          extension: string;
          email: string;
          department: string;
          lunch_time: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          extension: string;
          email: string;
          department: string;
          lunch_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          extension?: string;
          email?: string;
          department?: string;
          lunch_time?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      departments: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: 'alta' | 'média' | 'baixa';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          priority: 'alta' | 'média' | 'baixa';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          priority?: 'alta' | 'média' | 'baixa';
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
