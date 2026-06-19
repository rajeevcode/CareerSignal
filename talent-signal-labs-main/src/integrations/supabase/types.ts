export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          created_at: string
          cv_version_id: string | null
          id: string
          job_id: string | null
          match_score: number | null
          next_action_at: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          match_score?: number | null
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          match_score?: number | null
          next_action_at?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_preferences: {
        Row: {
          created_at: string
          goal: string | null
          markets: string[] | null
          min_salary: number | null
          needs_visa: boolean | null
          notice_period: string | null
          onboarding_completed: boolean
          salary_currency: string | null
          updated_at: string
          user_id: string
          work_modes: string[] | null
        }
        Insert: {
          created_at?: string
          goal?: string | null
          markets?: string[] | null
          min_salary?: number | null
          needs_visa?: boolean | null
          notice_period?: string | null
          onboarding_completed?: boolean
          salary_currency?: string | null
          updated_at?: string
          user_id: string
          work_modes?: string[] | null
        }
        Update: {
          created_at?: string
          goal?: string | null
          markets?: string[] | null
          min_salary?: number | null
          needs_visa?: boolean | null
          notice_period?: string | null
          onboarding_completed?: boolean
          salary_currency?: string | null
          updated_at?: string
          user_id?: string
          work_modes?: string[] | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          hq_location: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          size: string | null
          slug: string
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          slug: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          hq_location?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          slug?: string
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          application_id: string | null
          content: string
          created_at: string
          cv_version_id: string | null
          id: string
          job_id: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          content: string
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          content?: string
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_analyses: {
        Row: {
          bullet_feedback: Json
          created_at: string
          cv_version_id: string
          id: string
          match_score: number | null
          matched_keywords: Json
          missing_keywords: Json
          scores: Json
          suggested_bullets: Json
          summary: string | null
          target_jd_text: string | null
          target_job_id: string | null
          user_id: string
        }
        Insert: {
          bullet_feedback?: Json
          created_at?: string
          cv_version_id: string
          id?: string
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          scores?: Json
          suggested_bullets?: Json
          summary?: string | null
          target_jd_text?: string | null
          target_job_id?: string | null
          user_id: string
        }
        Update: {
          bullet_feedback?: Json
          created_at?: string
          cv_version_id?: string
          id?: string
          match_score?: number | null
          matched_keywords?: Json
          missing_keywords?: Json
          scores?: Json
          suggested_bullets?: Json
          summary?: string | null
          target_jd_text?: string | null
          target_job_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_analyses_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cv_analyses_target_job_id_fkey"
            columns: ["target_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_scores: {
        Row: {
          created_at: string
          cv_version_id: string
          id: string
          improvements: Json
          overall: number
          strengths: Json
          sub_scores: Json
          summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          cv_version_id: string
          id?: string
          improvements?: Json
          overall: number
          strengths?: Json
          sub_scores?: Json
          summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          cv_version_id?: string
          id?: string
          improvements?: Json
          overall?: number
          strengths?: Json
          sub_scores?: Json
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_scores_cv_version_id_fkey"
            columns: ["cv_version_id"]
            isOneToOne: false
            referencedRelation: "cv_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          created_at: string
          cv_id: string
          file_name: string | null
          id: string
          note: string | null
          parsed: Json | null
          raw_text: string | null
          source: string
          storage_path: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          cv_id: string
          file_name?: string | null
          id?: string
          note?: string | null
          parsed?: Json | null
          raw_text?: string | null
          source?: string
          storage_path?: string | null
          user_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          cv_id?: string
          file_name?: string | null
          id?: string
          note?: string | null
          parsed?: Json | null
          raw_text?: string | null
          source?: string
          storage_path?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_cv_id_fkey"
            columns: ["cv_id"]
            isOneToOne: false
            referencedRelation: "cvs"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_messages: {
        Row: {
          answer: string | null
          created_at: string
          feedback: Json | null
          id: string
          question: string
          score: number | null
          session_id: string
          turn_index: number
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          question: string
          score?: number | null
          session_id: string
          turn_index: number
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          feedback?: Json | null
          id?: string
          question?: string
          score?: number | null
          session_id?: string
          turn_index?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          application_id: string | null
          company_name: string | null
          created_at: string
          difficulty: string
          id: string
          job_id: string | null
          mode: string
          overall_score: number | null
          role_title: string
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          company_name?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          job_id?: string | null
          mode?: string
          overall_score?: number | null
          role_title: string
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          company_name?: string | null
          created_at?: string
          difficulty?: string
          id?: string
          job_id?: string | null
          mode?: string
          overall_score?: number | null
          role_title?: string
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          active: boolean
          company_id: string | null
          created_at: string
          created_by: string | null
          description: string
          employment_type: string | null
          external_url: string | null
          id: string
          location: string | null
          posted_at: string | null
          remote_policy: string | null
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          seniority: string | null
          skills: string[] | null
          source: string | null
          title: string
          updated_at: string
          visa_sponsorship: boolean | null
        }
        Insert: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          employment_type?: string | null
          external_url?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          skills?: string[] | null
          source?: string | null
          title: string
          updated_at?: string
          visa_sponsorship?: boolean | null
        }
        Update: {
          active?: boolean
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          employment_type?: string | null
          external_url?: string | null
          id?: string
          location?: string | null
          posted_at?: string | null
          remote_policy?: string | null
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          seniority?: string | null
          skills?: string[] | null
          source?: string | null
          title?: string
          updated_at?: string
          visa_sponsorship?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          current_period_end: string | null
          full_name: string | null
          headline: string | null
          id: string
          plan_type: string
          subscription_customer_id: string | null
          subscription_id: string | null
          subscription_provider: string | null
          subscription_status: string
          target_markets: string[] | null
          target_role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          full_name?: string | null
          headline?: string | null
          id: string
          plan_type?: string
          subscription_customer_id?: string | null
          subscription_id?: string | null
          subscription_provider?: string | null
          subscription_status?: string
          target_markets?: string[] | null
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          current_period_end?: string | null
          full_name?: string | null
          headline?: string | null
          id?: string
          plan_type?: string
          subscription_customer_id?: string | null
          subscription_id?: string | null
          subscription_provider?: string | null
          subscription_status?: string
          target_markets?: string[] | null
          target_role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          job_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          job_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      site_policies: {
        Row: {
          body: string
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      target_roles: {
        Row: {
          created_at: string
          fit_score: number | null
          id: string
          is_primary: boolean
          seniority: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fit_score?: number | null
          id?: string
          is_primary?: boolean
          seniority?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          fit_score?: number | null
          id?: string
          is_primary?: boolean
          seniority?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          created_at: string
          current_month: string
          cv_upload_count: number
          jd_match_count_monthly: number
          saved_jobs_count: number
          tracked_applications_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_month?: string
          cv_upload_count?: number
          jd_match_count_monthly?: number
          saved_jobs_count?: number
          tracked_applications_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_month?: string
          cv_upload_count?: number
          jd_match_count_monthly?: number
          saved_jobs_count?: number
          tracked_applications_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "candidate" | "recruiter" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["candidate", "recruiter", "admin"],
    },
  },
} as const
