/* ------------------------------------------------------------------
   MediCare HMS — Inventory service
   Real data layer for the `inventory` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const INVENTORY_SELECT =
  'id, item_name, category, sku, quantity, unit, reorder_level, supplier, purchase_price, selling_price, expiry_date, location, status, created_by, created_at, updated_at';

export const INVENTORY_STATUS_OPTIONS = ['in_stock', 'low', 'out_of_stock', 'expired'];

function toFriendlyInventoryError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('SKU already exists. Please use a different one.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage inventory.');
  }
  return error;
}

export async function fetchInventoryPage({ search = '', page = 1, pageSize = 20, status = '' } = {}) {
  let query = supabase
    .from('inventory')
    .select(INVENTORY_SELECT, { count: 'exact' })
    .order('item_name', { ascending: true });

  if (status) query = query.eq('status', status);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(`item_name.ilike.${term},sku.ilike.${term},category.ilike.${term},supplier.ilike.${term}`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getInventoryCount() {
  const { count, error } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function addInventoryItem(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('inventory')
    .insert([{ ...payload, created_by: hasProfile ? payload.created_by : null }])
    .select(INVENTORY_SELECT)
    .single();

  if (error) throw toFriendlyInventoryError(error);
  return data;
}

export async function updateInventoryItem(id, payload) {
  const { data, error } = await supabase
    .from('inventory')
    .update(payload)
    .eq('id', id)
    .select(INVENTORY_SELECT)
    .single();

  if (error) throw toFriendlyInventoryError(error);
  return data;
}

export async function deleteInventoryItem(id) {
  const { error } = await supabase.from('inventory').delete().eq('id', id);
  if (error) throw error;
}

// Derived stock status from quantity vs reorder_level (kept local so the
// DB value stays manual/override-friendly). Also treats items past their
// expiry date as expired.
export function deriveStockStatus(quantity, reorderLevel, expiryDate) {
  const qty = Number(quantity || 0);
  const level = Number(reorderLevel || 0);

  if (expiryDate) {
    const exp = new Date(`${String(expiryDate).slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < today.getTime()) {
      return 'expired';
    }
  }

  if (qty <= 0) return 'out_of_stock';
  if (level > 0 && qty <= level) return 'low';
  return 'in_stock';
}

// Inventory summary — totals, counts by status and estimated stock value.
export async function getInventoryStats() {
  const { data, error } = await supabase
    .from('inventory')
    .select('quantity, reorder_level, purchase_price, selling_price, status, expiry_date');

  if (error) throw error;

  const list = data ?? [];
  const countByStatus = { in_stock: 0, low: 0, out_of_stock: 0, expired: 0 };
  list.forEach((i) => {
    const status = String(i.status || 'in_stock');
    if (status in countByStatus) countByStatus[status] += 1;
  });

  const stockValue = list.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.purchase_price || 0),
    0
  );
  const retailValue = list.reduce(
    (s, i) => s + Number(i.quantity || 0) * Number(i.selling_price || 0),
    0
  );

  return {
    total: list.length,
    stockValue,
    retailValue,
    lowCount: countByStatus.low,
    outOfStockCount: countByStatus.out_of_stock,
    expiredCount: countByStatus.expired,
  };
}
