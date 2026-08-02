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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ad_banners: {
        Row: {
          created_at: string
          display_order: number | null
          ends_at: string | null
          html_code: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          name: string
          position: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          ends_at?: string | null
          html_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name: string
          position: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          ends_at?: string | null
          html_code?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          name?: string
          position?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      breaking_news: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          text: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          text: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          text?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          posts_count: number | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          posts_count?: number | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          posts_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      category_settings: {
        Row: {
          category_id: string | null
          created_at: string
          display_order: number | null
          display_style: string | null
          home_order: number | null
          id: string
          posts_per_page: number | null
          show_in_home: boolean | null
          show_in_menu: boolean | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          display_order?: number | null
          display_style?: string | null
          home_order?: number | null
          id?: string
          posts_per_page?: number | null
          show_in_home?: boolean | null
          show_in_menu?: boolean | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          display_order?: number | null
          display_style?: string | null
          home_order?: number | null
          id?: string
          posts_per_page?: number | null
          show_in_home?: boolean | null
          show_in_menu?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_settings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string | null
          created_at: string
          file_size: number | null
          file_type: string | null
          filename: string | null
          id: string
          url: string
          user_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string | null
          id?: string
          url: string
          user_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_size?: number | null
          file_type?: string | null
          filename?: string | null
          id?: string
          url?: string
          user_id?: string | null
        }
        Relationships: []
      }
      migrations_log: {
        Row: {
          created_at: string
          description: string | null
          id: string
          migration_name: string
          sql_summary: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          migration_name: string
          sql_summary?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          migration_name?: string
          sql_summary?: string | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          id: string
          notify_on_breaking: boolean | null
          notify_on_new_post: boolean | null
          updated_at: string
          vapid_private_key: string | null
          vapid_public_key: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          notify_on_breaking?: boolean | null
          notify_on_new_post?: boolean | null
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          id?: string
          notify_on_breaking?: boolean | null
          notify_on_new_post?: boolean | null
          updated_at?: string
          vapid_private_key?: string | null
          vapid_public_key?: string | null
        }
        Relationships: []
      }
      post_media: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number | null
          id: string
          media_type: string
          media_url: string
          post_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          media_type: string
          media_url: string
          post_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_revisions: {
        Row: {
          content: string | null
          created_at: string
          id: string
          post_id: string
          title: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          post_id: string
          title?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          post_id?: string
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          id: string
          post_id: string
          tag_id: string
        }
        Insert: {
          id?: string
          post_id: string
          tag_id: string
        }
        Update: {
          id?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          ip_address: string | null
          post_id: string
          user_agent: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          post_id: string
          user_agent?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          post_id?: string
          user_agent?: string | null
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string | null
          badge: string | null
          category_id: string | null
          content: string | null
          created_at: string
          excerpt: string | null
          external_video_url: string | null
          featured_image: string | null
          gallery_images: string[] | null
          hide_after: string | null
          id: string
          is_breaking: boolean | null
          is_featured: boolean | null
          is_pinned: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          pinned_order: number | null
          published_at: string | null
          reading_time: number | null
          scheduled_at: string | null
          slug: string
          source_type: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          thumbnail_image: string | null
          title: string
          updated_at: string
          user_id: string | null
          views_count: number | null
          word_count: number | null
        }
        Insert: {
          author_id?: string | null
          badge?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          external_video_url?: string | null
          featured_image?: string | null
          gallery_images?: string[] | null
          hide_after?: string | null
          id?: string
          is_breaking?: boolean | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          pinned_order?: number | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug: string
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          thumbnail_image?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
          views_count?: number | null
          word_count?: number | null
        }
        Update: {
          author_id?: string | null
          badge?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string
          excerpt?: string | null
          external_video_url?: string | null
          featured_image?: string | null
          gallery_images?: string[] | null
          hide_after?: string | null
          id?: string
          is_breaking?: boolean | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          pinned_order?: number | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug?: string
          source_type?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          thumbnail_image?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
          views_count?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      posts_backup_before_delete: {
        Row: {
          author_id: string | null
          badge: string | null
          category_id: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          external_video_url: string | null
          featured_image: string | null
          hide_after: string | null
          id: string | null
          is_breaking: boolean | null
          is_featured: boolean | null
          is_pinned: boolean | null
          meta_description: string | null
          meta_keywords: string | null
          meta_title: string | null
          pinned_order: number | null
          published_at: string | null
          reading_time: number | null
          scheduled_at: string | null
          slug: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["post_status"] | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          views_count: number | null
          word_count: number | null
        }
        Insert: {
          author_id?: string | null
          badge?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          external_video_url?: string | null
          featured_image?: string | null
          hide_after?: string | null
          id?: string | null
          is_breaking?: boolean | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          pinned_order?: number | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          word_count?: number | null
        }
        Update: {
          author_id?: string | null
          badge?: string | null
          category_id?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          external_video_url?: string | null
          featured_image?: string | null
          hide_after?: string | null
          id?: string | null
          is_breaking?: boolean | null
          is_featured?: boolean | null
          is_pinned?: boolean | null
          meta_description?: string | null
          meta_keywords?: string | null
          meta_title?: string | null
          pinned_order?: number | null
          published_at?: string | null
          reading_time?: number | null
          scheduled_at?: string | null
          slug?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["post_status"] | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          views_count?: number | null
          word_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          usage_count?: number | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      cleanup_system_logs: { Args: never; Returns: Json }
      generate_slug: { Args: { title: string }; Returns: string }
      get_bot_existing_source_urls: {
        Args: never
        Returns: {
          source_url: string
        }[]
      }
      get_bot_post_status: {
        Args: { _post_id: string }
        Returns: {
          created_at: string
          found: boolean
          id: string
          slug: string
          status: string
        }[]
      }
      get_system_logs_counts: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_views: { Args: { post_id: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_editor: { Args: { _user_id: string }; Returns: boolean }
      is_editor: { Args: { _user_id?: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor" | "author"
      post_status:
        | "draft"
        | "scheduled"
        | "published"
        | "hidden"
        | "under_review"
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
      app_role: ["admin", "editor", "author"],
      post_status: [
        "draft",
        "scheduled",
        "published",
        "hidden",
        "under_review",
      ],
    },
  },
} as const
