-- Create ingredient inventory table
CREATE TABLE public.ingredient_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  current_stock_kg NUMERIC NOT NULL DEFAULT 0,
  minimum_stock_kg NUMERIC NOT NULL DEFAULT 5,
  expiry_date DATE,
  batch_number TEXT,
  supplier TEXT,
  cost_per_kg NUMERIC,
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT positive_stock CHECK (current_stock_kg >= 0),
  CONSTRAINT positive_minimum CHECK (minimum_stock_kg >= 0)
);

-- Create inventory transactions table for history
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES public.ingredient_inventory(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'remove', 'adjust', 'order_received', 'used_in_recipe')),
  quantity_kg NUMERIC NOT NULL,
  previous_stock_kg NUMERIC NOT NULL,
  new_stock_kg NUMERIC NOT NULL,
  reason TEXT,
  recipe_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create inventory alerts table
CREATE TABLE public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES public.ingredient_inventory(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'expired', 'expiring_soon', 'out_of_stock')),
  alert_message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingredient_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ingredient_inventory
CREATE POLICY "Users can view their own inventory"
  ON public.ingredient_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory"
  ON public.ingredient_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory"
  ON public.ingredient_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory"
  ON public.ingredient_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for inventory_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.inventory_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.inventory_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for inventory_alerts
CREATE POLICY "Users can view their own alerts"
  ON public.inventory_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own alerts"
  ON public.inventory_alerts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON public.inventory_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts"
  ON public.inventory_alerts FOR DELETE
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_inventory_user_id ON public.ingredient_inventory(user_id);
CREATE INDEX idx_inventory_expiry ON public.ingredient_inventory(expiry_date);
CREATE INDEX idx_inventory_stock ON public.ingredient_inventory(current_stock_kg, minimum_stock_kg);
CREATE INDEX idx_transactions_inventory ON public.inventory_transactions(inventory_id);
CREATE INDEX idx_alerts_user_unread ON public.inventory_alerts(user_id, is_read);

-- Create trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.ingredient_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();