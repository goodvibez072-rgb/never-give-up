import { db } from "../storage";
import { 
  coupons, couponRedemptions, packageBundles, invoices, invoiceItems, 
  manualAssignments, userPurchases, userSubscriptions, subscriptionPackages,
  currencyPackages, users,
  type Coupon, type InsertCoupon,
  type CouponRedemption, type InsertCouponRedemption,
  type PackageBundle, type InsertPackageBundle,
  type Invoice, type InsertInvoice,
  type InvoiceItem, type InsertInvoiceItem,
  type ManualAssignment, type InsertManualAssignment,
  type UserSubscription, type SubscriptionPackage,
  type UserPurchase
} from "@shared/schema";
import { eq, and, gte, lte, desc, sql, like } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// Coupons CRUD
export async function getCoupons() {
  return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
}

export async function getCouponById(id: string) {
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0] || null;
}

export async function getCouponByCode(code: string) {
  const result = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase())).limit(1);
  return result[0] || null;
}

export async function createCoupon(coupon: InsertCoupon) {
  const result = await db.insert(coupons).values({
    ...coupon,
    code: coupon.code.toUpperCase()
  }).returning();
  return result[0];
}

export async function updateCoupon(id: string, updates: Partial<InsertCoupon>) {
  const result = await db.update(coupons)
    .set({ ...updates, code: updates.code ? updates.code.toUpperCase() : undefined })
    .where(eq(coupons.id, id))
    .returning();
  return result[0];
}

export async function deleteCoupon(id: string) {
  await db.delete(coupons).where(eq(coupons.id, id));
}

// Coupon validation and application
export async function validateCoupon(code: string, purchaseAmount: string) {
  const coupon = await getCouponByCode(code);
  
  if (!coupon) {
    return { valid: false, error: "Invalid coupon code" };
  }

  if (coupon.isActive !== "true") {
    return { valid: false, error: "Coupon is not active" };
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return { valid: false, error: "Coupon has expired" };
  }

  if (coupon.maxUses && coupon.currentUses >= coupon.maxUses) {
    return { valid: false, error: "Coupon usage limit reached" };
  }

  if (coupon.minPurchaseAmount) {
    const minAmount = parseFloat(coupon.minPurchaseAmount);
    const amount = parseFloat(purchaseAmount);
    if (amount < minAmount) {
      return { valid: false, error: `Minimum purchase of $${minAmount} required` };
    }
  }

  let discountAmount = 0;
  if (coupon.type === "percentage") {
    const percentage = parseFloat(coupon.value);
    discountAmount = (parseFloat(purchaseAmount) * percentage) / 100;
  } else if (coupon.type === "fixed") {
    discountAmount = parseFloat(coupon.value);
  }

  return { 
    valid: true, 
    coupon, 
    discountAmount: discountAmount.toFixed(2) 
  };
}

export async function applyCoupon(couponId: string, userId: string, purchaseId: string, discountAmount: string) {
  // Increment coupon usage
  await db.update(coupons)
    .set({ currentUses: sql`${coupons.currentUses} + 1` })
    .where(eq(coupons.id, couponId));

  // Create redemption record
  const result = await db.insert(couponRedemptions).values({
    couponId,
    userId,
    purchaseId,
    discountAmount
  }).returning();

  return result[0];
}

// Package Bundles CRUD
export async function getPackageBundles() {
  return await db.select().from(packageBundles).orderBy(packageBundles.displayOrder);
}

export async function getPackageBundleById(id: string) {
  const result = await db.select().from(packageBundles).where(eq(packageBundles.id, id)).limit(1);
  return result[0] || null;
}

export async function createPackageBundle(bundle: InsertPackageBundle) {
  const result = await db.insert(packageBundles).values(bundle).returning();
  return result[0];
}

export async function updatePackageBundle(id: string, updates: Partial<InsertPackageBundle>) {
  const result = await db.update(packageBundles)
    .set(updates)
    .where(eq(packageBundles.id, id))
    .returning();
  return result[0];
}

export async function deletePackageBundle(id: string) {
  await db.delete(packageBundles).where(eq(packageBundles.id, id));
}

