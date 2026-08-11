/* ------------------------------------------------------------------
   MediCare HMS — Pharmacy service
   Real data layer for the `pharmacy` table (src/services/supabase.js)
   ------------------------------------------------------------------- */

import supabase from '@/services/supabase.js';
import { ensureProfile } from '@/services/patients.js';

const PHARMACY_SELECT =
  'id, drug_name, generic_name, category, batch_no, quantity, unit, supplier, purchase_price, selling_price, reorder_level, expiry_date, status, created_by, created_at, updated_at';

export const PHARMACY_STATUS_OPTIONS = ['in_stock', 'low', 'out_of_stock', 'expired'];

function toFriendlyPharmacyError(error) {
  const message = String(error?.message ?? '');
  const code = error?.code ?? '';
  if (code === '23505' || message.toLowerCase().includes('duplicate key')) {
    return new Error('That drug already exists. Please use a different name.');
  }
  if (message.toLowerCase().includes('row-level security')) {
    return new Error('You do not have permission to manage the pharmacy.');
  }
  return error;
}

export async function fetchPharmacyPage({ search = '', page = 1, pageSize = 20, status = '' } = {}) {
  let query = supabase
    .from('pharmacy')
    .select(PHARMACY_SELECT, { count: 'exact' })
    .order('drug_name', { ascending: true });

  if (status) query = query.eq('status', status);

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `drug_name.ilike.${term},generic_name.ilike.${term},category.ilike.${term},supplier.ilike.${term}`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);

  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getPharmacyCount() {
  const { count, error } = await supabase
    .from('pharmacy')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function addPharmacyDrug(payload, user) {
  const hasProfile = await ensureProfile(user);
  const { data, error } = await supabase
    .from('pharmacy')
    .insert([{ ...payload, created_by: hasProfile ? payload.created_by : null }])
    .select(PHARMACY_SELECT)
    .single();

  if (error) throw toFriendlyPharmacyError(error);
  return data;
}

export async function updatePharmacyDrug(id, payload) {
  const { data, error } = await supabase
    .from('pharmacy')
    .update(payload)
    .eq('id', id)
    .select(PHARMACY_SELECT)
    .single();

  if (error) throw toFriendlyPharmacyError(error);
  return data;
}

export async function deletePharmacyDrug(id) {
  const { error } = await supabase.from('pharmacy').delete().eq('id', id);
  if (error) throw error;
}

// Derived stock status from quantity vs reorder_level (same logic as
// inventory). Kept local so the DB value stays manual/override-friendly.
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

// Pharmacy summary — drug totals, counts by status and stock value.
export async function getPharmacyStats() {
  const { data, error } = await supabase
    .from('pharmacy')
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
