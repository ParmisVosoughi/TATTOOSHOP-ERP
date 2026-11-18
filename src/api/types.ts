// Typed contracts shared with the Django REST backend.
export type CurrencyCode = "IRT" | "USD" | "AED" | "CNY";
export interface Category { id: string; name: string; parentId: string | null }
export interface PackUnit { name: string; factor: number; stock?: number; /** Selling price of one pack, in the variant currency */ price?: number }
export interface PricePoint { date: string; price: number }
export interface Variant {
  id: string; productId: string; sku: string; barcode: string;
  attributes: Record<string, string>;
  purchasePrice: number; sellingPrice: number; currency: CurrencyCode; baseRate: number;
  stock: number; minStock: number; locked: boolean; manualOverride: number | null;
  updatedAt: string; priceHistory: PricePoint[]; extraUnits?: PackUnit[];
}
export interface Product {
  id: string; name: string; sku: string; brand: string; categoryId: string; description: string;
  images: string[]; attributes: Record<string, string>; inventoryMode: "shared" | "independent";
  units: PackUnit[]; variants: Variant[];
}
export interface CurrencyRate { code: CurrencyCode; name: string; rate: number; previousRate: number; updatedAt: string; history: { date: string; rate: number }[] }
export interface Party { id: string; name: string; phone: string; city: string; balance: number; code?: string }
export interface PurchaseItem { variantId: string; qty: number; unitPrice: number }
export interface PurchaseInvoice {
  id: string; number: string; supplierId: string; date: string; currency: CurrencyCode; rate: number;
  items: PurchaseItem[]; paidAmount?: number; accountId?: string; clientKey?: string; code?: string; shipping: number; customs: number; commission: number; discount: number; other: number;
  total: number; status: "draft" | "received";
}
export interface SaleItem { variantId: string; unit: string; qty: number; unitPrice: number; discount: number }
export interface SalesInvoice {
  id: string; number: string; /** Auto-generated invoice identifier */ code: string; customerId: string; date: string; items: SaleItem[]; total: number;
  paymentStatus: "paid" | "partial" | "unpaid" | "refunded"; type: "sale" | "return"; paidAmount?: number; outstanding?: number; voided?: boolean; archived?: boolean; accountId?: string; clientKey?: string; returnOf?: string;
}
export interface StockMovement { id: string; date: string; variantId: string; type: "in" | "out" | "transfer" | "convert" | "return"; qty: number; unit: string; ref: string; note?: string }
export interface Expense { id: string; date: string; title: string; category: string; amount: number; account: string }
export interface Account { id: string; name: string; type: "cash" | "bank"; balance: number; /** 3-digit account code */ code?: string; createdAt?: string }
/** amount is in Rial (positive); balance on Account is in Toman (1 Toman = 10 Rial). */
export interface AccountTx { id: string; accountId: string; date: string; type: "deposit" | "withdraw"; amount: number; description: string; ref?: string; code: string; balanceAfter: number; /** when the record was created (date = transaction date) */ createdAt?: string; invoiceId?: string; seq?: number }
export interface AppUser { id: string; name: string; username: string; role: string; roleCode?: string; password?: string; permissions: string[]; active: boolean }
export interface DashboardSummary {
  totalSales: number; totalPurchases: number; estimatedProfit: number; inventoryValue: number;
  salesByMonth: { month: string; value: number }[]; topProducts: { name: string; qty: number }[];
}
export interface AccountingSummary {
  income: number; expenses: number; receivables: number; payables: number;
  pnl: { label: string; value: number }[]; inventoryValuation: { category: string; value: number }[];
}
export interface StoreSettings { storeName: string; taxRate: number; costingMethod: "wac" | "fifo" }
export interface Warehouse { id: string; name: string; isDefault: boolean }