// Invoices CRUD
export async function getInvoices(filters?: { userId?: string; status?: string; startDate?: string; endDate?: string }) {
  let query = db.select().from(invoices);

  if (filters?.userId) {
    query = query.where(eq(invoices.userId, filters.userId)) as any;
  }
  if (filters?.status) {
    query = query.where(eq(invoices.status, filters.status)) as any;
  }
  if (filters?.startDate) {
    query = query.where(gte(invoices.createdAt, filters.startDate)) as any;
  }
  if (filters?.endDate) {
    query = query.where(lte(invoices.createdAt, filters.endDate)) as any;
  }

  return await query.orderBy(desc(invoices.createdAt));
}

export async function getInvoiceById(id: string) {
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0] || null;
}

export async function getInvoiceItems(invoiceId: string) {
  return await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
}

export async function createInvoice(invoice: InsertInvoice) {
  const result = await db.insert(invoices).values(invoice).returning();
  return result[0];
}

export async function createInvoiceItem(item: InsertInvoiceItem) {
  const result = await db.insert(invoiceItems).values(item).returning();
  return result[0];
}

export async function updateInvoice(id: string, updates: Partial<InsertInvoice>) {
  const result = await db.update(invoices)
    .set(updates)
    .where(eq(invoices.id, id))
    .returning();
  return result[0];
}

