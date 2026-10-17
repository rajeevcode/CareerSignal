export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_flags: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          flag_type: string | null
          id: string
          severity: string | null
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          flag_type?: string | null
          id?: string
          severity?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          flag_type?: string | null
          id?: string
          severity?: string | null
          status?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string
          candidate_id: string
          cv_version_id: string | null
          follow_up_due_at: string | null
          id: string
          interview_probability: number | null
          job_id: string
          match_score: number | null
          next_action: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applied_at?: string
          candidate_id: string
          cv_version_id?: string | null
          follow_up_due_at?: string | null
          id?: string
          interview_probability?: number | null
          job_id: string
          match_score?: number | null
          next_action?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applied_at?: string
          candidate_id?: string
          cv_version_id?: string | null
          follow_up_due_at?: string | null
          id?: string
          interview_probability?: number | null
          job_id?: string
          match_score?: number | null
          next_action?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
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
      candidate_experience: {
        Row: {
          achievements: string[]
          candidate_id: string
          company: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          location: string | null
          skills_used: string[]
          sort_order: number
          start_date: string | null
          title: string
        }
        Insert: {
          achievements?: string[]
          candidate_id: string
          company: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          skills_used?: string[]
          sort_order?: number
          start_date?: string | null
          title: string
        }
        Update: {
          achievements?: string[]
          candidate_id?: string
          company?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          location?: string | null
          skills_used?: string[]
          sort_order?: number
          start_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_experience_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          career_goal: string | null
          career_outcome: string | null
          created_at: string
          current_title: string | null
          cv_feedback_json: Json | null
          cv_score: number | null
          cv_score_breakdown: Json | null
          embedding: string | null
          github_url: string | null
          id: string
          linkedin_url: string | null
          location: string | null
          notice_period: string | null
          onboarding_complete: boolean
          onboarding_step: number
          portfolio_url: string | null
          profile_summary: string | null
          relocation_preference: string | null
          remote_preference: Database["public"]["Enums"]["remote_preference"]
          salary_currency: string
          salary_expectation: number | null
          target_markets: string[]
          target_roles: string[]
          total_experience_years: number | null
          updated_at: string
          user_id: string
          visa_status: string | null
        }
        Insert: {
          career_goal?: string | null
          career_outcome?: string | null
          created_at?: string
          current_title?: string | null
          cv_feedback_json?: Json | null
          cv_score?: number | null
          cv_score_breakdown?: Json | null
          embedding?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          portfolio_url?: string | null
          profile_summary?: string | null
          relocation_preference?: string | null
          remote_preference?: Database["public"]["Enums"]["remote_preference"]
          salary_currency?: string
          salary_expectation?: number | null
          target_markets?: string[]
          target_roles?: string[]
          total_experience_years?: number | null
          updated_at?: string
          user_id: string
          visa_status?: string | null
        }
        Update: {
          career_goal?: string | null
          career_outcome?: string | null
          created_at?: string
          current_title?: string | null
          cv_feedback_json?: Json | null
          cv_score?: number | null
          cv_score_breakdown?: Json | null
          embedding?: string | null
          github_url?: string | null
          id?: string
          linkedin_url?: string | null
          location?: string | null
          notice_period?: string | null
          onboarding_complete?: boolean
          onboarding_step?: number
          portfolio_url?: string | null
          profile_summary?: string | null
          relocation_preference?: string | null
          remote_preference?: Database["public"]["Enums"]["remote_preference"]
          salary_currency?: string
          salary_expectation?: number | null
          target_markets?: string[]
          target_roles?: string[]
          total_experience_years?: number | null
          updated_at?: string
          user_id?: string
          visa_status?: string | null
        }
        Relationships: []
      }
      candidate_skills: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          skill_name: string
          source: Database["public"]["Enums"]["skill_source"]
          years_experience: number | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          skill_name: string
          source?: Database["public"]["Enums"]["skill_source"]
          years_experience?: number | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          skill_name?: string
          source?: Database["public"]["Enums"]["skill_source"]
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          candidate_id: string
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["coach_role"]
        }
        Insert: {
          candidate_id: string
          content: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coach_role"]
        }
        Update: {
          candidate_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["coach_role"]
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          name: string
          size: string | null
          trust_score: number | null
          verified: boolean
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          trust_score?: number | null
          verified?: boolean
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          trust_score?: number | null
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      cover_letters: {
        Row: {
          application_id: string | null
          candidate_id: string
          content: string
          created_at: string
          cv_version_id: string | null
          id: string
          job_id: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          content: string
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          content?: string
          created_at?: string
          cv_version_id?: string | null
          id?: string
          job_id?: string | null
          tone?: string | null
          updated_at?: string
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
            foreignKeyName: "cover_letters_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
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
      cv_uploads: {
        Row: {
          ats_score: number | null
          candidate_id: string
          file_name: string
          file_path: string
          id: string
          is_primary: boolean
          parsed_json: Json | null
          parsed_text: string | null
          uploaded_at: string
        }
        Insert: {
          ats_score?: number | null
          candidate_id: string
          file_name: string
          file_path: string
          id?: string
          is_primary?: boolean
          parsed_json?: Json | null
          parsed_text?: string | null
          uploaded_at?: string
        }
        Update: {
          ats_score?: number | null
          candidate_id?: string
          file_name?: string
          file_path?: string
          id?: string
          is_primary?: boolean
          parsed_json?: Json | null
          parsed_text?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_uploads_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_versions: {
        Row: {
          candidate_id: string
          content_json: Json
          created_at: string
          cv_score: number | null
          id: string
          is_primary: boolean
          name: string
          target_market: string | null
          target_role: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          content_json?: Json
          created_at?: string
          cv_score?: number | null
          id?: string
          is_primary?: boolean
          name: string
          target_market?: string | null
          target_role?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          content_json?: Json
          created_at?: string
          cv_score?: number | null
          id?: string
          is_primary?: boolean
          name?: string
          target_market?: string | null
          target_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_versions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_messages: {
        Row: {
          answer: string | null
          created_at: string
          feedback_json: Json | null
          id: string
          question: string
          score: number | null
          session_id: string
          turn_index: number
        }
        Insert: {
          answer?: string | null
          created_at?: string
          feedback_json?: Json | null
          id?: string
          question: string
          score?: number | null
          session_id: string
          turn_index: number
        }
        Update: {
          answer?: string | null
          created_at?: string
          feedback_json?: Json | null
          id?: string
          question?: string
          score?: number | null
          session_id?: string
          turn_index?: number
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
      interview_prep_sessions: {
        Row: {
          candidate_id: string
          company_summary: string | null
          created_at: string
          id: string
          job_id: string | null
          plan_30_90: string | null
          questions_json: Json | null
          readiness_score: number | null
        }
        Insert: {
          candidate_id: string
          company_summary?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          plan_30_90?: string | null
          questions_json?: Json | null
          readiness_score?: number | null
        }
        Update: {
          candidate_id?: string
          company_summary?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          plan_30_90?: string | null
          questions_json?: Json | null
          readiness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_prep_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_prep_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          application_id: string | null
          candidate_id: string
          company_name: string | null
          created_at: string
          difficulty: Database["public"]["Enums"]["interview_difficulty"]
          id: string
          job_id: string | null
          mode: Database["public"]["Enums"]["interview_mode"]
          overall_score: number | null
          role_title: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          application_id?: string | null
          candidate_id: string
          company_name?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["interview_difficulty"]
          id?: string
          job_id?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          overall_score?: number | null
          role_title: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string | null
          candidate_id?: string
          company_name?: string | null
          created_at?: string
          difficulty?: Database["public"]["Enums"]["interview_difficulty"]
          id?: string
          job_id?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          overall_score?: number | null
          role_title?: string
          summary?: string | null
          updated_at?: string
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
            foreignKeyName: "interview_sessions_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
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
      jd_analyses: {
        Row: {
          breakdown_json: Json | null
          candidate_id: string
          created_at: string
          gap_json: Json | null
          id: string
          interview_signal: number | null
          jd_match_score: number | null
          jd_text: string
          job_title: string | null
        }
        Insert: {
          breakdown_json?: Json | null
          candidate_id: string
          created_at?: string
          gap_json?: Json | null
          id?: string
          interview_signal?: number | null
          jd_match_score?: number | null
          jd_text: string
          job_title?: string | null
        }
        Update: {
          breakdown_json?: Json | null
          candidate_id?: string
          created_at?: string
          gap_json?: Json | null
          id?: string
          interview_signal?: number | null
          jd_match_score?: number | null
          jd_text?: string
          job_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jd_analyses_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_reports: {
        Row: {
          created_at: string
          id: string
          job_id: string
          reason: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["job_report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          reason: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["job_report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          reason?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["job_report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "job_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          applicant_count: number
          company_id: string
          created_at: string
          description: string
          embedding: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience_max: number | null
          experience_min: number | null
          external_id: string | null
          function_tag: string | null
          id: string
          jd_clarity: Database["public"]["Enums"]["jd_clarity"] | null
          location: string | null
          nice_to_have_skills: string[]
          posted_at: string
          recruiter_id: string | null
          remote_type: Database["public"]["Enums"]["remote_type"]
          required_skills: string[]
          salary_currency: string
          salary_disclosed: boolean
          salary_max: number | null
          salary_min: number | null
          scam_risk: Database["public"]["Enums"]["scam_risk"] | null
          source_url: string | null
          status: Database["public"]["Enums"]["job_status"]
          tech_stack: string[]
          title: string
          updated_at: string
          visa_sponsorship: boolean
        }
        Insert: {
          applicant_count?: number
          company_id: string
          created_at?: string
          description: string
          embedding?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_max?: number | null
          experience_min?: number | null
          external_id?: string | null
          function_tag?: string | null
          id?: string
          jd_clarity?: Database["public"]["Enums"]["jd_clarity"] | null
          location?: string | null
          nice_to_have_skills?: string[]
          posted_at?: string
          recruiter_id?: string | null
          remote_type?: Database["public"]["Enums"]["remote_type"]
          required_skills?: string[]
          salary_currency?: string
          salary_disclosed?: boolean
          salary_max?: number | null
          salary_min?: number | null
          scam_risk?: Database["public"]["Enums"]["scam_risk"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tech_stack?: string[]
          title: string
          updated_at?: string
          visa_sponsorship?: boolean
        }
        Update: {
          applicant_count?: number
          company_id?: string
          created_at?: string
          description?: string
          embedding?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_max?: number | null
          experience_min?: number | null
          external_id?: string | null
          function_tag?: string | null
          id?: string
          jd_clarity?: Database["public"]["Enums"]["jd_clarity"] | null
          location?: string | null
          nice_to_have_skills?: string[]
          posted_at?: string
          recruiter_id?: string | null
          remote_type?: Database["public"]["Enums"]["remote_type"]
          required_skills?: string[]
          salary_currency?: string
          salary_disclosed?: boolean
          salary_max?: number | null
          salary_min?: number | null
          scam_risk?: Database["public"]["Enums"]["scam_risk"] | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          tech_stack?: string[]
          title?: string
          updated_at?: string
          visa_sponsorship?: boolean
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
      match_scores: {
        Row: {
          candidate_id: string
          competition_score: number
          computed_at: string
          cv_score: number
          domain_score: number
          experience_score: number
          explanation_json: Json | null
          final_score: number
          freshness_score: number
          id: string
          interview_signal: number | null
          jd_match_score: number | null
          job_id: string
          location_score: number
          role_similarity_score: number
          seniority_score: number
          skill_score: number
        }
        Insert: {
          candidate_id: string
          competition_score?: number
          computed_at?: string
          cv_score?: number
          domain_score?: number
          experience_score?: number
          explanation_json?: Json | null
          final_score?: number
          freshness_score?: number
          id?: string
          interview_signal?: number | null
          jd_match_score?: number | null
          job_id: string
          location_score?: number
          role_similarity_score?: number
          seniority_score?: number
          skill_score?: number
        }
        Update: {
          candidate_id?: string
          competition_score?: number
          computed_at?: string
          cv_score?: number
          domain_score?: number
          experience_score?: number
          explanation_json?: Json | null
          final_score?: number
          freshness_score?: number
          id?: string
          interview_signal?: number | null
          jd_match_score?: number | null
          job_id?: string
          location_score?: number
          role_similarity_score?: number
          seniority_score?: number
          skill_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_scores_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_scores_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          id: string
          provider: string | null
          provider_payment_id: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_payment_id?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          id?: string
          provider?: string | null
          provider_payment_id?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      recruiter_profiles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          title: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          title?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "recruiter_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_jobs: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          job_id: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          job_id: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      star_stories: {
        Row: {
          action: string | null
          candidate_id: string
          created_at: string
          id: string
          result: string | null
          situation: string | null
          task: string | null
          title: string
        }
        Insert: {
          action?: string | null
          candidate_id: string
          created_at?: string
          id?: string
          result?: string | null
          situation?: string | null
          task?: string | null
          title: string
        }
        Update: {
          action?: string | null
          candidate_id?: string
          created_at?: string
          id?: string
          result?: string | null
          situation?: string | null
          task?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "star_stories_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["plan_type"]
          provider: string | null
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["plan_type"]
          provider?: string | null
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_limits: {
        Row: {
          created_at: string
          current_month: string | null
          cv_upload_count: number
          id: string
          jd_match_count_monthly: number
          saved_jobs_count: number
          tracked_applications_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_month?: string | null
          cv_upload_count?: number
          id?: string
          jd_match_count_monthly?: number
          saved_jobs_count?: number
          tracked_applications_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_month?: string | null
          cv_upload_count?: number
          id?: string
          jd_match_count_monthly?: number
          saved_jobs_count?: number
          tracked_applications_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_candidate_id: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      application_status:
        | "saved"
        | "applied"
        | "viewed"
        | "recruiter_viewed"
        | "shortlisted"
        | "hr_screen"
        | "technical_round"
        | "case_study"
        | "final_round"
        | "interview"
        | "offer"
        | "rejected"
        | "ghosted"
        | "follow_up_needed"
      coach_role: "user" | "assistant"
      employment_type: "full_time" | "contract" | "internship" | "part_time"
      interview_difficulty: "easy" | "medium" | "hard"
      interview_mode: "behavioral" | "technical" | "company"
      jd_clarity: "high" | "medium" | "low"
      job_report_status: "open" | "reviewed" | "dismissed"
      job_status: "draft" | "published" | "closed"
      plan_type: "free" | "pro"
      remote_preference: "remote" | "hybrid" | "onsite" | "any"
      remote_type: "remote" | "hybrid" | "onsite"
      scam_risk: "low" | "medium" | "high"
      skill_level: "beginner" | "intermediate" | "advanced" | "expert"
      skill_source: "cv" | "manual" | "linkedin"
      subscription_status:
        | "inactive"
        | "active"
        | "cancelled"
        | "past_due"
        | "trialing"
      user_role: "candidate" | "recruiter" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      iceberg_namespaces: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
        ]
      }
      iceberg_tables: {
        Row: {
          bucket_name: string
          catalog_id: string
          created_at: string
          id: string
          location: string
          name: string
          namespace_id: string
          remote_table_id: string | null
          shard_id: string | null
          shard_key: string | null
          updated_at: string
        }
        Insert: {
          bucket_name: string
          catalog_id: string
          created_at?: string
          id?: string
          location: string
          name: string
          namespace_id: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Update: {
          bucket_name?: string
          catalog_id?: string
          created_at?: string
          id?: string
          location?: string
          name?: string
          namespace_id?: string
          remote_table_id?: string | null
          shard_id?: string | null
          shard_key?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "buckets_analytics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey"
            columns: ["namespace_id"]
            isOneToOne: false
            referencedRelation: "iceberg_namespaces"
            referencedColumns: ["id"]
          },
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          metadata: Json | null
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          metadata?: Json | null
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] }
        Returns: boolean
      }
      allow_only_operation: {
        Args: { expected_operation: string }
        Returns: boolean
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string }
        Returns: string
      }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_by_timestamp: {
        Args: {
          p_bucket_id: string
          p_level: number
          p_limit: number
          p_prefix: string
          p_sort_column: string
          p_sort_column_after: string
          p_sort_order: string
          p_start_after: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: [
        "saved",
        "applied",
        "viewed",
        "recruiter_viewed",
        "shortlisted",
        "hr_screen",
        "technical_round",
        "case_study",
        "final_round",
        "interview",
        "offer",
        "rejected",
        "ghosted",
        "follow_up_needed",
      ],
      coach_role: ["user", "assistant"],
      employment_type: ["full_time", "contract", "internship", "part_time"],
      interview_difficulty: ["easy", "medium", "hard"],
      interview_mode: ["behavioral", "technical", "company"],
      jd_clarity: ["high", "medium", "low"],
      job_report_status: ["open", "reviewed", "dismissed"],
      job_status: ["draft", "published", "closed"],
      plan_type: ["free", "pro"],
      remote_preference: ["remote", "hybrid", "onsite", "any"],
      remote_type: ["remote", "hybrid", "onsite"],
      scam_risk: ["low", "medium", "high"],
      skill_level: ["beginner", "intermediate", "advanced", "expert"],
      skill_source: ["cv", "manual", "linkedin"],
      subscription_status: [
        "inactive",
        "active",
        "cancelled",
        "past_due",
        "trialing",
      ],
      user_role: ["candidate", "recruiter", "admin"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const

