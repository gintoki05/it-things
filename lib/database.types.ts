export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      kas_dues: {
        Row: {
          amount: number
          confirmed_by: string | null
          created_at: string
          id: string
          is_paid: boolean
          month_period: string
          paid_at: string | null
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          amount?: number
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          month_period: string
          paid_at?: string | null
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          amount?: number
          confirmed_by?: string | null
          created_at?: string
          id?: string
          is_paid?: boolean
          month_period?: string
          paid_at?: string | null
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      kas_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by_id: string
          created_by_name: string
          description: string
          id: string
          receipt_url: string | null
          type: string
          verified_by_treasurer: boolean
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by_id: string
          created_by_name: string
          description: string
          id?: string
          receipt_url?: string | null
          type: string
          verified_by_treasurer?: boolean
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by_id?: string
          created_by_name?: string
          description?: string
          id?: string
          receipt_url?: string | null
          type?: string
          verified_by_treasurer?: boolean
        }
        Relationships: []
      }
      vote_groups: {
        Row: {
          created_at: string
          created_by_avatar: string | null
          created_by_id: string
          created_by_name: string
          description: string | null
          emoji: string | null
          expires_at: string
          id: string
          is_closed: boolean
          title: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          created_by_avatar?: string | null
          created_by_id: string
          created_by_name: string
          description?: string | null
          emoji?: string | null
          expires_at?: string
          id?: string
          is_closed?: boolean
          title: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          created_by_avatar?: string | null
          created_by_id?: string
          created_by_name?: string
          description?: string | null
          emoji?: string | null
          expires_at?: string
          id?: string
          is_closed?: boolean
          title?: string
          vote_type?: string
        }
        Relationships: []
      }
      vote_options: {
        Row: {
          created_at: string
          emoji: string | null
          group_id: string
          id: string
          name: string
          proposed_by_avatar: string | null
          proposed_by_id: string
          proposed_by_name: string
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          group_id: string
          id?: string
          name: string
          proposed_by_avatar?: string | null
          proposed_by_id: string
          proposed_by_name: string
        }
        Update: {
          created_at?: string
          emoji?: string | null
          group_id?: string
          id?: string
          name?: string
          proposed_by_avatar?: string | null
          proposed_by_id?: string
          proposed_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_options_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vote_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_records: {
        Row: {
          created_at: string
          group_id: string
          id: string
          option_id: string
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          option_id: string
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          option_id?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_records_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vote_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_records_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "vote_options"
            referencedColumns: ["id"]
          },
        ]
      }

      split_bill_participants: {
        Row: {
          amount_due: number
          bill_id: string
          created_at: string
          id: string
          is_confirmed: boolean
          is_paid: boolean
          items: Json | null
          paid_at: string | null
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          amount_due?: number
          bill_id: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          is_paid?: boolean
          items?: Json | null
          paid_at?: string | null
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          amount_due?: number
          bill_id?: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          is_paid?: boolean
          items?: Json | null
          paid_at?: string | null
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_bill_participants_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "split_bills"
            referencedColumns: ["id"]
          },
        ]
      }
      split_bills: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string | null
          created_at: string
          created_by_avatar: string | null
          created_by_id: string
          created_by_name: string
          delivery_fee: number
          discount: number
          id: string
          is_settled: boolean
          mode: string
          qris_url: string | null
          subtotal: number
          tax: number
          title: string
          total_amount: number
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          created_by_avatar?: string | null
          created_by_id: string
          created_by_name: string
          delivery_fee?: number
          discount?: number
          id?: string
          is_settled?: boolean
          mode?: string
          qris_url?: string | null
          subtotal?: number
          tax?: number
          title: string
          total_amount?: number
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          created_by_avatar?: string | null
          created_by_id?: string
          created_by_name?: string
          delivery_fee?: number
          discount?: number
          id?: string
          is_settled?: boolean
          mode?: string
          qris_url?: string | null
          subtotal?: number
          tax?: number
          title?: string
          total_amount?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          role: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          role?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      wheel_places: {
        Row: {
          budget_level: string | null
          category: string | null
          created_at: string
          id: string
          maps_url: string | null
          name: string
          notes: string | null
          proposed_by_id: string | null
          proposed_by_name: string | null
          service_type: string | null
        }
        Insert: {
          budget_level?: string | null
          category?: string | null
          created_at?: string
          id?: string
          maps_url?: string | null
          name: string
          notes?: string | null
          proposed_by_id?: string | null
          proposed_by_name?: string | null
          service_type?: string | null
        }
        Update: {
          budget_level?: string | null
          category?: string | null
          created_at?: string
          id?: string
          maps_url?: string | null
          name?: string
          notes?: string | null
          proposed_by_id?: string | null
          proposed_by_name?: string | null
          service_type?: string | null
        }
        Relationships: []
      }
      wheel_spins: {
        Row: {
          category: string | null
          created_at: string
          id: string
          place_id: string | null
          place_name: string
          spun_by_id: string | null
          spun_by_name: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          place_id?: string | null
          place_name: string
          spun_by_id?: string | null
          spun_by_name?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          place_id?: string | null
          place_name?: string
          spun_by_id?: string | null
          spun_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "wheel_places"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