// Generate unique invoice number
export async function generateInvoiceNumber(): Promise<string> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Get the last invoice for today
  const lastInvoice = await db.select()
    .from(invoices)
    .where(like(invoices.invoiceNumber, `INV-${dateStr}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  let sequence = 1;
  if (lastInvoice.length > 0) {
    const lastNumber = lastInvoice[0].invoiceNumber.split('-')[2];
    sequence = parseInt(lastNumber) + 1;
  }

  return `INV-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

// Generate invoice as printable HTML (browser can print/save as PDF)
export async function generateInvoicePDF(invoiceId: string): Promise<string> {
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) throw new Error("Invoice not found");

  const items = await getInvoiceItems(invoiceId);
  const user = await db.select().from(users).where(eq(users.id, invoice.userId)).limit(1);

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0">${item.description}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">$${item.unitPrice}</td>
      <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right">$${item.totalPrice}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body{font-family:Arial,sans-serif;color:#1a202c;max-width:800px;margin:40px auto;padding:0 20px}
    h1{font-size:28px;font-weight:700;color:#7c3aed;margin:0}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
    .meta{font-size:14px;color:#4a5568;margin:4px 0}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#7c3aed;color:#fff;padding:10px 8px;text-align:left;font-size:13px}
    th:nth-child(2){text-align:center}th:nth-child(3),th:nth-child(4){text-align:right}
    .totals{text-align:right;margin-top:20px;font-size:14px}
    .totals div{margin:4px 0}.totals .final{font-size:18px;font-weight:700;color:#7c3aed;margin-top:8px}
    .badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;
      background:${invoice.status==='paid'?'#c6f6d5':'#fed7d7'};color:${invoice.status==='paid'?'#276749':'#9b2c2c'}}
    @media print{body{margin:0}button{display:none}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>AmourScans</h1>
      <div class="meta">INVOICE</div>
    </div>
    <div style="text-align:right">
      <div class="meta"><strong>${invoice.invoiceNumber}</strong></div>
      <div class="meta">Date: ${new Date(invoice.createdAt!).toLocaleDateString()}</div>
      <div class="meta">Status: <span class="badge">${invoice.status.toUpperCase()}</span></div>
    </div>
  </div>
  <div style="margin-bottom:30px;font-size:14px;color:#4a5568">
    <strong>Bill To:</strong><br>
    ${user[0]?.username || 'N/A'}<br>
    ${user[0]?.email || ''}
  </div>
  <table>
    <thead><tr>
      <th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <div>Subtotal: $${invoice.totalAmount}</div>
    <div>Tax: $${invoice.taxAmount}</div>
    <div>Discount: -$${invoice.discountAmount}</div>
    <div class="final">Total: $${invoice.finalAmount}</div>
  </div>
  <div style="margin-top:40px;text-align:center">
    <button onclick="window.print()" style="padding:10px 24px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
  </div>
</body>
</html>`;

  const invoicesDir = path.join(process.cwd(), 'data', 'invoices');
  if (!existsSync(invoicesDir)) {
    await mkdir(invoicesDir, { recursive: true });
  }

  const htmlPath = `data/invoices/${invoice.invoiceNumber}.html`;
  await writeFile(htmlPath, html, 'utf-8');

  await updateInvoice(invoiceId, { pdfPath: htmlPath });

  return htmlPath;
}

// Manual Assignments CRUD
export async function getManualAssignments(userId?: string) {
  if (userId) {
    return await db.select().from(manualAssignments)
      .where(eq(manualAssignments.userId, userId))
      .orderBy(desc(manualAssignments.createdAt));
  }
  return await db.select().from(manualAssignments).orderBy(desc(manualAssignments.createdAt));
}

export async function createManualAssignment(assignment: InsertManualAssignment) {
  const result = await db.insert(manualAssignments).values(assignment).returning();
  return result[0];
}

export async function revokeManualAssignment(id: string) {
  const result = await db.update(manualAssignments)
    .set({ isActive: "false" })
    .where(eq(manualAssignments.id, id))
    .returning();
  return result[0];
}

// Trial period management
export async function activateTrial(userId: string, subscriptionId: string, trialDays: number) {
  const trialStartDate = new Date().toISOString();
  const trialEndDate = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
  
  const result = await db.update(userSubscriptions)
    .set({
      trialStartDate,
      trialEndDate,
      isTrialActive: "true",
      status: "active"
    })
    .where(eq(userSubscriptions.id, subscriptionId))
    .returning();
    
  return result[0];
}

export async function expireTrials() {
  const now = new Date().toISOString();
  
  const expiredTrials = await db.update(userSubscriptions)
    .set({
      isTrialActive: "false",
      status: "expired"
    })
    .where(
      and(
        eq(userSubscriptions.isTrialActive, "true"),
        lte(userSubscriptions.trialEndDate, now)
      )
    )
    .returning();
    
  return expiredTrials;
}

// Offline purchase management
export async function flagPurchaseOffline(purchaseId: string) {
  const result = await db.update(userPurchases)
    .set({ isOffline: "true" })
    .where(eq(userPurchases.id, purchaseId))
    .returning();
  return result[0];
}

export async function getOfflinePurchases() {
  return await db.select().from(userPurchases)
    .where(eq(userPurchases.isOffline, "true"))
    .orderBy(desc(userPurchases.createdAt));
}

export async function reconcilePurchase(purchaseId: string, updates: Partial<UserPurchase>) {
  const result = await db.update(userPurchases)
    .set({ ...updates, isOffline: "false" })
    .where(eq(userPurchases.id, purchaseId))
    .returning();
  return result[0];
}

// Subscriber export to CSV
export async function exportSubscribersToCSV(filters?: { 
  status?: string; 
  packageId?: string; 
  startDate?: string; 
  endDate?: string;
}) {
  let query = db.select({
    subscription: userSubscriptions,
    user: users,
    package: subscriptionPackages
  })
  .from(userSubscriptions)
  .leftJoin(users, eq(userSubscriptions.userId, users.id))
  .leftJoin(subscriptionPackages, eq(userSubscriptions.packageId, subscriptionPackages.id));

  if (filters?.status) {
    query = query.where(eq(userSubscriptions.status, filters.status)) as any;
  }
  if (filters?.packageId) {
    query = query.where(eq(userSubscriptions.packageId, filters.packageId)) as any;
  }
  if (filters?.startDate) {
    query = query.where(gte(userSubscriptions.createdAt, filters.startDate)) as any;
  }
  if (filters?.endDate) {
    query = query.where(lte(userSubscriptions.createdAt, filters.endDate)) as any;
  }

  const data = await query;
  
  // Generate CSV
  const headers = [
    'User ID', 'Username', 'Email', 'Package Name', 'Status', 
    'Trial Active', 'Trial End Date', 'Period Start', 'Period End', 
    'Created At'
  ];
  
  const rows = data.map(row => [
    row.user?.id || '',
    row.user?.username || '',
    row.user?.email || '',
    row.package?.name || '',
    row.subscription.status,
    row.subscription.isTrialActive === "true" ? 'Yes' : 'No',
    row.subscription.trialEndDate || '',
    row.subscription.currentPeriodStart || '',
    row.subscription.currentPeriodEnd || '',
    row.subscription.createdAt || ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
  
  return csvContent;
}

// Unified package management
export async function getAllPackages() {
  const [currencyPkgs, subscriptionPkgs, bundles] = await Promise.all([
    db.select().from(currencyPackages).where(eq(currencyPackages.isActive, "true")),
    db.select().from(subscriptionPackages).where(eq(subscriptionPackages.isActive, "true")),
    db.select().from(packageBundles).where(eq(packageBundles.isActive, "true"))
  ]);

  return {
    currency: currencyPkgs,
    subscriptions: subscriptionPkgs,
    bundles: bundles
  };
}
