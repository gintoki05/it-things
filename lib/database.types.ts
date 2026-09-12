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
      paint_war_rooms: {
        Row: {
          id: string
          status: string
          current_drawer_id: string | null
          current_drawer_name: string | null
          current_drawer_avatar: string | null
          current_word: string | null
          word_hint: string | null
          category: string | null
          round_number: number
          total_rounds: number
          round_start_time: string | null
          round_duration_sec: number
          canvas_snapshot: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          status?: string
          current_drawer_id?: string | null
          current_drawer_name?: string | null
          current_drawer_avatar?: string | null
          current_word?: string | null
          word_hint?: string | null
          category?: string | null
          round_number?: number
          total_rounds?: number
          round_start_time?: string | null
          round_duration_sec?: number
          canvas_snapshot?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          status?: string
          current_drawer_id?: string | null
          current_drawer_name?: string | null
          current_drawer_avatar?: string | null
          current_word?: string | null
          word_hint?: string | null
          category?: string | null
          round_number?: number
          total_rounds?: number
          round_start_time?: string | null
          round_duration_sec?: number
          canvas_snapshot?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      paint_war_players: {
        Row: {
          id: string
          room_id: string
          user_id: string
          user_name: string
          user_avatar: string | null
          score: number
          has_guessed: boolean
          is_drawing: boolean
          is_online: boolean
          last_seen: string
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          user_name: string
          user_avatar?: string | null
          score?: number
          has_guessed?: boolean
          is_drawing?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          user_name?: string
          user_avatar?: string | null
          score?: number
          has_guessed?: boolean
          is_drawing?: boolean
          is_online?: boolean
          last_seen?: string
          created_at?: string
        }
        Relationships: []
      }
      paint_war_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          user_name: string
          user_avatar: string | null
          message: string
          is_system: boolean
          is_correct_guess: boolean
          points_awarded: number
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          user_name: string
          user_avatar?: string | null
          message: string
          is_system?: boolean
          is_correct_guess?: boolean
          points_awarded?: number
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          user_name?: string
          user_avatar?: string | null
          message?: string
          is_system?: boolean
          is_correct_guess?: boolean
          points_awarded?: number
          created_at?: string
        }
        Relationships: []
      }
      fridge_items: {
        Row: {
          category: string
          created_at: string
          created_by_id: string
          expired_at: string | null
          id: string
          name: string
          notes: string | null
          owner_avatar: string | null
          owner_id: string
          owner_name: string
          slot: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by_id: string
          expired_at?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_avatar?: string | null
          owner_id: string
          owner_name: string
          slot?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by_id?: string
          expired_at?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_avatar?: string | null
          owner_id?: string
          owner_name?: string
          slot?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean
          is_edited: boolean
          mentions: string[] | null
          message: string
          user_avatar: string | null
          user_id: string
          user_name: string
          user_role: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          mentions?: string[] | null
          message: string
          user_avatar?: string | null
          user_id: string
          user_name: string
          user_role?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean
          is_edited?: boolean
          mentions?: string[] | null
          message?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
          user_role?: string | null
        }
        Relationships: []
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      desktop_memos: {
        Row: {
          content: string
          created_at: string
          id: string
          title: string
          updated_at: string
          updated_by_avatar: string | null
          updated_by_id: string
          updated_by_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by_avatar?: string | null
          updated_by_id: string
          updated_by_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          updated_by_avatar?: string | null
          updated_by_id?: string
          updated_by_name?: string
        }
        Relationships: []
      }
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
      lapak_items: {
        Row: {
          badge: string | null
          category: string
          contact_link: string | null
          contact_name: string
          contact_wa: string | null
          created_at: string
          created_by_avatar: string | null
          created_by_id: string
          created_by_name: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          price_range: string | null
          tagline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          category?: string
          contact_link?: string | null
          contact_name: string
          contact_wa?: string | null
          created_at?: string
          created_by_avatar?: string | null
          created_by_id: string
          created_by_name: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_range?: string | null
          tagline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          category?: string
          contact_link?: string | null
          contact_name?: string
          contact_wa?: string | null
          created_at?: string
          created_by_avatar?: string | null
          created_by_id?: string
          created_by_name?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          price_range?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      module_pics: {
        Row: {
          assigned_by_id: string | null
          assigned_by_name: string | null
          id: string
          module: string
          updated_at: string
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          assigned_by_id?: string | null
          assigned_by_name?: string | null
          id?: string
          module: string
          updated_at?: string
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          assigned_by_id?: string | null
          assigned_by_name?: string | null
          id?: string
          module?: string
          updated_at?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      pantry_items: {
        Row: {
          category: string | null
          created_at: string
          created_by_id: string
          emoji: string | null
          id: string
          is_active: boolean
          monthly_quota: number
          name: string
          stock_qty: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by_id: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          monthly_quota?: number
          name: string
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by_id?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          monthly_quota?: number
          name?: string
          stock_qty?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pantry_logs: {
        Row: {
          created_at: string
          id: string
          item_id: string
          logged_by_id: string
          logged_by_name: string
          notes: string | null
          period_month: string
          quantity: number
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          logged_by_id: string
          logged_by_name: string
          notes?: string | null
          period_month: string
          quantity?: number
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          logged_by_id?: string
          logged_by_name?: string
          notes?: string | null
          period_month?: string
          quantity?: number
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_logs_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pantry_restocks: {
        Row: {
          created_at: string
          id: string
          item_id: string
          notes: string | null
          quantity: number
          restocked_by_id: string
          restocked_by_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          restocked_by_id: string
          restocked_by_name: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          restocked_by_id?: string
          restocked_by_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pantry_restocks_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "pantry_items"
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
      vote_comments: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          user_avatar: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          user_avatar?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          user_avatar?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_comments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "vote_groups"
            referencedColumns: ["id"]
          },
        ]
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
      is_admin: { Args: never; Returns: boolean }
      is_kas_pic: { Args: never; Returns: boolean }
      is_module_pic: { Args: { p_module: string }; Returns: boolean }
      is_pantry_pic: { Args: never; Returns: boolean }
      is_treasurer: { Args: never; Returns: boolean }
      sync_user_profile_name: {
        Args: { new_avatar?: string; new_name: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

