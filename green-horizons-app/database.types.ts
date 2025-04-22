export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          details: Json | null
          id: string
          profile_id: string
          timestamp: string | null
        }
        Insert: {
          action: string
          details?: Json | null
          id?: string
          profile_id: string
          timestamp?: string | null
        }
        Update: {
          action?: string
          details?: Json | null
          id?: string
          profile_id?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bag_size_categories: {
        Row: {
          created_at: string | null
          id: string
          is_sold: boolean
          name: string
          price: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_sold?: boolean
          name: string
          price?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_sold?: boolean
          name?: string
          price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bags: {
        Row: {
          created_at: string | null
          current_status: Database["public"]["Enums"]["bag_status"] | null
          employee_id: string | null
          harvest_room_id: string | null
          id: string
          qr_code: string
          size_category_id: string
          strain_id: string | null
          tenant_id: string
          updated_at: string | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["bag_status"] | null
          employee_id?: string | null
          harvest_room_id?: string | null
          id?: string
          qr_code: string
          size_category_id: string
          strain_id?: string | null
          tenant_id: string
          updated_at?: string | null
          weight: number
        }
        Update: {
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["bag_status"] | null
          employee_id?: string | null
          harvest_room_id?: string | null
          id?: string
          qr_code?: string
          size_category_id?: string
          strain_id?: string | null
          tenant_id?: string
          updated_at?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "bags_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bags_harvest_room_id_fkey"
            columns: ["harvest_room_id"]
            isOneToOne: false
            referencedRelation: "harvest_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bags_size_category_id_fkey"
            columns: ["size_category_id"]
            isOneToOne: false
            referencedRelation: "bag_size_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bags_strain_id_fkey"
            columns: ["strain_id"]
            isOneToOne: false
            referencedRelation: "strains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          tenant_id: string
          transaction_date: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          tenant_id: string
          transaction_date?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          tenant_id?: string
          transaction_date?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transactions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          business_name: string
          created_at: string | null
          drivers_license_url: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_name: string
          created_at?: string | null
          drivers_license_url: string
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          license_number: string
          phone?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          created_at?: string | null
          drivers_license_url?: string
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          license_number?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_log: {
        Row: {
          created_at: string | null
          log_date: string
          total_revenue: number | null
          total_sales: number | null
        }
        Insert: {
          created_at?: string | null
          log_date: string
          total_revenue?: number | null
          total_sales?: number | null
        }
        Update: {
          created_at?: string | null
          log_date?: string
          total_revenue?: number | null
          total_sales?: number | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string | null
          id: string
          phone: string | null
          profile_id: string
          role_id: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone?: string | null
          profile_id: string
          role_id?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string | null
          profile_id?: string
          role_id?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_tenant_fk"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      executives: {
        Row: {
          created_at: string | null
          id: string
          phone: string | null
          position: string
          profile_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          phone?: string | null
          position: string
          profile_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          phone?: string | null
          position?: string
          profile_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executives_position_fkey"
            columns: ["position"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executives_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      harvest_rooms: {
        Row: {
          capacity: number | null
          created_at: string | null
          id: string
          location: string | null
          name: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          name: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          id?: string
          location?: string | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      returns: {
        Row: {
          cash_transaction_id: string | null
          created_at: string | null
          id: string
          reason: string | null
          return_date: string | null
          sale_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          cash_transaction_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          return_date?: string | null
          sale_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cash_transaction_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string | null
          return_date?: string | null
          sale_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      role_requests: {
        Row: {
          created_at: string | null
          desired_role_id: string
          id: string
          profile_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          desired_role_id: string
          id?: string
          profile_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          desired_role_id?: string
          id?: string
          profile_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_requests_desired_role_id_fkey"
            columns: ["desired_role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          description: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safe: {
        Row: {
          current_balance: number
          id: string
          last_updated: string | null
        }
        Insert: {
          current_balance?: number
          id?: string
          last_updated?: string | null
        }
        Update: {
          current_balance?: number
          id?: string
          last_updated?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          bag_id: string | null
          created_at: string | null
          id: string
          price: number
          sale_id: string | null
        }
        Insert: {
          bag_id?: string | null
          created_at?: string | null
          id?: string
          price: number
          sale_id?: string | null
        }
        Update: {
          bag_id?: string | null
          created_at?: string | null
          id?: string
          price?: number
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_bag_id_fkey"
            columns: ["bag_id"]
            isOneToOne: true
            referencedRelation: "bags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_notifications: {
        Row: {
          id: string
          is_read: boolean | null
          message: string
          notified_at: string | null
          sale_id: string
        }
        Insert: {
          id?: string
          is_read?: boolean | null
          message: string
          notified_at?: string | null
          sale_id: string
        }
        Update: {
          id?: string
          is_read?: boolean | null
          message?: string
          notified_at?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_notifications_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_transaction_id: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          sale_date: string | null
          signature_url: string
          status: Database["public"]["Enums"]["sale_status"]
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          cash_transaction_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sale_date?: string | null
          signature_url: string
          status?: Database["public"]["Enums"]["sale_status"]
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          cash_transaction_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          sale_date?: string | null
          signature_url?: string
          status?: Database["public"]["Enums"]["sale_status"]
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_transaction_id_fkey"
            columns: ["cash_transaction_id"]
            isOneToOne: false
            referencedRelation: "cash_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shards: {
        Row: {
          created_at: string | null
          database_url: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          database_url: string
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          database_url?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      strains: {
        Row: {
          colors: string | null
          created_at: string | null
          description: string | null
          harvest_room_id: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          colors?: string | null
          created_at?: string | null
          description?: string | null
          harvest_room_id: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          colors?: string | null
          created_at?: string | null
          description?: string | null
          harvest_room_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strains_harvest_room_id_fkey"
            columns: ["harvest_room_id"]
            isOneToOne: false
            referencedRelation: "harvest_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          shard_id: string | null
          updated_at: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          shard_id?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          shard_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_shard_id_fkey"
            columns: ["shard_id"]
            isOneToOne: false
            referencedRelation: "shards"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_role_request: {
        Args: {
          input_profile_id: string
          input_role_id: string
          input_tenant_id: string
        }
        Returns: undefined
      }
      create_customer: {
        Args: {
          p_first_name: string
          p_last_name: string
          p_business_name: string
          p_license_number: string
          p_email: string
          p_phone: string
          p_tenant_id: string
          p_drivers_license: string
        }
        Returns: {
          address: string | null
          business_name: string
          created_at: string | null
          drivers_license_url: string
          email: string | null
          first_name: string
          id: string
          last_name: string
          license_number: string
          phone: string | null
          tenant_id: string
          updated_at: string | null
        }[]
      }
      create_reserve_request: {
        Args: { p_employee_id: string; p_items: Json }
        Returns: Json
      }
    }
    Enums: {
      bag_status:
        | "in_inventory"
        | "reserved"
        | "verified"
        | "out_for_delivery"
        | "sold"
        | "returned"
        | "returning"
        | "missing"
      sale_status: "pending" | "completed" | "cancelled"
      transaction_type: "sale" | "withdrawal" | "deposit" | "refund" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      bag_status: [
        "in_inventory",
        "reserved",
        "verified",
        "out_for_delivery",
        "sold",
        "returned",
        "returning",
        "missing",
      ],
      sale_status: ["pending", "completed", "cancelled"],
      transaction_type: ["sale", "withdrawal", "deposit", "refund", "pending"],
    },
  },
} as const
